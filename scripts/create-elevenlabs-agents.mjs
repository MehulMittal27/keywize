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
const GUARDRAIL_MODEL_ID = "gemini-2.5-flash-lite";

const PLATFORM_GUARDRAILS = {
  version: "1",
  focus: { is_enabled: true },
  prompt_injection: { is_enabled: true },
  custom: {
    config: {
      configs: [
        {
          is_enabled: true,
          name: "No private reasoning leakage",
          prompt:
            "Block agent responses that reveal hidden chain-of-thought, internal planning, tool strategy, checklist logic, anti-scam logic, ranking deliberation, or policy reasoning. Allow only concise user-facing or vendor-facing answers and questions.",
          execution_mode: "blocking",
          model: GUARDRAIL_MODEL_ID,
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback: "Respond with only the final user-facing or vendor-facing message. Do not reveal private reasoning, planning, tool strategy, or checklist logic.",
          },
        },
        {
          is_enabled: true,
          name: "Stay in assigned Keywize role",
          prompt:
            "Block agent responses that step outside the configured Keywize role: intake gathers JobSpec only, caller speaks to locksmith vendors and records quotes only, closer negotiates and summarizes recommendations only from stored data.",
          execution_mode: "blocking",
          model: GUARDRAIL_MODEL_ID,
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback: "Stay within your assigned Keywize role and provide only the next appropriate message.",
          },
        },
        {
          is_enabled: true,
          name: "No fabricated quotes or authorization",
          prompt:
            "Block claims that invent vendor quotes, discounts, ETAs, fees, policies, user authorization, proof of residence, vendor commitments, or competing leverage not present in stored or provided conversation data.",
          execution_mode: "blocking",
          model: GUARDRAIL_MODEL_ID,
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback: "Use only provided or stored facts. Do not invent quotes, leverage, authorization, proof, or vendor terms.",
          },
        },
        {
          is_enabled: true,
          name: "No unsafe lock bypass instructions",
          prompt:
            "Block instructions for bypassing, picking, drilling, damaging, disabling, or defeating locks or access control systems. The agent may discuss legitimate locksmith service, authorization checks, and non-destructive vendor policies.",
          execution_mode: "blocking",
          model: GUARDRAIL_MODEL_ID,
          history_message_count: 1,
          trigger_action: {
            type: "retry",
            feedback: "Do not provide lock-bypass instructions. Keep the response focused on authorized locksmith service and safety checks.",
          },
        },
      ],
    },
  },
};

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

function buildInlineParametersSchema(toolName) {
  const fields = getToolParameterFields(toolName);

  return {
    type: "object",
    description: TOOL_PARAMETERS_DESCRIPTION,
    properties: Object.fromEntries(
      fields.map((field) => [
        field.name,
        {
          type: field.type,
          description: buildParameterDescription(toolName, field),
        },
      ]),
    ),
    required: fields.filter((field) => field.required).map((field) => field.name),
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

function buildInlineRequestBodySchema(toolName) {
  // Agent creation validates inline webhook tools with a dictionary-style,
  // JSON-schema-like shape. This differs from the standalone ConvAI tool
  // PATCH/editor payload shape, which may use properties arrays with id fields.
  return {
    type: "object",
    description: `JSON body for the Keywize ${toolName} webhook tool.`,
    properties: {
      tool_name: {
        type: "string",
        description: "Exact Keywize tool name to execute.",
        enum: [toolName],
      },
      parameters: buildInlineParametersSchema(toolName),
    },
    required: ["tool_name", "parameters"],
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
      request_body_schema: buildInlineRequestBodySchema(toolName),
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

function validateElevenLabsGuardrails(payloads) {
  for (const { name, payload } of payloads) {
    const guardrails = payload.platform_settings?.guardrails;

    if (guardrails?.version !== "1") {
      throw new Error(`${name} must configure platform_settings.guardrails.version as 1.`);
    }

    if (guardrails.focus?.is_enabled !== true) {
      throw new Error(`${name} must enable platform_settings.guardrails.focus.`);
    }

    if (guardrails.prompt_injection?.is_enabled !== true) {
      throw new Error(`${name} must enable platform_settings.guardrails.prompt_injection.`);
    }

    const customConfigs = guardrails.custom?.config?.configs;

    if (!Array.isArray(customConfigs) || customConfigs.length < 4) {
      throw new Error(`${name} must configure custom platform guardrails for Keywize role safety.`);
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

      assertWebhookApiSchemaMatchesInlineCreateShape(tool.api_schema, `${name}.${tool.name}.api_schema`);
      assertNoUnsupportedSchemaKeys(schema, `${name}.${tool.name}.request_body_schema`);
      assertToolBodySchemaIsVisible(schema, tool.name, `${name}.${tool.name}.request_body_schema`);
      assertToolBodyPropertySources(schema, `${name}.${tool.name}.request_body_schema`);
    }
  }
}

function assertWebhookApiSchemaMatchesInlineCreateShape(apiSchema, pathLabel) {
  if (!apiSchema || typeof apiSchema !== "object") {
    throw new Error(`ElevenLabs tool ${pathLabel} must be an object.`);
  }

  assertUnusedParameterSchemasAreOmitted(apiSchema, pathLabel);

  if (!apiSchema.request_headers || Array.isArray(apiSchema.request_headers) || apiSchema.request_headers["Content-Type"] !== "application/json") {
    throw new Error(`ElevenLabs tool ${pathLabel}.request_headers must be an object with Content-Type application/json for inline agent creation.`);
  }

  if (apiSchema.content_type !== "application/json") {
    throw new Error(`ElevenLabs tool ${pathLabel}.content_type must be application/json.`);
  }
}

function assertUnusedParameterSchemasAreOmitted(apiSchema, pathLabel) {
  for (const schemaKey of ["path_params_schema", "query_params_schema"]) {
    if (Object.prototype.hasOwnProperty.call(apiSchema, schemaKey)) {
      throw new Error(
        `ElevenLabs tool ${pathLabel} must omit unused ${schemaKey}; do not send JSON Schema fields or an empty properties dictionary for inline agent creation.`,
      );
    }
  }
}

function assertNoUnsupportedSchemaKeys(value, pathLabel) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    if (["id", "const", "additionalProperties", "constant_value"].includes(key)) {
      throw new Error(`ElevenLabs inline tool schema at ${pathLabel} uses standalone-tool-only or unsupported key ${key}.`);
    }

    assertNoUnsupportedSchemaKeys(childValue, `${pathLabel}.${key}`);
  }
}

function assertToolBodySchemaIsVisible(schema, toolName, pathLabel) {
  const properties = schema.properties;

  if (schema.type !== "object" || !properties || Array.isArray(properties) || typeof properties !== "object") {
    throw new Error(`ElevenLabs inline tool schema at ${pathLabel} must be an object with a properties dictionary.`);
  }

  assertRequiredList(schema.required, ["tool_name", "parameters"], pathLabel);

  const propertyNames = Object.keys(properties);
  if (propertyNames.join(",") !== "tool_name,parameters") {
    throw new Error(
      `ElevenLabs inline tool schema at ${pathLabel} must expose exactly these body parameters in order: tool_name, parameters. Found: ${propertyNames.join(", ")}.`,
    );
  }

  const toolNameSchema = properties.tool_name;
  const parametersSchema = properties.parameters;

  if (toolNameSchema.type !== "string" || toolNameSchema.enum?.[0] !== toolName || toolNameSchema.enum.length !== 1) {
    throw new Error(`ElevenLabs body parameter ${pathLabel}.properties.tool_name must be a string enum containing only ${toolName}.`);
  }

  if (parametersSchema.type !== "object") {
    throw new Error(`ElevenLabs body parameter ${pathLabel}.properties.parameters must be an object schema node.`);
  }

  assertParametersSchemaMatchesTool(parametersSchema, toolName, `${pathLabel}.properties.parameters`);
}

function assertParametersSchemaMatchesTool(parametersSchema, toolName, pathLabel) {
  const fields = getToolParameterFields(toolName);
  const properties = parametersSchema.properties;
  const expectedPropertyNames = fields.map((field) => field.name);
  const expectedRequired = fields.filter((field) => field.required).map((field) => field.name);

  if (parametersSchema.description !== TOOL_PARAMETERS_DESCRIPTION) {
    throw new Error(`ElevenLabs tool schema at ${pathLabel} has an invalid parameters description.`);
  }

  if (!properties || Array.isArray(properties) || typeof properties !== "object") {
    throw new Error(`ElevenLabs inline tool schema at ${pathLabel} must use a properties dictionary.`);
  }

  const propertyNames = Object.keys(properties);
  if (propertyNames.join(",") !== expectedPropertyNames.join(",")) {
    throw new Error(
      `ElevenLabs inline tool schema at ${pathLabel} has wrong parameters. Found: ${propertyNames.join(", ")}.`,
    );
  }

  assertRequiredList(parametersSchema.required, expectedRequired, pathLabel);

  for (const field of fields) {
    const propertySchema = properties[field.name];

    if (propertySchema.type !== field.type) {
      throw new Error(`ElevenLabs inline tool schema at ${pathLabel}.properties.${field.name} must be type ${field.type}.`);
    }

    if (typeof propertySchema.description !== "string" || propertySchema.description.length === 0) {
      throw new Error(`ElevenLabs inline tool schema at ${pathLabel}.properties.${field.name} must include an extraction description.`);
    }
  }
}

function assertRequiredList(actual, expected, pathLabel) {
  if (!Array.isArray(actual) || actual.join(",") !== expected.join(",")) {
    throw new Error(
      `ElevenLabs inline tool schema at ${pathLabel}.required must be [${expected.join(", ")}].`,
    );
  }
}

function assertToolBodyPropertySources(schema, pathLabel) {
  for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
    assertSchemaNodeSources(propertySchema, `${pathLabel}.properties.${propertyName}`);
  }
}

function assertSchemaNodeSources(schemaNode, pathLabel) {
  if (schemaNode?.type === "object") {
    if (!schemaNode.properties || Array.isArray(schemaNode.properties) || typeof schemaNode.properties !== "object") {
      throw new Error(`ElevenLabs inline object schema at ${pathLabel} must contain a properties dictionary.`);
    }

    for (const [propertyName, propertySchema] of Object.entries(schemaNode.properties)) {
      assertSchemaNodeSources(propertySchema, `${pathLabel}.properties.${propertyName}`);
    }

    return;
  }

  if (typeof schemaNode?.description !== "string" || schemaNode.description.length === 0) {
    throw new Error(`ElevenLabs inline literal schema property ${pathLabel} must set a description.`);
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

function buildPlatformSettingsConfig() {
  // Schema assumption: ElevenLabs Conversational AI create accepts platform_settings.guardrails
  // at the agent root. If the schema changes, keep guardrail updates isolated here and
  // preserve conversation_config and webhook tool payload behavior below.
  return {
    guardrails: PLATFORM_GUARDRAILS,
  };
}

function buildAgentPayload({ name, prompt, tools }, webhookUrl, voiceModeConfig) {
  // Schema assumption: this is the current Conversational AI agent create shape.
  // Keep this isolated so updates are local if ElevenLabs changes field names.
  return {
    name,
    platform_settings: buildPlatformSettingsConfig(),
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
  validateElevenLabsGuardrails(payloads);
  validateElevenLabsToolSchema(payloads);

  const existingAgentEnvKeys = AGENT_DEFINITIONS.map((definition) => definition.envKey).filter((envKey) =>
    env.get(envKey),
  );

  if (dryRun) {
    const toolSummary = payloads
      .map(({ name, payload }) => {
        const toolDetails = payload.conversation_config.agent.prompt.tools
          .map((tool) => {
            const bodyProperties = tool.api_schema.request_body_schema.properties;
            const parametersProperty = bodyProperties.parameters;
            const bodyParameterNames = Object.keys(bodyProperties).join(", ");
            const nestedParameterNames = Object.keys(parametersProperty.properties).join(", ");
            return `${tool.name} [path schema: omitted; query schema: omitted; body: ${bodyParameterNames}; parameters.properties: ${nestedParameterNames}]`;
          })
          .join(", ");
        return `${name}: ${toolDetails}`;
      })
      .join("\n");

    console.log(`Dry run validated ${payloads.length} ElevenLabs agent payloads.`);
    console.log("Webhook URL was derived from NEXT_PUBLIC_APP_URL.");
    console.log("Voice mode sanity check passed: conversation_config.conversation.text_only is false for every agent.");
    console.log("Platform guardrail sanity check passed: focus, prompt injection, and Keywize custom guardrails are configured for every agent.");
    console.log(`TTS model: ${voiceModeConfig.tts.model_id}. Voice ID: ${voiceModeConfig.tts.voice_id ? "configured" : "ElevenLabs default"}.`);
    console.log("Tool schema sanity check passed: unused path/query schemas are omitted, request headers and body properties are dictionaries, and body required fields are lists.");
    console.log(`Tool split:\n${toolSummary}`);
    if (existingAgentEnvKeys.length > 0) {
      console.log(
        `Existing agent ID env keys detected: ${existingAgentEnvKeys.join(", ")}. Rerunning without --dry-run creates new agents; update existing webhook tool URLs separately if only NEXT_PUBLIC_APP_URL changed.`,
      );
    }
    console.log("No agents were created and the env file was not updated.");
    return;
  }

  if (existingAgentEnvKeys.length > 0) {
    console.warn(
      `Existing agent ID env keys detected: ${existingAgentEnvKeys.join(", ")}. This script creates fresh agents and will overwrite those env keys with new IDs. Press Ctrl+C now if you only meant to update existing webhook URLs after changing NEXT_PUBLIC_APP_URL.`,
    );
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
