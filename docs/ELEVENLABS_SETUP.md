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

For now this endpoint only parses and logs tool calls. It does not persist real user data, store secrets, or call external services.

### Tools webhook contract

Configure each ElevenLabs agent tool as a JSON webhook that sends a `POST` request to the Keywize deployment URL:

```txt
https://<keywize-host>/api/elevenlabs/tools
```

Use `Content-Type: application/json`. The endpoint accepts either `tool_name` or `name` as the tool identifier, plus a payload object such as `parameters`, `args`, or `input`.

Successful response shape:

```json
{
  "success": true,
  "toolName": "save_quote",
  "message": "Tool call accepted. No data was persisted and no external services were called.",
  "result": {
    "status": "accepted"
  }
}
```

Error responses use `success: false` with a clear `error` message. Invalid JSON returns `400`, unsupported tool names return `400`, and non-POST methods return `405` with `Allow: POST`.

### Example payloads

Create the lockout job spec after intake confirms user authorization and reminds the user to have proof of residence ready:

```json
{
  "tool_name": "create_job_spec",
  "parameters": {
    "lockoutType": "home lockout",
    "lockType": "deadbolt",
    "urgency": "as soon as possible",
    "maxBudgetUsd": 150,
    "authorizationConfirmed": true,
    "proofOfResidenceReminderGiven": true
  }
}
```

Save a structured locksmith quote from a vendor call:

```json
{
  "tool_name": "save_quote",
  "parameters": {
    "vendorLabel": "Vendor C",
    "basePriceUsd": 95,
    "serviceCallUsd": 50,
    "totalQuotedUsd": 165,
    "arrivalWindowMinutes": 35,
    "transcriptEvidence": [
      "The total should be 165 if it is a standard deadbolt.",
      "There is a 50 dollar service call included."
    ]
  }
}
```

Analyze VoiceTrust as an uncertainty signal, not as lie detection:

```json
{
  "tool_name": "analyze_voice_trust",
  "parameters": {
    "vendorLabel": "Vendor A",
    "question": "Are there any hidden fees or technician-decided charges?",
    "answer": "Uh, the technician will decide when they get there.",
    "signals": ["pause_before_fee_answer", "filler_words", "technician_decides_language"]
  }
}
```

Classify the vendor tone for ranking context:

```json
{
  "tool_name": "classify_vendor_tone",
  "parameters": {
    "vendorLabel": "Vendor B",
    "transcriptExcerpt": "I can give you the exact lockout price before dispatch.",
    "observedTone": "clear and direct"
  }
}
```

Track negotiation updates using only stored competing quotes as leverage:

```json
{
  "tool_name": "update_negotiation",
  "parameters": {
    "vendorLabel": "Vendor C",
    "originalTotalUsd": 165,
    "negotiatedTotalUsd": 145,
    "leverageQuoteLabels": ["Vendor B"],
    "transcriptEvidence": [
      "I can match 145 if you can book now."
    ]
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
