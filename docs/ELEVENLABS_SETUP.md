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

The create script always creates a fresh set of agents. It does not update existing agents or standalone tools, so rerunning it when agent IDs are already configured creates duplicates and replaces the locally saved IDs.

After changing `NEXT_PUBLIC_APP_URL` for existing agents, choose one path deliberately:

- Keep the existing agent IDs and update each live webhook tool URL in the ElevenLabs dashboard or with the standalone tool PATCH instructions below. This is the default when only the deployment URL changed.
- Recreate all three agents only when a fresh set is desired. Expect new agent IDs and possible duplicate agents, then verify the new configurations before removing anything old.

Changing `NEXT_PUBLIC_APP_URL` locally does not retarget tools already stored by ElevenLabs.

## Applying prompt and guardrail changes

Editing the prompt files or create script changes only this repository. Existing agents in ElevenLabs keep their old prompts, first messages, model settings, and guardrails until they are updated or replaced.

In particular, editing `voice/prompts/intake-agent.md` does not change the hosted Intake conversation. Update the existing live Intake agent with the revised prompt and Intake first message, or intentionally recreate the agents and switch the application to the new Intake agent. Until one of those steps is complete, hosted voice calls continue using the previous Intake behavior.

After a prompt or guardrail change:

1. Run `node scripts/create-elevenlabs-agents.mjs --dry-run` to validate the local payload without contacting ElevenLabs.
2. For existing agents, update each agent's prompt, role-specific first message, model settings, and platform guardrails in the ElevenLabs dashboard or through a deliberate API update while preserving its current agent ID and tool configuration.
3. Alternatively, run the create script without `--dry-run` only when a fresh set of agents is intended. It is create-only, so this path creates three new agents and saves their new IDs locally.
4. Confirm that the application references the intended Intake agent and that server-side Caller and Closer flows reference the intended agents before retiring older configurations.

Do not rerun the create script against configured agents merely to apply a prompt edit unless duplicate agents are intentional. Updating an existing agent is the safer path when its IDs, tools, and integrations should stay unchanged.

The script explicitly requests voice mode by setting `conversation_config.conversation.text_only` to `false` on every generated agent payload. It also adds a `conversation_config.tts` block, role-specific first messages, a moderate response temperature, and platform guardrails under `platform_settings.guardrails`. Optional non-secret TTS settings can be placed in `.env.local` before rerunning the script:

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
  - No coercion, user-pressure tactics, fake urgency or authority, or unauthorized commitments

After creating agents, open each agent in the ElevenLabs dashboard and confirm the Guardrails section shows focus, prompt injection, and the Keywize custom guardrails. If the ElevenLabs schema changes, update `buildPlatformSettingsConfig()` in `scripts/create-elevenlabs-agents.mjs` rather than moving guardrail rules into prompts only.

## Voice-mode checklist

If a published ElevenLabs test or widget replies with text instead of audio, check both the generated agent config and the dashboard/widget settings:

1. Pull the latest code, then update the existing agent or intentionally recreate it as described in [Applying prompt and guardrail changes](#applying-prompt-and-guardrail-changes). Existing agents created before the voice-mode config was added may still be in text-only mode. Do not rerun the create-only script unless new agents are intended.
2. In the ElevenLabs agent dashboard, open the agent settings and confirm Advanced `Text only` is off.
3. In the widget settings, set Widget Interface to `Voice only` or `Voice + text`, not `Text only` or chat-only mode.
4. Start the test from the microphone or voice button. Typing into a chat input can still produce a text reply even when voice is enabled.
5. Allow browser microphone permissions and audio playback permissions for the ElevenLabs test page or embedded widget host.
6. Confirm the agent has a voice selected in ElevenLabs, or provide `ELEVENLABS_VOICE_ID` before rerunning the setup script.

## Browser Intake voice UI

The browser integration intentionally connects only to the Intake agent. Caller and Closer stay in server-side flows and their agent IDs or signed URLs must never be exposed to browser code.

The React UI uses `@elevenlabs/react` with the WebSocket transport. A signed URL works with WebSocket sessions, so the temporary LiveKit WebRTC override is not needed for this integration.

### Configure and run

1. Copy `.env.example` to `.env.local` if local environment configuration does not exist.
2. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_INTAKE_AGENT_ID` on the server. Do not prefix either variable with `NEXT_PUBLIC_`.
3. Install dependencies and start Next.js:

   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000/intake?mode=voice`.
5. Select **Start voice call**, allow microphone access, and speak with Intake. The call card shows **Connecting**, **Listening**, or **Speaking**, keeps the latest exchange in focus, and places recent conversation notes behind a compact disclosure.
6. If microphone permission, session setup, or ElevenLabs is unavailable, continue with the full manual form on the same page. `/intake` remains the manual-first route.

Browsers generally allow microphone capture on HTTPS origins or `localhost`. If access was denied, enable the microphone for the site in browser settings, confirm the correct input device, and retry. The failure alert appears only when startup fails or an active session disconnects with an error. Recoverable SDK errors do not interrupt an otherwise active call.

### Signed URL boundary

`GET /api/elevenlabs/signed-url` reads `ELEVENLABS_API_KEY` and `ELEVENLABS_INTAKE_AGENT_ID` inside the Next.js server route, calls ElevenLabs `GET /v1/convai/conversation/get-signed-url`, and returns only `{ "signedUrl": "..." }`. Responses are not cached. The API key and a standalone raw Intake agent ID are not added to the browser bundle. Missing environment configuration and ElevenLabs failures return JSON errors with a non-2xx status.

Do not extend this route with Caller or Closer selection. Any future browser agent should have a separate, allowlisted server route and an explicit product review.

### Voice mission handoff

`create_job_spec` already returns `{ "success": true, "missionId": "..." }` from `/api/elevenlabs/tools`. The Intake UI listens for the SDK's `agent_tool_response_full_payload` callback. When that event contains a successful `create_job_spec` result with a valid mission ID, the browser navigates to `/mission/[id]`. It never derives a mission ID from transcript text or pretends that a voice mission succeeded.

Some existing ElevenLabs agent configurations may not stream the full server-tool result to browser clients. In that case, the voice session still works, but automatic navigation cannot be confirmed by the browser and the manual form remains the MVP fallback. The next bridge is to enable `agent_tool_response_full_payload` in the Intake agent's client-event configuration during a deliberate agent configuration update, or add a dedicated client navigation tool that receives the mission ID after `create_job_spec` succeeds. Do not patch a live agent just to test the UI, and ensure the webhook and browser use the same Keywize deployment so the in-memory MVP mission is available to the mission page.

## Judge demo execution modes

The manual intake defaults to **Reliable Demo - simulated vendors**. It creates an empty mission shell, then the server advances a deterministic state machine as the mission page polls stored state. Vendor A, B, and C quotes are persisted one at a time. The final C negotiation uses the stored Vendor B quote as leverage. No external call is required for this judged path.

To run it:

1. Start the app with `npm run dev`.
2. Open `/intake` and leave **Reliable Demo** selected.
3. Submit the authorized form, wait for three stored quote cards, then select **Negotiate fastest option**.
4. Open the report only after the mission reaches **Terms secured**.

The optional **Live Sandbox Proof** is initiated by Keywize through ElevenLabs' documented server-side Twilio outbound endpoint. Keywize does not call Twilio's REST API directly and does not read `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or `TWILIO_PHONE_NUMBER` for this flow. ElevenLabs uses the phone number linked by `ELEVENLABS_AGENT_PHONE_NUMBER_ID` and its Twilio integration to place the provider leg.

This boundary matters for logs. Start in ElevenLabs Conversations and outbound calling diagnostics. A Twilio Console contains a log only when that Twilio project owns the linked outbound leg or the destination's inbound leg. Looking at an unrelated Keywize Twilio project can correctly show no calls even though ElevenLabs accepted an outbound request.

Live sandbox is restricted to a private registry of team-controlled vendor persona destinations. When this mode is enabled, configure this canonical set of required server-only variables in every Vercel environment where the deployment runs:

```txt
ELEVENLABS_API_KEY=
ELEVENLABS_CALLER_AGENT_ID=
ELEVENLABS_CLOSER_AGENT_ID=
ELEVENLABS_AGENT_PHONE_NUMBER_ID=
KEYWIZE_SANDBOX_VENDOR_A_PHONE=
KEYWIZE_SANDBOX_VENDOR_B_PHONE=
KEYWIZE_SANDBOX_VENDOR_C_PHONE=
# human_tester or twilio_vendor_persona
KEYWIZE_SANDBOX_DESTINATION_KIND=human_tester
# Required only for twilio_vendor_persona after manual verification
KEYWIZE_SANDBOX_TWILIO_PERSONA_READY=false
```

`ELEVENLABS_AGENT_PHONE_NUMBER_ID` is the linked outbound phone number provider ID, not a destination phone number. Existing deployments that use `ELEVENLABS_SANDBOX_PHONE_NUMBER_ID` remain supported as a backward-compatible alias, but new Vercel configuration should use the canonical name above. `ELEVENLABS_ENVIRONMENT` is an optional ElevenLabs environment selector. `KEYWIZE_LIVE_SANDBOX_FALLBACK_MS` is an optional bounded wait for all three quotes. It defaults to 120000 milliseconds and is clamped between 45000 and 180000 milliseconds.

`KEYWIZE_SANDBOX_DESTINATION_KIND` is a safe enum that may be shown in browser diagnostics; it never contains a number or provider identifier. Existing deployments without it remain callable but show an ambiguity warning. When it is `twilio_vendor_persona`, Keywize refuses to dial until `KEYWIZE_SANDBOX_TWILIO_PERSONA_READY=true`. Set that acknowledgement only after manually verifying the Twilio destination's inbound Voice app as described below.

Never prefix these names with `NEXT_PUBLIC_`. After changing Vercel variables, redeploy the affected environment because an existing deployment does not receive later environment edits. `GET /api/elevenlabs/call` safely reports `configured`, `callReady`, canonical `missingEnvNames`, and the safe telephony diagnostics described below. It never returns configured values. `configured` means required values exist; `callReady` is false when a declared Twilio destination has not passed the persona-readiness gate. A missing-variable fallback names only canonical missing variables, for example `Missing: KEYWIZE_SANDBOX_VENDOR_B_PHONE`.

### Live sandbox test procedure

The linked ElevenLabs/Twilio outbound number calls the configured A destination first. After A's `save_quote` succeeds, Keywize calls B, then C. The browser never supplies a destination, and no arbitrary locksmith or business number can be dialed.

Choose and complete one destination setup path before selecting **Live Sandbox Proof**.

#### Path 1: personal phone with a human tester

1. Put only a team-controlled test phone in the three server allowlist slots. The same phone may be used for A, B, and C because calls are sequential.
2. Set `KEYWIZE_SANDBOX_DESTINATION_KIND=human_tester`.
3. Keep the roleplay card below open. Pick up each incoming call, answer as the assigned vendor, and stay connected through the Caller's final readback.
4. If a recording says the account is a trial or asks for a key "to execute your code," note that this is not the Keywize Caller opening. It may be a trial gate on the Twilio integration linked in ElevenLabs. Pressing a key only clears that provider gate; it does not supply vendor facts. If the call then disconnects, inspect the corresponding ElevenLabs conversation and the Twilio project backing the linked number, if the team controls it.

#### Path 2: Twilio number backed by a vendor persona

1. Use only a dedicated, team-controlled Twilio Voice number as the allowlisted destination. Do not use a real locksmith number.
2. In that number's Twilio **Voice Configuration**, set **A call comes in** to a public HTTPS webhook or Twilio application that conducts a multi-turn Vendor A/B/C voice persona. It must listen to the Caller's assigned slot and provide the roleplay facts below.
3. Do not point this destination at Keywize's `/api/twilio/inbound` route. That route is an inbound customer-intake placeholder, not a vendor persona. Do not leave the number on a Twilio default trial/demo application, a static "execute your code" prompt, empty TwiML, or TwiML that immediately hangs up.
4. Call the destination manually. Confirm that it answers with the controlled vendor persona and can complete a short two-way voice exchange.
5. Set `KEYWIZE_SANDBOX_DESTINATION_KIND=twilio_vendor_persona` and only then set `KEYWIZE_SANDBOX_TWILIO_PERSONA_READY=true`. Redeploy the environment.
6. For this receiving leg, inspect inbound Voice logs in the Twilio project that owns the destination number. The Keywize app's Twilio project may be different.

Before the calls, keep this roleplay card open. A human tester speaks these facts; a controlled Twilio vendor persona must be configured to provide the same facts:

1. **Vendor A:** Say the service call starts at `$39`, the technician decides labor and drilling on site, ETA is 20 minutes, and no ID is required. Do not confirm an all-in total.
2. **Vendor B:** Say `$130 all-in`: `$40` dispatch plus `$90` labor, 30-minute ETA, no-drill first, ID required, no other fees, and a 90-day warranty.
3. **Vendor C:** Say `$165 all-in`: `$45` dispatch plus `$120` labor, 15-minute ETA, non-destructive entry first, ID required, no other fees, and a one-year warranty.

The Caller identifies the assigned sandbox persona in an opening that begins with "Hi, this is Keywize's controlled live sandbox test." A trial-account or "execute your code" recording therefore does not come from the configured Keywize Caller opening. From the Keywize response alone, the app cannot safely decide whether that recording is a Twilio trial gate on the linked outbound integration or a programmable Voice application on a Twilio destination. Use the owning provider logs above to separate those legs instead of guessing.

If a personal phone recipient answers as themselves, stays silent, or hangs up before supplying quote facts, the Caller has no truthful data for `save_quote`. Keywize must not invent those facts.

The Caller receives job and service-area facts but not the user's budget or a competing quote. The Closer receives only the stored target, hard ceiling, and validated leverage snapshot. Call recording is disabled in this proof route.

### Webhook reachability and correlation

The Caller agent's `save_quote` webhook must use the public HTTPS URL of the same deployed Keywize environment:

```txt
https://<deployed-keywize-host>/api/elevenlabs/tools
```

A localhost URL, stale preview URL, authentication wall, or deployment that cannot accept ElevenLabs requests means the tool never reaches Keywize. Open the deployment's safe mission diagnostics instead of exposing request bodies or provider identifiers. Do not test reachability by printing keys, phone numbers, agent IDs, tool IDs, or conversation IDs.

Live writes require private call correlation. Current tool schemas send `missionId`, `callId`, and `vendorId` from outbound runtime variables; the route also recognizes ElevenLabs' provider conversation envelope for compatibility. The server validates that correlation against its private registry. Existing reliable demo payload aliases remain supported. Updating or replacing a hosted agent remains a deliberate reviewed operation. Editing this repository alone does not change an existing hosted tool.

### Reading live proof diagnostics

The mission UI exposes only vendor-slot names, safe provider enums, and these lifecycle statuses:

- **call_started** means ElevenLabs returned an explicit success and a trackable conversation reference for the allowlisted outbound request. An HTTP success without those fields is rejected. This status does not claim the phone was answered.
- **callee_answered** is inferred from ElevenLabs conversation activity or a correlated tool webhook. Keywize does not currently receive a direct carrier answer callback, and the UI says so.
- **tool_called** means the correlated `save_quote` webhook reached Keywize. It may still be rejected for safe validation reasons.
- **quote_saved** means the structured quote passed validation and was persisted.
- **timed_out_no_quote** means: "Call placed, but no quote webhook arrived. Check that the destination answers as Vendor A/B/C." If the destination is Twilio, also verify its inbound Voice webhook/TwiML runs the vendor persona instead of a default trial/demo app.
- **fallback** means only missing demo results are being completed from the visibly disclosed persona fixtures.

The browser receives no destination number, API key, agent ID, phone number ID, provider ID, Twilio SID, ElevenLabs conversation ID, or raw call ID. `GET /api/elevenlabs/call` returns the fixed safe path (`elevenlabs` initiator, `twilio` integration, direct Keywize Twilio REST usage `false`), destination-kind enum, readiness boolean, and canonical missing environment variable names only.

#### Log lookup by leg

| What happened | First place to check | Why another Twilio Console can be empty |
| --- | --- | --- |
| ElevenLabs accepted or rejected launch | ElevenLabs Conversations/outbound calling diagnostics | Keywize initiated through ElevenLabs, not the app's Twilio REST credentials |
| Linked Twilio integration played a trial gate | The Twilio project that backs the phone number linked in ElevenLabs, if team-owned | Twilio logs are project-scoped; the app's configured project may not own that number |
| Twilio destination played a demo prompt or disconnected | Inbound Voice logs for the Twilio project owning the destination | This is the receiving leg, potentially in a different Twilio project |
| Human test phone answered but no quote appeared | ElevenLabs conversation plus the Keywize `tool_called` status | A carrier answer alone does not prove the tester roleplayed or that `save_quote` ran |

This separates the trigger from the masking and symptom: the telephony trial/demo gate prevents the controlled vendor exchange; a launch-only success can mask that failure; the visible symptom is an ended call with no `tool_called` or `quote_saved` event.

If configuration is absent, initiation fails, or complete correlated tool results do not arrive before the timeout, the same mission visibly switches to reliable simulated replay. The UI keeps the `Live Sandbox` badge and labels the fallback. This prevents live transport from becoming the critical judge path.

The MVP mission repository is process-wide memory so Next.js route and server-component bundles share demo state. It is not production durability. A production live deployment still needs a database, queue, authenticated webhooks, idempotency storage, and verified post-call lifecycle handling.

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

Use `Content-Type: application/json`. The Keywize endpoint expects the webhook body to contain the exact tool name and nested parameters:

```json
{
  "tool_name": "EXACT_TOOL_NAME",
  "parameters": {
    "fieldName": "extracted value"
  }
}
```

The endpoint also accepts older `{ tool, payload }`, `{ tool, params }`, `name`, `args`, and `input` aliases so existing agent configs keep working.

#### Inline agent-create schema

When tools are defined inline in `POST /v1/convai/agents/create`, ElevenLabs validates a dictionary-style, JSON-schema-like shape. The create script generates this shape:

```json
{
  "url": "https://keywize.example/api/elevenlabs/tools",
  "method": "POST",
  "request_headers": {
    "Content-Type": "application/json"
  },
  "content_type": "application/json",
  "request_body_schema": {
    "type": "object",
    "description": "JSON body for the Keywize EXACT_TOOL_NAME webhook tool.",
    "properties": {
      "tool_name": {
        "type": "string",
        "description": "Exact Keywize tool name to execute.",
        "enum": ["EXACT_TOOL_NAME"]
      },
      "parameters": {
        "type": "object",
        "description": "Tool-specific JSON parameters collected by the agent.",
        "properties": {
          "fieldName": {
            "type": "string",
            "description": "Required. Clear LLM extraction instruction."
          }
        },
        "required": ["fieldName"]
      }
    },
    "required": ["tool_name", "parameters"]
  }
}
```

For inline agent creation, `api_schema` only needs `url`, `method`, and `request_body_schema`; Keywize also sends dictionary-style `request_headers` and an explicit JSON `content_type`. Because the Keywize URL has no path placeholders or query parameters, omit `path_params_schema` and `query_params_schema` entirely. Do not send guessed empty schemas: the create endpoint rejects JSON Schema fields such as `type`, `description`, and `required` at the path/query dictionary level, and it rejects an empty `query_params_schema.properties` dictionary.

Keep every request-body `properties` value as a dictionary or object and every `required` value as a string array. Do not include standalone editor fields such as `id`, boolean `required` values on schema nodes, or array-style `properties`; those cause `422` validation errors on the agent creation endpoint.

#### Standalone tool PATCH/editor schema

The standalone tool PATCH endpoint and dashboard editor can use a different payload shape from inline agent creation. If an existing tool needs manual repair, PATCH the tool-specific endpoint with the full webhook tool payload using the tool ID from that ElevenLabs dashboard URL or API response:

```txt
PATCH https://api.elevenlabs.io/v1/convai/tools/<tool_id>
```

For standalone tool PATCH/editor payloads, use the shape accepted by that endpoint or shown in the dashboard. In particular, the captain's working live-tool PATCH payload may use `properties` arrays with `id` fields, boolean `required` values per property, and `constant_value` for the fixed `tool_name`. Do not force that standalone PATCH/editor shape into inline `agents/create` tools. Keep the Keywize webhook URL pointed at the deployment you are repairing, and do not hardcode a real tool ID into repo config or docs.

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
    "quoteConfidence": "firm_before_arrival",
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
