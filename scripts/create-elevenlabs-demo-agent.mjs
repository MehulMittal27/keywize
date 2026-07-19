#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ELEVENLABS_AGENT_CREATE_URL = "https://api.elevenlabs.io/v1/convai/agents/create";
const ENV_FILE_PATH = path.resolve(process.cwd(), process.env.KEYWIZE_ENV_FILE_PATH ?? ".env.local");
const PROMPT_PATH = path.resolve(process.cwd(), "voice/prompts/elevenlabs-only-demo-agent.md");
const FIXTURE_PATH = path.resolve(process.cwd(), "voice/demo/elevenlabs-only-demo-fixture.json");
const FIXTURE_PLACEHOLDER = "{{KEYWIZE_DEMO_FIXTURE_JSON}}";
const DEMO_AGENT_ENV_KEY = "ELEVENLABS_DEMO_AGENT_ID";
const DEFAULT_TTS_MODEL_ID = "eleven_turbo_v2";
const FIRST_MESSAGE =
  "Welcome to the Keywize ElevenLabs-only judge simulation. This uses scripted vendor records, and no locksmith or phone number will be called. What happened with your lock?";

const PLATFORM_GUARDRAILS = {
  version: "1",
  focus: { is_enabled: true },
  prompt_injection: { is_enabled: true },
  custom: {
    config: {
      configs: [
        {
          is_enabled: true,
          name: "Always disclose the simulation",
          prompt:
            "Block any response that claims or implies Keywize called, connected to, heard from, booked, or dispatched a real locksmith. Vendor content must be described as a scripted fixture or replay inside an ElevenLabs-only simulation.",
          execution_mode: "blocking",
          model: "gemini-2.5-flash-lite",
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback:
              "Clearly label vendor content as a scripted simulation. Do not claim real outreach, a live quote, booking, or dispatch.",
          },
        },
        {
          is_enabled: true,
          name: "Use only immutable demo evidence",
          prompt:
            "Block invented or changed quote facts, ETAs, safety terms, transcript evidence, rankings, negotiation outcomes, user authorization, or leverage. The prompt's immutable demo fixture is allowed evidence. Only its stored Vendor B $130 all-in record may be used as leverage against Vendor C.",
          execution_mode: "blocking",
          model: "gemini-2.5-flash-lite",
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback:
              "Use the immutable fixture exactly. Use only the stored Vendor B $130 all-in fixture as simulated leverage.",
          },
        },
        {
          is_enabled: true,
          name: "No unsafe access instructions",
          prompt:
            "Block instructions for bypassing, picking, drilling, damaging, disabling, or defeating locks or access-control systems. Allow only authorized service intake, vendor policy summaries, and proof reminders.",
          execution_mode: "blocking",
          model: "gemini-2.5-flash-lite",
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback:
              "Do not provide access or lock-bypass instructions. Stay focused on authorized locksmith service and safety.",
          },
        },
      ],
    },
  },
};

function parseArguments(argv) {
  const allowed = new Set(["--dry-run", "--apply", "--create-new"]);
  const unknown = argv.filter((argument) => !allowed.has(argument));

  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  }

  const apply = argv.includes("--apply");
  const explicitDryRun = argv.includes("--dry-run");
  const createNew = argv.includes("--create-new");

  if (apply && explicitDryRun) {
    throw new Error("Choose either --dry-run or --apply, not both.");
  }

  if (createNew && !apply) {
    throw new Error("--create-new is valid only with --apply.");
  }

  return { apply, createNew };
}

function parseDotEnv(contents) {
  const env = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    env.set(key, stripDotEnvValue(rawValue));
  }

  return env;
}

function stripDotEnvValue(rawValue) {
  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, "").trim();
  }

  return value;
}

async function readEnvForApply() {
  let contents;

  try {
    contents = await readFile(ENV_FILE_PATH, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Missing .env.local. Copy .env.example and set ELEVENLABS_API_KEY before using --apply.");
    }
    throw error;
  }

  const env = parseDotEnv(contents);
  if (!env.get("ELEVENLABS_API_KEY")) {
    throw new Error("Missing ELEVENLABS_API_KEY in .env.local.");
  }

  return { contents, env };
}

async function loadDemoConfig() {
  const [promptTemplate, fixtureText] = await Promise.all([
    readFile(PROMPT_PATH, "utf8"),
    readFile(FIXTURE_PATH, "utf8"),
  ]);
  const fixture = JSON.parse(fixtureText);

  validateFixture(fixture);

  const placeholderCount = promptTemplate.split(FIXTURE_PLACEHOLDER).length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Demo prompt must contain ${FIXTURE_PLACEHOLDER} exactly once.`);
  }

  const prompt = promptTemplate.replace(FIXTURE_PLACEHOLDER, JSON.stringify(fixture, null, 2));
  validatePrompt(prompt);

  return { prompt, fixture };
}

function validateFixture(fixture) {
  if (fixture?.mode !== "elevenlabs_only_simulation") {
    throw new Error("Demo fixture must declare elevenlabs_only_simulation mode.");
  }

  const vendors = new Map(
    Array.isArray(fixture.vendors) ? fixture.vendors.map((vendor) => [vendor.vendor, vendor]) : [],
  );
  const vendorA = vendors.get("Vendor A");
  const vendorB = vendors.get("Vendor B");
  const vendorC = vendors.get("Vendor C");

  assertFixture(vendorA?.initialPrice === 39, "Vendor A must start at $39.");
  assertFixture(vendorA?.priceLabel === "starts at", "Vendor A must use starts-at pricing.");
  assertFixture(vendorA?.allInTotal === null, "Vendor A must refuse a firm all-in total.");
  assertFixture(vendorA?.isTotalAllIn === false, "Vendor A cannot be marked all-in.");
  assertFixture(vendorA?.risk === "High", "Vendor A must be high risk.");
  assertFixture(
    vendorA?.drillingPolicy?.toLowerCase().includes("technician decides"),
    "Vendor A must have a vague technician-decides drilling policy.",
  );

  assertFixture(vendorB?.allInTotal === 130, "Vendor B must be $130 all-in.");
  assertFixture(vendorB?.isTotalAllIn === true, "Vendor B must be marked all-in.");
  assertFixture(vendorB?.etaMinutes === 30, "Vendor B must have a 30-minute ETA.");
  assertFixture(vendorB?.idRequired === true, "Vendor B must require ID or authorization proof.");
  assertFixture(
    vendorB?.drillingPolicy?.toLowerCase().includes("non-destructive entry first"),
    "Vendor B must use non-destructive entry first.",
  );

  assertFixture(vendorC?.allInTotal === 165, "Vendor C must begin at $165 all-in.");
  assertFixture(vendorC?.isTotalAllIn === true, "Vendor C must be marked all-in.");
  assertFixture(vendorC?.etaMinutes === 15, "Vendor C must have a 15-minute ETA.");

  const negotiation = fixture.negotiation;
  assertFixture(negotiation?.targetVendor === "Vendor C", "The negotiation target must be Vendor C.");
  assertFixture(negotiation?.beforePrice === 165, "Vendor C negotiation must begin at $165.");
  assertFixture(negotiation?.afterPrice === 145, "Vendor C negotiation must end at $145.");
  assertFixture(negotiation?.etaMinutes === 15, "Vendor C must retain its 15-minute ETA.");
  assertFixture(
    negotiation?.onlyPermittedLeverage?.vendor === "Vendor B" &&
      negotiation?.onlyPermittedLeverage?.allInTotal === 130 &&
      negotiation?.onlyPermittedLeverage?.isTotalAllIn === true,
    "The only negotiation leverage must be Vendor B's stored $130 all-in quote.",
  );

  const ranking = fixture.finalRanking;
  assertFixture(
    Array.isArray(ranking) &&
      ranking.length === 3 &&
      ranking[0]?.vendor === "Vendor C" &&
      ranking[1]?.vendor === "Vendor B" &&
      ranking[2]?.vendor === "Vendor A",
    "Final ranking must be Vendor C, Vendor B, then Vendor A.",
  );
}

function assertFixture(condition, message) {
  if (!condition) throw new Error(message);
}

function validatePrompt(prompt) {
  const requiredPhrases = [
    "no locksmith or phone number will be called",
    "Ask exactly one question per turn during intake",
    "Replay Vendor A.",
    "Replay Vendor B.",
    "Replay Vendor C.",
    "Run the simulated negotiation.",
    "Give me the final recommendation.",
    "No locksmith was called or dispatched.",
  ];

  const missingPhrases = requiredPhrases.filter((phrase) => !prompt.includes(phrase));
  if (missingPhrases.length > 0) {
    throw new Error(`Demo prompt is missing required behavior: ${missingPhrases.join(", ")}`);
  }
}

function buildTtsConfig(env = new Map()) {
  const tts = {
    model_id: env.get("ELEVENLABS_TTS_MODEL_ID") || DEFAULT_TTS_MODEL_ID,
  };
  const voiceId = env.get("ELEVENLABS_VOICE_ID");
  const outputFormat = env.get("ELEVENLABS_AGENT_OUTPUT_AUDIO_FORMAT");

  if (voiceId) tts.voice_id = voiceId;
  if (outputFormat) tts.agent_output_audio_format = outputFormat;
  return tts;
}

function buildAgentPayload(prompt, env) {
  return {
    name: "Keywize ElevenLabs-Only Judge Demo",
    platform_settings: {
      guardrails: PLATFORM_GUARDRAILS,
    },
    conversation_config: {
      conversation: {
        text_only: false,
      },
      tts: buildTtsConfig(env),
      agent: {
        first_message: FIRST_MESSAGE,
        prompt: {
          prompt,
          temperature: 0.2,
          enable_reasoning_summary: false,
          ignore_default_personality: true,
          tools: [],
        },
      },
    },
  };
}

function validatePayload(payload) {
  if (payload.conversation_config?.conversation?.text_only !== false) {
    throw new Error("Demo agent must explicitly enable voice mode.");
  }

  const tools = payload.conversation_config?.agent?.prompt?.tools;
  if (!Array.isArray(tools) || tools.length !== 0) {
    throw new Error("Demo agent must not configure tools, webhooks, transfers, or telephony.");
  }

  if (Object.hasOwn(payload, "workflow")) {
    throw new Error("Do not emit an unverified ElevenLabs workflow API shape.");
  }

  const guardrails = payload.platform_settings?.guardrails;
  if (guardrails?.focus?.is_enabled !== true || guardrails?.prompt_injection?.is_enabled !== true) {
    throw new Error("Demo agent must enable focus and prompt-injection guardrails.");
  }
}

async function createDemoAgent(apiKey, payload) {
  const response = await fetch(ELEVENLABS_AGENT_CREATE_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  const body = responseText ? safeParseJson(responseText) : null;

  if (!response.ok) {
    throw new Error(`ElevenLabs demo agent creation failed with status ${response.status}. No local IDs were changed.`);
  }

  const agentId = extractAgentId(body);
  if (!agentId) {
    throw new Error("ElevenLabs created the demo agent but returned no recognized agent ID. The local env file was not changed.");
  }

  return agentId;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractAgentId(body) {
  const candidates = [
    body?.agent_id,
    body?.id,
    body?.agent?.agent_id,
    body?.agent?.id,
    body?.data?.agent_id,
    body?.data?.id,
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function updateEnvContents(contents, key, value) {
  const linePattern = new RegExp(`^(?:export\\s+)?${key}=.*$`, "m");
  const nextLine = `${key}=${value}`;

  if (linePattern.test(contents)) {
    return contents.replace(linePattern, nextLine);
  }

  return `${contents.replace(/\s*$/, "\n")}${nextLine}\n`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { prompt, fixture } = await loadDemoConfig();

  if (!options.apply) {
    const payload = buildAgentPayload(prompt, new Map());
    validatePayload(payload);
    console.log("Dry run validated the dedicated ElevenLabs-only judge demo agent.");
    console.log(`Fixture validated: ${fixture.vendors.length} scripted vendor records and one stored-quote negotiation.`);
    console.log("Safety validated: no tools, webhooks, transfers, subagents, workflow payload, or telephony are configured.");
    console.log("No environment file was read, no API request was made, and no agent was created or updated.");
    return;
  }

  const { contents, env } = await readEnvForApply();
  if (env.get(DEMO_AGENT_ENV_KEY) && !options.createNew) {
    throw new Error(
      `${DEMO_AGENT_ENV_KEY} is already configured. This create-only script will not patch it. Use the existing agent or pass --apply --create-new to create a deliberate replacement.`,
    );
  }

  const payload = buildAgentPayload(prompt, env);
  validatePayload(payload);

  console.log("Creating a new dedicated ElevenLabs-only judge demo agent. No telephony will be configured.");
  const agentId = await createDemoAgent(env.get("ELEVENLABS_API_KEY"), payload);
  const updatedContents = updateEnvContents(contents, DEMO_AGENT_ENV_KEY, agentId);
  await writeFile(ENV_FILE_PATH, updatedContents, { encoding: "utf8", mode: 0o600 });
  console.log(`Created the demo agent and saved ${DEMO_AGENT_ENV_KEY} locally. The agent ID was not printed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo agent setup failed.");
  process.exitCode = 1;
});
