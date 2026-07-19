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
const TOOL_PARAMETERS_DESCRIPTION = "Tool-specific JSON parameters collected by the agent.";

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

const TOOL_PARAMETER_FIELDS = {
  create_job_spec: [
    { name: "caseType", type: "string", required: true },
    { name: "urgency", type: "string", required: true },
    { name: "propertyType", type: "string", required: true },
    { name: "doorType", type: "string", required: true },
    { name: "lockType", type: "string", required: true },
    { name: "doorOpen", type: "boolean", required: true },
    { name: "keyStolen", type: "boolean", required: true },
    { name: "brokenKeyVisible", type: "boolean", required: true },
    { name: "needRekey", type: "boolean", required: true },
    { name: "newKeysNeeded", type: "number", required: true },
    { name: "idealPrice", type: "number", required: true },
    { name: "maxPrice", type: "number", required: true },
    { name: "authorizationConfirmed", type: "boolean", required: true },
    { name: "locationCity", type: "string", required: true },
    { name: "locationZip", type: "string", required: true },
  ],
  save_quote: [
    { name: "vendorName", type: "string", required: true },
    { name: "phone", type: "string", required: true },
    { name: "etaMinutes", type: "number", required: true },
    { name: "dispatchFee", type: "number", required: true },
    { name: "laborFee", type: "number", required: true },
    { name: "partsFee", type: "number", required: true },
    { name: "afterHoursFee", type: "number", required: true },
    { name: "taxesAndOther", type: "number", required: true },
    { name: "totalEstimate", type: "number", required: true },
    { name: "isTotalAllIn", type: "boolean", required: true },
    { name: "drillingPolicy", type: "string", required: true },
    { name: "idRequired", type: "boolean", required: true },
    { name: "oldKeyDisabled", type: "boolean", required: false },
    { name: "keysIncluded", type: "number", required: true },
    { name: "warranty", type: "string", required: false },
    { name: "quoteConfidence", type: "string", required: true },
    { name: "redFlags", type: "string", required: false },
    { name: "transcriptEvidence", type: "string", required: true },
    { name: "transcript", type: "string", required: true },
  ],
  analyze_voice_trust: [
    { name: "questionType", type: "string", required: true },
    { name: "vendorText", type: "string", required: true },
    { name: "pauseMs", type: "number", required: true },
    { name: "fillerWords", type: "string", required: false },
    { name: "evasivePhrases", type: "string", required: false },
    { name: "speechRateChangePct", type: "number", required: false },
    { name: "pitchVariance", type: "number", required: false },
    { name: "volumeVariance", type: "number", required: false },
  ],
  classify_vendor_tone: [
    { name: "vendorLatestMessage", type: "string", required: true },
    { name: "conversationContext", type: "string", required: true },
  ],
  update_negotiation: [
    { name: "vendorName", type: "string", required: true },
    { name: "beforePrice", type: "number", required: true },
    { name: "afterPrice", type: "number", required: true },
    { name: "termsChanged", type: "string", required: true },
    { name: "leverageUsed", type: "string", required: true },
    { name: "transcriptEvidence", type: "string", required: true },
    { name: "priceOrTermsChanged", type: "boolean", required: true },
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

function getToolParameterFields(toolName) {
  const fields = TOOL_PARAMETER_FIELDS[toolName];

  if (!fields) {
    throw new Error(`Unknown ElevenLabs tool name: ${toolName}`);
  }

  return fields;
}

function buildParametersSchema(toolName) {
  return {
    id: "parameters",
    type: "object",
    description: TOOL_PARAMETERS_DESCRIPTION,
    required: true,
    properties: getToolParameterFields(toolName).map((field) => ({
      id: field.name,
      type: field.type,
      description: buildParameterDescription(toolName, field),
      required: field.required,
    })),
  };
}

function buildParameterDescription(toolName, field) {
  const stringListHints = {
    redFlags: "Comma-separated red flags if any; leave empty or omit if none.",
    transcriptEvidence: "Comma-separated transcript evidence snippets supporting this tool call.",
    fillerWords: "Comma-separated filler words heard in the answer, if any.",
    evasivePhrases: "Comma-separated evasive phrases heard in the answer, if any.",
    leverageUsed: "Comma-separated stored quote facts used as negotiation leverage.",
  };
  const intent = field.required ? "Required" : "Optional";
  const hint = stringListHints[field.name] ?? `${toolName} parameter ${field.name}.`;

  return `${intent}. ${hint}`;
}

function buildRequestBodySchema(toolName) {
  // ElevenLabs currently renders webhook body parameters from an array of
  // property objects with stable id fields. Nested object fields must be nested
  // under that object's own properties array, such as the parameters property
  // containing { id: "caseType", ... }. This matches the working ConvAI tool
  // PATCH payload shape used in the ElevenLabs dashboard.
  return {
    id: "request_body",
    type: "object",
    description: `JSON body for the Keywize ${toolName} webhook tool.`,
    required: true,
    properties: [
      {
        id: "tool_name",
        type: "string",
        description: "Exact Keywize tool name to execute.",
        constant_value: toolName,
        required: true,
      },
      buildParametersSchema(toolName),
    ],
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
      path_params_schema: {},
      query_params_schema: [],
      request_headers: [
        {
          name: "Content-Type",
          value: "application/json",
        },
      ],
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

      assertWebhookApiSchemaMatchesPatchShape(tool.api_schema, `${name}.${tool.name}.api_schema`);
      assertNoUnsupportedSchemaKeys(schema, `${name}.${tool.name}.request_body_schema`);
      assertToolBodySchemaIsVisible(schema, tool.name, `${name}.${tool.name}.request_body_schema`);
      assertToolBodyPropertySources(schema, `${name}.${tool.name}.request_body_schema`);
    }
  }
}

function assertWebhookApiSchemaMatchesPatchShape(apiSchema, pathLabel) {
  if (!apiSchema || typeof apiSchema !== "object") {
    throw new Error(`ElevenLabs tool ${pathLabel} must be an object.`);
  }

  if (!apiSchema.path_params_schema || Object.keys(apiSchema.path_params_schema).length !== 0) {
    throw new Error(`ElevenLabs tool ${pathLabel}.path_params_schema must be an empty object.`);
  }

  if (!Array.isArray(apiSchema.query_params_schema) || apiSchema.query_params_schema.length !== 0) {
    throw new Error(`ElevenLabs tool ${pathLabel}.query_params_schema must be an empty array.`);
  }

  const contentTypeHeader = Array.isArray(apiSchema.request_headers)
    ? apiSchema.request_headers.find(
        (header) => header.name === "Content-Type" && header.value === "application/json",
      )
    : null;

  if (!contentTypeHeader) {
    throw new Error(`ElevenLabs tool ${pathLabel}.request_headers must include Content-Type application/json in an array.`);
  }

  if (apiSchema.content_type !== "application/json") {
    throw new Error(`ElevenLabs tool ${pathLabel}.content_type must be application/json.`);
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

function assertToolBodySchemaIsVisible(schema, toolName, pathLabel) {
  const properties = schema.properties;
  const propertyIds = properties?.map((property) => property.id) ?? [];

  if (schema.id !== "request_body" || schema.type !== "object" || !Array.isArray(properties)) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} must be an object with a properties array.`);
  }

  if (schema.required !== true) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} must mark the request body as required.`);
  }

  if (propertyIds.join(",") !== "tool_name,parameters") {
    throw new Error(
      `ElevenLabs tool schema at ${pathLabel} must expose exactly these body parameters in order: tool_name, parameters. Found: ${propertyIds.join(", ")}.`,
    );
  }

  const toolNameSchema = properties[0];
  const parametersSchema = properties[1];

  if (toolNameSchema.type !== "string" || toolNameSchema.required !== true) {
    throw new Error(`ElevenLabs body parameter ${pathLabel}.properties.tool_name must be a required string literal schema node.`);
  }

  if (parametersSchema.type !== "object" || parametersSchema.required !== true) {
    throw new Error(`ElevenLabs body parameter ${pathLabel}.properties.parameters must be a required object schema node.`);
  }

  if (toolNameSchema.constant_value !== toolName) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} must set tool_name.constant_value to ${toolName}.`);
  }

  assertParametersSchemaMatchesTool(parametersSchema, toolName, `${pathLabel}.properties.parameters`);
}

function assertParametersSchemaMatchesTool(parametersSchema, toolName, pathLabel) {
  const fields = getToolParameterFields(toolName);
  const properties = parametersSchema.properties;
  const propertyIds = properties?.map((property) => property.id) ?? [];
  const expectedPropertyIds = fields.map((field) => field.name);

  if (parametersSchema.description !== TOOL_PARAMETERS_DESCRIPTION) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} has an invalid parameters description.`);
  }

  if (!Array.isArray(properties)) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} must use a properties array.`);
  }

  if (propertyIds.join(",") !== expectedPropertyIds.join(",")) {
    throw new Error(
      `ElevenLabs tool schema at ${pathLabel} has wrong parameters. Found: ${propertyIds.join(", ")}.`,
    );
  }

  for (const [index, field] of fields.entries()) {
    const propertySchema = properties[index];

    if (propertySchema.type !== field.type) {
      throw new Error(`ElevenLabs tool schema at ${pathLabel}.properties.${field.name} must be type ${field.type}.`);
    }

    if (propertySchema.required !== field.required) {
      throw new Error(`ElevenLabs tool schema at ${pathLabel}.properties.${field.name} must set required to ${field.required}.`);
    }
  }
}

function assertToolBodyPropertySources(schema, pathLabel) {
  for (const propertySchema of schema.properties) {
    assertSchemaNodeSources(propertySchema, `${pathLabel}.properties.${propertySchema.id}`);
  }
}

function assertSchemaNodeSources(schemaNode, pathLabel) {
  if (schemaNode?.type === "object") {
    if (!Array.isArray(schemaNode.properties)) {
      throw new Error(`ElevenLabs object schema at ${pathLabel} must contain a properties array.`);
    }

    for (const propertySchema of schemaNode.properties) {
      assertSchemaNodeSources(propertySchema, `${pathLabel}.properties.${propertySchema.id}`);
    }

    return;
  }

  const nonDescriptionSourceKeys = [
    "dynamic_variable",
    "is_system_provided",
    "constant_value",
    "is_omitted",
  ].filter((key) => Object.hasOwn(schemaNode, key));

  if (nonDescriptionSourceKeys.length > 1) {
    throw new Error(
      `ElevenLabs literal schema property ${pathLabel} must set at most one non-description value source; found ${nonDescriptionSourceKeys.length}.`,
    );
  }

  if (nonDescriptionSourceKeys.length === 0 && !Object.hasOwn(schemaNode, "description")) {
    throw new Error(
      `ElevenLabs literal schema property ${pathLabel} must set a description or one fixed/system value source.`,
    );
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
            const bodyProperties = tool.api_schema.request_body_schema.properties;
            const parametersProperty = bodyProperties.find((property) => property.id === "parameters");
            const bodyParameterNames = bodyProperties.map((property) => property.id).join(", ");
            const nestedParameterNames = parametersProperty.properties.map((property) => property.id).join(", ");
            return `${tool.name} [body: ${bodyParameterNames}; parameters.properties: ${nestedParameterNames}]`;
          })
          .join(", ");
        return `${name}: ${toolDetails}`;
      })
      .join("\n");

    console.log(`Dry run validated ${payloads.length} ElevenLabs agent payloads.`);
    console.log("Webhook URL was derived from NEXT_PUBLIC_APP_URL.");
    console.log("Voice mode sanity check passed: conversation_config.conversation.text_only is false for every agent.");
    console.log(`TTS model: ${voiceModeConfig.tts.model_id}. Voice ID: ${voiceModeConfig.tts.voice_id ? "configured" : "ElevenLabs default"}.`);
    console.log("Tool schema sanity check passed: every webhook request_body_schema uses properties arrays with id fields for tool_name, parameters, and nested tool-specific fields.");
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
