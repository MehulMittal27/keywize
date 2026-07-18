#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/convai/agents";
const ENV_FILE_PATH = path.resolve(process.cwd(), ".env.local");
const TOOL_ENDPOINT_PATH = "/api/elevenlabs/tools";

const AGENT_DEFINITIONS = [
  {
    name: "Keywize Intake Agent",
    promptPath: "voice/prompts/intake-agent.md",
    envKey: "ELEVENLABS_INTAKE_AGENT_ID",
    tools: ["create_job_spec"],
  },
  {
    name: "Keywize Caller Agent",
    promptPath: "voice/prompts/caller-agent.md",
    envKey: "ELEVENLABS_CALLER_AGENT_ID",
    tools: ["save_quote", "analyze_voice_trust", "classify_vendor_tone"],
  },
  {
    name: "Keywize Closer Agent",
    promptPath: "voice/prompts/closer-agent.md",
    envKey: "ELEVENLABS_CLOSER_AGENT_ID",
    tools: ["update_negotiation"],
  },
];

const TOOL_DESCRIPTIONS = {
  create_job_spec:
    "Create the structured lockout job spec after authorization confirmation and proof-of-residence reminder.",
  save_quote: "Save a structured locksmith quote and transcript evidence.",
  analyze_voice_trust:
    "Record VoiceTrust uncertainty signals for a vendor answer. Treat signals as uncertainty, not lie detection.",
  classify_vendor_tone: "Classify the vendor tone for ranking context.",
  update_negotiation: "Track negotiated price or terms using only stored competing quotes as leverage.",
};

function parseDotEnv(contents) {
  const env = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

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

async function readLocalEnv() {
  let contents;

  try {
    contents = await readFile(ENV_FILE_PATH, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Missing .env.local. Create it from .env.example and set ELEVENLABS_API_KEY and NEXT_PUBLIC_APP_URL.");
    }

    throw error;
  }

  const env = parseDotEnv(contents);
  const missingKeys = ["ELEVENLABS_API_KEY", "NEXT_PUBLIC_APP_URL"].filter((key) => !env.get(key));

  if (missingKeys.length > 0) {
    throw new Error(`Missing required .env.local value(s): ${missingKeys.join(", ")}`);
  }

  return { contents, env };
}

async function readPrompt(promptPath) {
  return readFile(path.resolve(process.cwd(), promptPath), "utf8");
}

function buildWebhookUrl(appUrl) {
  return new URL(TOOL_ENDPOINT_PATH, ensureTrailingSlash(appUrl)).toString();
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function buildWebhookToolConfig(toolName, webhookUrl) {
  // Schema assumption: ElevenLabs Conversational AI accepts webhook tools in
  // conversation_config.agent.prompt.tools with an api_schema object.
  return {
    type: "webhook",
    name: toolName,
    description: TOOL_DESCRIPTIONS[toolName] ?? `Call the Keywize ${toolName} tool.`,
    api_schema: {
      url: webhookUrl,
      method: "POST",
      request_headers: {
        "Content-Type": "application/json",
      },
      request_body_schema: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            const: toolName,
          },
          parameters: {
            type: "object",
            description: "Tool-specific JSON parameters collected by the agent.",
            additionalProperties: true,
          },
        },
        required: ["tool_name", "parameters"],
        additionalProperties: true,
      },
    },
  };
}

function buildAgentPayload({ name, prompt, tools }, webhookUrl) {
  // Schema assumption: this is the current Conversational AI agent create shape.
  // Keep this isolated so updates are local if ElevenLabs changes field names.
  return {
    name,
    conversation_config: {
      agent: {
        prompt: {
          prompt,
          tools: tools.map((toolName) => buildWebhookToolConfig(toolName, webhookUrl)),
        },
        first_message: "Thanks for calling Keywize. I can help with your lockout.",
      },
    },
  };
}

async function createElevenLabsAgent({ apiKey, payload }) {
  const response = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  const body = responseText ? safeParseJson(responseText) : {};

  if (!response.ok) {
    throw new Error(`ElevenLabs agent creation failed with ${response.status}: ${summarizeApiError(body, responseText)}`);
  }

  return body;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function summarizeApiError(body, fallbackText) {
  if (body?.detail) {
    return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
  }

  if (body?.message) {
    return body.message;
  }

  return fallbackText || "No response body.";
}

function extractAgentId(responseBody) {
  // Schema assumption: common responses expose agent_id or id at the root.
  // Nested fallbacks make the script resilient to minor response wrappers.
  const candidates = [
    responseBody?.agent_id,
    responseBody?.id,
    responseBody?.agent?.agent_id,
    responseBody?.agent?.id,
    responseBody?.data?.agent_id,
    responseBody?.data?.id,
  ];

  return candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function updateEnvContents(contents, updates) {
  let nextContents = contents;

  for (const [key, value] of Object.entries(updates)) {
    const linePattern = new RegExp(`^(?:export\\s+)?${escapeRegExp(key)}=.*$`, "m");
    const nextLine = `${key}=${value}`;

    if (linePattern.test(nextContents)) {
      nextContents = nextContents.replace(linePattern, nextLine);
    } else {
      nextContents = `${nextContents.replace(/\s*$/, "\n")}${nextLine}\n`;
    }
  }

  return nextContents;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function saveAgentIdsToEnv(contents, agentIdsByEnvKey) {
  const updatedContents = updateEnvContents(contents, agentIdsByEnvKey);
  await writeFile(ENV_FILE_PATH, updatedContents, "utf8");
}

function isDryRun() {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = isDryRun();
  const { contents: envContents, env } = await readLocalEnv();
  const apiKey = env.get("ELEVENLABS_API_KEY");
  const appUrl = env.get("NEXT_PUBLIC_APP_URL");
  const webhookUrl = buildWebhookUrl(appUrl);

  const agentInputs = await Promise.all(
    AGENT_DEFINITIONS.map(async (definition) => ({
      ...definition,
      prompt: await readPrompt(definition.promptPath),
    })),
  );

  const payloads = agentInputs.map((agentInput) => ({
    envKey: agentInput.envKey,
    name: agentInput.name,
    payload: buildAgentPayload(agentInput, webhookUrl),
  }));

  if (dryRun) {
    console.log(`Dry run validated ${payloads.length} ElevenLabs agent payloads.`);
    console.log("Webhook URL was derived from NEXT_PUBLIC_APP_URL.");
    console.log("No agents were created and .env.local was not updated.");
    return;
  }

  const createdAgentIds = {};

  for (const { envKey, name, payload } of payloads) {
    console.log(`Creating ${name}...`);
    const responseBody = await createElevenLabsAgent({ apiKey, payload });
    const agentId = extractAgentId(responseBody);

    if (!agentId) {
      throw new Error(`ElevenLabs response for ${name} did not include an agent ID.`);
    }

    createdAgentIds[envKey] = agentId;
    console.log(`Created ${name}; ${envKey} will be saved.`);
  }

  await saveAgentIdsToEnv(envContents, createdAgentIds);
  console.log("Saved ElevenLabs agent IDs to .env.local.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
