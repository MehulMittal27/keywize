# ElevenLabs setup

Keywize uses ElevenLabs Agents for voice intake, vendor calling, and negotiation.

## Agents

Create three agents:

1. Intake agent
   - Collects the lockout case, location, urgency, lock type, ideal price, max price, and authorization confirmation.

2. Caller agent
   - Calls locksmiths, asks anti-scam questions, captures itemized quotes, and stores transcript evidence.

3. Closer agent
   - Uses only real competing quotes to negotiate price or terms and produces the final recommendation.

## Creating agents

After setting `ELEVENLABS_API_KEY` and `NEXT_PUBLIC_APP_URL` in `.env.local`, create the three Conversational AI agents with:

```bash
node scripts/create-elevenlabs-agents.mjs
```

The script posts to the documented ElevenLabs create endpoint:

```txt
POST https://api.elevenlabs.io/v1/convai/agents/create
```

Do not change this to `POST /v1/convai/agents`: that path is the list endpoint and returns `405 Method Not Allowed` for create attempts. The script saves the returned agent IDs into `.env.local`. Use `--dry-run` to validate generated payloads without contacting ElevenLabs or writing `.env.local`.

The script explicitly requests voice mode by setting `conversation_config.conversation.text_only` to `false` on every generated agent payload. It also adds a `conversation_config.tts` block and configures platform guardrails under `platform_settings.guardrails`. Optional non-secret TTS settings can be placed in `.env.local` before rerunning the script:

```txt
ELEVENLABS_VOICE_ID=
ELEVENLABS_TTS_MODEL_ID=eleven_turbo_v2
ELEVENLABS_AGENT_OUTPUT_AUDIO_FORMAT=
```

Leave `ELEVENLABS_VOICE_ID` blank to use the ElevenLabs default voice configured for the agent. Change the TTS model or output format only to values supported by your ElevenLabs account and integration.

## Guardrail checklist

The prompts and platform guardrails work together. Prompt rules tell the model how to behave, while ElevenLabs platform guardrails run independently under `platform_settings.guardrails`.

Every generated agent payload should include:

- `focus.is_enabled: true`
- `prompt_injection.is_enabled: true`
- Custom blocking guardrails for:
  - No private reasoning, planning, tool strategy, checklist logic, or hidden chain-of-thought in spoken or text responses
  - Staying in the assigned Keywize role
  - No invented vendor quotes, fake leverage, fake authorization, or fake proof status
  - No lock-bypass, picking, drilling, disabling, or access-control defeat instructions

After creating agents, open each agent in the ElevenLabs dashboard and confirm the Guardrails section shows focus, prompt injection, and the Keywize custom guardrails. If the ElevenLabs schema changes, update `buildPlatformSettingsConfig()` in `scripts/create-elevenlabs-agents.mjs` rather than moving guardrail rules into prompts only.

## Voice-mode checklist

If a published ElevenLabs test or widget replies with text instead of audio, check both the generated agent config and the dashboard/widget settings:

1. Pull the latest code and rerun `node scripts/create-elevenlabs-agents.mjs` if the agent config changed. Existing agents created before the voice-mode config was added may still be in text-only mode.
2. In the ElevenLabs agent dashboard, open the agent settings and confirm Advanced `Text only` is off.
3. In the widget settings, set Widget Interface to `Voice only` or `Voice + text`, not `Text only` or chat-only mode.
4. Start the test from the microphone or voice button. Typing into a chat input can still produce a text reply even when voice is enabled.
5. Allow browser microphone permissions and audio playback permissions for the ElevenLabs test page or embedded widget host.
6. Confirm the agent has a voice selected in ElevenLabs, or provide `ELEVENLABS_VOICE_ID` before rerunning the setup script.

## Tool endpoints

The agents should call backend tools for:

- `create_job_spec`
- `save_quote`
- `analyze_voice_trust`
- `classify_vendor_tone`
- `update_negotiation`

MVP endpoint:

```txt
POST /api/elevenlabs/tools
```

The endpoint accepts ElevenLabs tool calls, stores demo mission data in the in-memory MVP store, and does not call external services.

### Tools webhook contract

Configure each ElevenLabs agent tool as a JSON webhook that sends a `POST` request to the Keywize deployment URL:

```txt
https://<keywize-host>/api/elevenlabs/tools
```

Use `Content-Type: application/json`. In the ElevenLabs webhook `request_body_schema`, define exactly two visible top-level body parameters in a `properties` array: `tool_name` as a required string property with `id: "tool_name"`, `description`, and `constant_value` set to the exact tool name, and `parameters` as a required object property with `id: "parameters"` and description `Tool-specific JSON parameters collected by the agent.`. Put each tool's structured primitive fields directly inside the object's own `parameters.properties` array as property objects with `id`, `type`, `description`, and a boolean `required`, for example the `parameters` object contains `{ "id": "caseType", "type": "string", ... }`. Do not place those child fields at the top level or under a `schema` or `value_schema` wrapper. This is the captain-provided working ElevenLabs ConvAI tool PATCH shape, not the older plain JSON Schema properties map. The endpoint also accepts older `{ tool, payload }`, `{ tool, params }`, `name`, `args`, and `input` aliases so existing agent configs keep working.

Every generated webhook tool body uses this shape:

```json
{
  "path_params_schema": {},
  "query_params_schema": [],
  "request_headers": [
    {
      "name": "Content-Type",
      "value": "application/json"
    }
  ],
  "content_type": "application/json",
  "request_body_schema": {
    "id": "request_body",
    "type": "object",
    "description": "JSON body for the Keywize EXACT_TOOL_NAME webhook tool.",
    "required": true,
    "properties": [
      {
        "id": "tool_name",
        "type": "string",
        "description": "Exact Keywize tool name to execute.",
        "constant_value": "EXACT_TOOL_NAME",
        "required": true
      },
      {
        "id": "parameters",
        "type": "object",
        "description": "Tool-specific JSON parameters collected by the agent.",
        "required": true,
        "properties": [
          {
            "id": "fieldName",
            "type": "string",
            "description": "Required. Clear LLM extraction instruction.",
            "required": true
          }
        ]
      }
    ]
  }
}
```

For each extracted field in `parameters.properties`, use `description` so the agent extracts the value. The fixed `tool_name` field uses `constant_value` with the exact tool name. To manually inspect this in ElevenLabs, open each agent tool, expand the webhook body schema, confirm the top level shows `tool_name` and `parameters`, then expand `parameters.properties` and confirm the expected tool-specific fields are visible there.

If an existing tool needs manual repair, PATCH the tool-specific endpoint with the full webhook tool payload using the tool ID from that ElevenLabs dashboard URL or API response:

```txt
PATCH https://api.elevenlabs.io/v1/convai/tools/<tool_id>
```

Use the same `api_schema` shape shown above and keep the Keywize webhook URL for the deployment you are repairing. Do not hardcode a real tool ID into repo config or docs.

Successful responses include `success: true` plus the tool-specific result, such as a `missionId`, `quoteId`, VoiceTrust `signal`, tone classification, or updated quote.

Error responses include a clear `error` message. Invalid JSON returns `400`, and unsupported tool names return `422`.

### Example payloads

Create the lockout job spec after intake confirms user authorization and reminds the user to have proof of residence ready:

```json
{
  "tool_name": "create_job_spec",
  "parameters": {
    "caseType": "home lockout",
    "urgency": "as soon as possible",
    "propertyType": "residential",
    "doorType": "front door",
    "lockType": "deadbolt",
    "doorOpen": false,
    "keyStolen": false,
    "brokenKeyVisible": false,
    "needRekey": false,
    "newKeysNeeded": 2,
    "idealPrice": 120,
    "maxPrice": 150,
    "authorizationConfirmed": true,
    "locationCity": "Example City",
    "locationZip": "00000"
  }
}
```

Save a structured locksmith quote from a vendor call:

```json
{
  "tool_name": "save_quote",
  "parameters": {
    "vendorName": "Vendor C",
    "phone": "example-phone",
    "etaMinutes": 35,
    "dispatchFee": 50,
    "laborFee": 95,
    "partsFee": 0,
    "afterHoursFee": 0,
    "taxesAndOther": 20,
    "totalEstimate": 165,
    "isTotalAllIn": true,
    "drillingPolicy": "Only if non-destructive entry fails and user approves",
    "idRequired": true,
    "oldKeyDisabled": true,
    "keysIncluded": 2,
    "warranty": "30 days",
    "quoteConfidence": "high",
    "redFlags": "",
    "transcriptEvidence": "The total should be 165 if it is a standard deadbolt.",
    "transcript": "Example transcript excerpt."
  }
}
```

Analyze VoiceTrust as an uncertainty signal, not as lie detection:

```json
{
  "tool_name": "analyze_voice_trust",
  "parameters": {
    "questionType": "hidden_fees",
    "vendorText": "Uh, the technician will decide when they get there.",
    "pauseMs": 900,
    "fillerWords": "uh",
    "evasivePhrases": "technician will decide",
    "speechRateChangePct": -15
  }
}
```

Classify the vendor tone for ranking context:

```json
{
  "tool_name": "classify_vendor_tone",
  "parameters": {
    "vendorLatestMessage": "I can give you the exact lockout price before dispatch.",
    "conversationContext": "Vendor B answered hidden fee and drilling policy questions clearly."
  }
}
```

Track negotiation updates using only stored competing quotes as leverage:

```json
{
  "tool_name": "update_negotiation",
  "parameters": {
    "vendorName": "Vendor C",
    "beforePrice": 165,
    "afterPrice": 145,
    "termsChanged": "Matched competitor price for booking now",
    "leverageUsed": "Stored Vendor B quote",
    "transcriptEvidence": "I can match 145 if you can book now.",
    "priceOrTermsChanged": true
  }
}
```

## VoiceTrust note

VoiceTrust should be presented as a trust and uncertainty signal. Do not describe it as lie detection.

Signals to analyze:

- Pause before price or fee answers
- Filler words
- Evasive phrases
- Starts-at pricing
- Technician-decides language
- Optional pitch or volume variance if audio features are available

## Demo fallback

If live ElevenLabs calling is not ready, use the written prompts and simulated vendor personas to show the full flow in the web dashboard.
