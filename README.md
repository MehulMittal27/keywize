# Keywize

Locked out? Keywize gets you back in without getting played.

Keywize is a voice-first AI locksmith negotiator for emergency lockouts. A user calls once or starts online, Keywize gathers the lockout details, calls locksmiths, detects hidden-fee risk, negotiates under the user's budget, and recommends the safest best-value option with transcript evidence.

## Why it matters

Emergency locksmith calls are stressful and opaque. A quote that starts at $39 can become much higher after dispatch, labor, parts, drilling, after-hours fees, and tax. Keywize protects users by forcing clear all-in pricing before dispatch.

## MVP scope

Supported lockout cases:

1. Room door key lost
2. Key inside room and locked out
3. Main apartment key lost
4. Key stolen
5. Broken key inside lock

## Core features

- Voice and web intake
- User max-budget guardrail
- Twilio phone access for users without internet
- ElevenLabs voice agents for intake, calling, and negotiation
- Structured locksmith quote collection
- Scam and hidden-fee risk scoring
- VoiceTrust hesitation and confidence analysis
- Human-like negotiation playbook
- Final ranked report with transcript evidence

## Standout feature: VoiceTrust

VoiceTrust analyzes uncertainty around high-risk moments like price, hidden fees, drilling, and final confirmation. It does not claim to detect lies. It flags hesitation, filler words, evasive phrases, and confidence drops as trust signals that feed into the risk score and negotiation strategy.

Example:

> Vendor pauses after being asked about hidden fees.
>
> Keywize flags low confidence and asks: "You paused there, so I want to make sure we are not missing anything. Is there any dispatch, drilling, after-hours, or parts fee not included in the $145?"

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ElevenLabs Agents
- Twilio Voice and SMS
- Local mock data for hackathon demo

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Useful commands

```bash
npm run dev
npm run build
npm run lint
```

## Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Then fill in the values you have available. The MVP can run with mock data before real Twilio or ElevenLabs integration is complete.

## Docs

- [`docs/PRD_Keywize.md`](docs/PRD_Keywize.md)
- [`docs/PRD_Keywize.pdf`](docs/PRD_Keywize.pdf)
- [`docs/IMPLEMENTATION_GUIDE_Keywize.md`](docs/IMPLEMENTATION_GUIDE_Keywize.md)

## Demo story

Demo case: broken key inside the main apartment deadbolt. The user is locked out and has a max budget of $150.

- Vendor A says pricing starts at $39 but refuses a full total, high risk.
- Vendor B gives $130 all-in, no-drill first, low risk.
- Vendor C starts at $165 with a faster ETA, then Keywize negotiates to $145 using Vendor B's real quote.

The winning moment is showing Keywize use VoiceTrust and negotiation together to reduce hidden-fee risk and stay under budget.
