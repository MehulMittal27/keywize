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
- Do not depend on paid Twilio features or real carrier calls for the critical hackathon demo. Default to the simulated Vendor A/B/C persona flow with prerecorded or replayable evidence.
- Treat live sandbox calls as optional proof only, using controlled endpoints that answer as vendor personas. See `docs/ELEVENLABS_SETUP.md#live-sandbox-test-procedure` for boundaries.
- If a destination plays trial-account prompts or disconnects, treat it as a telephony limitation rather than a Keywize logic bug. Switch to the reliable demo path or a controlled in-app/browser persona simulation.
- Never dial arbitrary real locksmiths during demos.
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

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
