#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ELEVENLABS_CONVAI_AGENTS_BASE_URL = "https://api.elevenlabs.io/v1/convai/agents";
// ElevenLabs currently creates Conversational AI agents by POSTing to the
// dedicated create endpoint, not the list endpoint. A 405 here usually means
// this path drifted back to /v1/convai/agents or the API shape changed.
const ELEVENLABS_AGENT_CREATE_URL = `${ELEVENLABS_CONVAI_AGENTS_BASE_URL}/create`;
const ENV_FILE_PATH = path.resolve(process.cwd(), process.env.KEYWIZE_ENV_FILE_PATH ?? ".env.local");
const TOOL_ENDPOINT_PATH = "/api/elevenlabs/tools";
const DEFAULT_ELEVENLABS_TTS_MODEL_ID = "eleven_turbo_v2";

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

const TOOL_PAYLOAD_FIELDS = {
  create_job_spec: [
    "caseType",
    "urgency",
    "propertyType",
    "doorType",
    "lockType",
    "doorOpen",
    "keyStolen",
    "brokenKeyVisible",
    "needRekey",
    "newKeysNeeded",
    "idealPrice",
    "maxPrice",
    "authorizationConfirmed",
    "locationCity",
    "locationZip",
  ],
  save_quote: [
    "vendorName",
    "phone",
    "etaMinutes",
    "dispatchFee",
    "laborFee",
    "partsFee",
    "afterHoursFee",
    "taxesAndOther",
    "totalEstimate",
    "isTotalAllIn",
    "drillingPolicy",
    "idRequired",
    "oldKeyDisabled",
    "keysIncluded",
    "warranty",
    "quoteConfidence",
    "redFlags",
    "transcriptEvidence",
    "transcript",
  ],
  analyze_voice_trust: [
    "questionType",
    "vendorText",
    "pauseMs",
    "fillerWords",
    "evasivePhrases",
    "speechRateChangePct",
    "pitchVariance",
    "volumeVariance",
  ],
  classify_vendor_tone: ["vendorLatestMessage", "conversationContext"],
  update_negotiation: [
    "vendorName",
    "beforePrice",
    "afterPrice",
    "termsChanged",
    "leverageUsed",
    "transcriptEvidence",
    "priceOrTermsChanged",
  ],
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

function buildPayloadDescription(toolName) {
  const fields = TOOL_PAYLOAD_FIELDS[toolName];

  if (!fields) {
    return "Send a JSON string containing the full structured payload for this Keywize tool.";
  }

  return [
    "Send a JSON string containing one object with the full structured payload for this Keywize tool.",
    `The JSON string must include these fields when available: ${fields.join(", ")}.`,
    "Use null for unknown optional values instead of omitting relevant fields.",
  ].join(" ");
}

function buildRequestBodySchema(toolName) {
  // ElevenLabs renders webhook body parameters from:
  // tool.api_schema.request_body_schema.properties.
  // This shape is ElevenLabs's parameter-object schema, not arbitrary JSON
  // Schema. Keep direct body parameters as literal schema nodes. Each literal
  // node needs exactly one value source: description for LLM-filled values,
  // constant_value for fixed values, dynamic_variable, is_system_provided, or
  // is_omitted. If ElevenLabs changes this API, update this builder and the
  // validator below before running real agent creation.
  return {
    type: "object",
    description: "JSON body sent by the ElevenLabs webhook tool to Keywize.",
    properties: {
      tool: {
        type: "string",
        constant_value: toolName,
      },
      payload: {
        type: "string",
        description: buildPayloadDescription(toolName),
      },
    },
    required: ["tool", "payload"],
  };
}

function buildWebhookToolConfig(toolName, webhookUrl) {
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
      content_type: "application/json",
      request_body_schema: buildRequestBodySchema(toolName),
    },
  };
}

function validateElevenLabsVoiceMode(payloads) {
  for (const { name, payload } of payloads) {
    const textOnly = payload.conversation_config?.conversation?.text_only;

    if (textOnly !== false) {
      throw new Error(
        `${name} must explicitly set conversation_config.conversation.text_only to false for voice mode.`,
      );
    }
  }
}

function validateElevenLabsToolSchema(payloads) {
  for (const { name, payload } of payloads) {
    const tools = payload.conversation_config?.agent?.prompt?.tools ?? [];

    for (const tool of tools) {
      const schema = tool.api_schema?.request_body_schema;

      if (!schema) {
        throw new Error(`${name} tool ${tool.name} is missing request_body_schema.`);
      }

      assertNoUnsupportedSchemaKeys(schema, `${name}.${tool.name}.request_body_schema`);
      assertToolBodySchemaIsVisible(schema, `${name}.${tool.name}.request_body_schema`);
      assertToolBodyPropertySources(schema, `${name}.${tool.name}.request_body_schema`);
    }
  }
}

function assertNoUnsupportedSchemaKeys(value, pathLabel) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    if (key === "const" || key === "additionalProperties") {
      throw new Error(`ElevenLabs tool schema at ${pathLabel} uses unsupported key ${key}.`);
    }

    assertNoUnsupportedSchemaKeys(childValue, `${pathLabel}.${key}`);
  }
}

function assertToolBodySchemaIsVisible(schema, pathLabel) {
  const propertyNames = Object.keys(schema.properties ?? {});

  if (schema.type !== "object" || !schema.properties || typeof schema.properties !== "object") {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} must be an object with properties.`);
  }

  if (propertyNames.join(",") !== "tool,payload") {
    throw new Error(
      `ElevenLabs tool schema at ${pathLabel} must expose exactly these body parameters in order: tool, payload. Found: ${propertyNames.join(", ")}.`,
    );
  }

  for (const propertyName of propertyNames) {
    const propertySchema = schema.properties[propertyName];

    if (!propertySchema || propertySchema.type !== "string") {
      throw new Error(`ElevenLabs body parameter ${pathLabel}.properties.${propertyName} must be a string literal schema node.`);
    }
  }

  const missingRequired = ["tool", "payload"].filter((propertyName) => !schema.required?.includes(propertyName));

  if (missingRequired.length > 0) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} is missing required body parameter(s): ${missingRequired.join(", ")}.`);
  }
}

function assertToolBodyPropertySources(schema, pathLabel) {
  for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
    const sourceKeys = [
      "description",
      "dynamic_variable",
      "is_system_provided",
      "constant_value",
      "is_omitted",
    ].filter((key) => Object.hasOwn(propertySchema, key));

    if (sourceKeys.length !== 1) {
      throw new Error(
        `ElevenLabs tool schema property ${pathLabel}.properties.${propertyName} must set exactly one value source; found ${sourceKeys.length}.`,
      );
    }
  }
}

function buildVoiceModeConfig(env) {
  // Schema assumption: ElevenLabs Conversational AI create accepts
  // conversation_config.conversation.text_only for Chat/Text-only mode and
  // conversation_config.tts for text-to-speech output. Keep these fields
  // isolated here so schema drift is easy to update without touching tool
  // payload behavior.
  const ttsConfig = {
    model_id: env.get("ELEVENLABS_TTS_MODEL_ID") || DEFAULT_ELEVENLABS_TTS_MODEL_ID,
  };
  const voiceId = env.get("ELEVENLABS_VOICE_ID");
  const outputFormat = env.get("ELEVENLABS_AGENT_OUTPUT_AUDIO_FORMAT");

  if (voiceId) {
    ttsConfig.voice_id = voiceId;
  }

  if (outputFormat) {
    ttsConfig.agent_output_audio_format = outputFormat;
  }

  return {
    conversation: {
      text_only: false,
    },
    tts: ttsConfig,
  };
}

function buildAgentPayload({ name, prompt, tools }, webhookUrl, voiceModeConfig) {
  // Schema assumption: this is the current Conversational AI agent create shape.
  // Keep this isolated so updates are local if ElevenLabs changes field names.
  return {
    name,
    conversation_config: {
      ...voiceModeConfig,
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
  const response = await fetch(ELEVENLABS_AGENT_CREATE_URL, {
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
    const endpointHint =
      response.status === 405
        ? " Check that ELEVENLABS_AGENT_CREATE_URL still points at the documented POST /v1/convai/agents/create endpoint and update the payload schema if ElevenLabs changed it."
        : "";
    throw new Error(
      `ElevenLabs agent creation failed with ${response.status} at POST ${ELEVENLABS_AGENT_CREATE_URL}: ${summarizeApiError(body, responseText)}${endpointHint}`,
    );
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
  const voiceModeConfig = buildVoiceModeConfig(env);

  const agentInputs = await Promise.all(
    AGENT_DEFINITIONS.map(async (definition) => ({
      ...definition,
      prompt: await readPrompt(definition.promptPath),
    })),
  );

  const payloads = agentInputs.map((agentInput) => ({
    envKey: agentInput.envKey,
    name: agentInput.name,
    payload: buildAgentPayload(agentInput, webhookUrl, voiceModeConfig),
  }));

  validateElevenLabsVoiceMode(payloads);
  validateElevenLabsToolSchema(payloads);

  if (dryRun) {
    const toolSummary = payloads
      .map(({ name, payload }) => {
        const toolDetails = payload.conversation_config.agent.prompt.tools
          .map((tool) => {
            const bodyParameterNames = Object.keys(tool.api_schema.request_body_schema.properties).join(", ");
            return `${tool.name} [body: ${bodyParameterNames}]`;
          })
          .join(", ");
        return `${name}: ${toolDetails}`;
      })
      .join("\n");

    console.log(`Dry run validated ${payloads.length} ElevenLabs agent payloads.`);
    console.log("Webhook URL was derived from NEXT_PUBLIC_APP_URL.");
    console.log("Voice mode sanity check passed: conversation_config.conversation.text_only is false for every agent.");
    console.log(`TTS model: ${voiceModeConfig.tts.model_id}. Voice ID: ${voiceModeConfig.tts.voice_id ? "configured" : "ElevenLabs default"}.`);
    console.log("Tool schema sanity check passed: every webhook request_body_schema exposes visible body parameters named tool and payload.");
    console.log(`Tool split:\n${toolSummary}`);
    console.log("No agents were created and the env file was not updated.");
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
