# Repository instructions

## Product context

Keywize is a hackathon MVP for a voice-first AI locksmith negotiator. The product gathers a structured lockout job spec, calls locksmiths, captures itemized quotes, analyzes hidden-fee risk with VoiceTrust, negotiates under the user's max budget, and returns a ranked recommendation with transcript evidence.

## Coding rules

- Keep the MVP demo reliable and simple.
- Prefer clear TypeScript types and small pure functions.
- Do not invent fake vendor quotes in negotiation logic. Use only stored quotes as leverage.
- Treat VoiceTrust as an uncertainty signal, not a lie detector.
- Keep user safety explicit: authorization confirmation and proof-of-residence reminders are required for lockout flows.
- Do not commit real API keys, Twilio credentials, ElevenLabs keys, phone numbers, or user addresses.
- Use mock data first when real integrations are not ready.
- Do not manually edit generated build artifacts.

## Project structure

Expected structure:

```txt
app/
components/
lib/
app/api/
voice/
docs/
```

Shared types should live in `lib/types.ts`. Risk scoring should live in `lib/riskScore.ts`. VoiceTrust logic should live in `lib/voiceTrust.ts`. Ranking logic should live in `lib/ranking.ts`.

## UI direction

Use a premium bright SaaS style:

- Warm off-white background
- Near-black text
- Huge serif hero headline
- Black rounded pill CTAs
- Mint and soft pink accent chips
- Rounded floating cards
- Lots of whitespace

Do not make the main website look like a dark emergency dashboard.

## Demo priorities

The demo must clearly show:

1. Intake captures the lockout case and max budget.
2. Three locksmith quotes are collected in structured form.
3. Vendor A is flagged as high risk.
4. VoiceTrust flags hesitation on hidden-fee questions.
5. Keywize negotiates Vendor C from $165 to $145 or improves terms.
6. The final report ranks vendors and cites transcript evidence.

## Validation

Before pushing changes, run:

```bash
npm run lint
npm run build
```
