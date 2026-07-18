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
