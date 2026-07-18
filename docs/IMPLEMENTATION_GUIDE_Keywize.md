# Keywize Step-by-Step Implementation Guide

This guide is written so you can give tasks to Codex and follow the steps without thinking too much.

## Important rule
Do not let all 3 people edit the same files. Each person gets their own folder and API contract.

Recommended stack:
- Frontend: Next.js, React, Tailwind
- Backend: Next.js API routes or Express
- Data: JSON files first, then Supabase if time allows
- Voice: ElevenLabs agents
- Phone: Twilio inbound and outbound
- Demo calls: simulated vendors first, real Twilio later

## Website design direction
Use the screenshot reference style at `/var/folders/1m/kb3rf6c14bv4dczdq1_425m00000gn/T/TemporaryItems/NSIRD_screencaptureui_HXU9OL/Screenshot 2026-07-18 at 23.22.22.png`: clean luxury SaaS, bright background, oversized editorial typography, rounded cards, floating product mockups, and strong black pill CTAs. Do not make it look like a dark emergency dashboard. Make it feel premium, calm, and trustworthy.

Design rules:
- Background: warm off-white, `#f7f5f0` or `#fbfaf7`
- Text: near-black, `#111111`
- Accent: mint/teal, `#30a985`, plus soft pink for alert highlights
- Font feel: huge serif headline like Playfair Display, Cormorant Garamond, or Georgia fallback
- Body font: Inter or system sans
- Buttons: black rounded pills with white text, secondary outline pill
- Layout: lots of whitespace, large hero left, floating phone/report cards right
- Cards: rounded 24px, soft shadows, glassy off-white panels
- Trust strip: logos or badges under hero
- Stats blocks: three pale cards like "72% hidden-fee risk reduced", "$20 negotiated savings", "3 locksmiths called"

Hero copy:
- Brand: Keywize
- Headline: "Locked out? Keywize gets you back in without getting played."
- Subtext: "Call once. Keywize interviews you, calls locksmiths, detects hidden-fee risk, negotiates under your budget, and recommends the safest deal with transcript evidence."
- Primary CTA: "Call Keywize"
- Secondary CTA: "Start Online"

Hero visual:
- A large rounded phone mockup showing a live locksmith call
- Floating quote chips: "$145 all-in", "No-drill first", "ID verified"
- A pink alert chip: "VoiceTrust hesitation detected"
- A mint stat card: "Risk down 68%"
- A small transcript card showing the exact negotiation line

## Folder split
Create this structure:

```txt
keywize/
  app/
    page.tsx
    intake/page.tsx
    mission/[id]/page.tsx
    report/[id]/page.tsx
    demo/page.tsx
  components/
    ConfidenceWaveform.tsx
    VoiceTrustBadge.tsx
    NegotiationPlaybook.tsx
  lib/
    types.ts
    mockData.ts
    riskScore.ts
    voiceTrust.ts
    ranking.ts
  app/api/
    intake/route.ts
    missions/[id]/route.ts
    quotes/route.ts
    negotiate/route.ts
    voice-trust/route.ts
    twilio/inbound/route.ts
    elevenlabs/tools/route.ts
  voice/
    prompts/
      intake-agent.md
      caller-agent.md
      closer-agent.md
    vendor-personas/
      vendor-a-bait-switch.md
      vendor-b-honest.md
      vendor-c-premium.md
  docs/
```

## API contract everyone must follow
Put these types in `lib/types.ts` first. Nobody should change these unless all 3 agree.

## Standout feature: VoiceTrust
VoiceTrust is the judge-winning differentiator. Keywize does not claim to detect lies. It detects vocal uncertainty and hesitation around high-risk moments like price, hidden fees, drilling, and final confirmation. The signal feeds into the risk score and changes the next negotiation move.

For the MVP, implement the easy reliable version first:
- Pause length before answering money questions
- Filler words like "uh", "um", "well", "maybe"
- Evasive phrases like "starts at", "technician decides", "depends", "plus labor"
- Answer directness
- Optional audio fields for pitch variance and volume variance if available

Demo moment:
Keywize asks, "Are there any additional fees beyond the $145?"
Vendor pauses and says, "Uh, the technician will confirm on arrival."
Dashboard shows: "VoiceTrust Alert: Low confidence on hidden-fee question."
Keywize responds: "You paused there, so I want to make sure we are not missing anything. Is there any dispatch, drilling, after-hours, or parts fee not included in the $145?"


```ts
export type CaseType =
  | "room_key_lost"
  | "key_inside_locked_out"
  | "main_apartment_key_lost"
  | "key_stolen"
  | "broken_key_inside_lock";

export type JobSpec = {
  id: string;
  caseType: CaseType;
  urgency: "locked_out_now" | "today" | "scheduled";
  propertyType: "apartment" | "dorm" | "house";
  doorType: "room" | "main_entry" | "building_entry" | "storage";
  lockType: "deadbolt" | "knob" | "lever" | "smart_lock" | "unknown";
  doorOpen: boolean;
  keyStolen: boolean;
  brokenKeyVisible: boolean;
  needRekey: boolean;
  newKeysNeeded: number;
  idealPrice: number;
  maxPrice: number;
  budgetFlexibility: "strict" | "flexible_for_speed" | "flexible_for_rekey";
  approvalRequiredAboveBudget: boolean;
  authorizationConfirmed: boolean;
  locationCity: string;
  locationZip: string;
  createdAt: string;
};

export type VoiceTrustSignal = {
  id: string;
  quoteId: string;
  questionType: "price" | "hidden_fees" | "drilling" | "eta" | "final_confirmation";
  vendorText: string;
  pauseMs: number;
  fillerWords: string[];
  evasivePhrases: string[];
  speechRateChangePct?: number;
  pitchVariance?: number;
  volumeVariance?: number;
  confidenceScore: number;
  trustLevel: "High" | "Medium" | "Low";
  signals: string[];
  recommendedPush: string;
};

export type Quote = {
  id: string;
  missionId: string;
  vendorName: string;
  phone: string;
  etaMinutes: number | null;
  dispatchFee: number | null;
  laborFee: number | null;
  partsFee: number | null;
  afterHoursFee: number | null;
  taxesAndOther: number | null;
  totalEstimate: number | null;
  isTotalAllIn: boolean;
  drillingPolicy: string;
  idRequired: boolean | null;
  oldKeyDisabled: boolean | null;
  keysIncluded: number | null;
  warranty: string | null;
  quoteConfidence: "firm_before_arrival" | "starts_at" | "callback" | "declined";
  redFlags: string[];
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  transcriptEvidence: string[];
  transcript: string;
  priceOrTermsChanged: boolean;
  voiceTrustSignals: VoiceTrustSignal[];
  voiceTrustScore: number;
};
```

# Team split

## Person 1: Frontend owner
Only edits:
- `app/*`
- `components/*`
- `lib/mockData.ts` only if needed for UI display

Does not edit:
- API routes
- voice prompts
- Twilio files
- risk scoring logic

Deliverables:
1. Landing page
2. Intake page
3. Live mission dashboard
4. Final report page
5. Demo control panel

## Person 2: Backend and scoring owner
Only edits:
- `lib/types.ts`
- `lib/riskScore.ts`
- `lib/ranking.ts`
- `lib/voiceTrust.ts`
- `lib/mockData.ts`
- `app/api/intake/route.ts`
- `app/api/missions/[id]/route.ts`
- `app/api/quotes/route.ts`
- `app/api/negotiate/route.ts`
- `app/api/voice-trust/route.ts`

Does not edit:
- UI pages except if asked
- voice prompts
- Twilio files

Deliverables:
1. Store job spec
2. Return mission data
3. Generate or accept 3 quotes
4. Score risk
5. Rank vendors
6. Simulate negotiation where Vendor C changes price or terms
7. Implement VoiceTrust scoring for hesitation, filler words, evasive phrases, and confidence signals

## Person 3: Voice and Twilio owner
Only edits:
- `voice/*`
- `app/api/twilio/*`
- `app/api/elevenlabs/*`
- environment variable docs

Does not edit:
- frontend pages
- risk scoring
- ranking

Deliverables:
1. Intake agent prompt
2. Caller agent prompt
3. Closer agent prompt
4. Vendor persona prompts
5. Twilio inbound webhook stub
6. ElevenLabs tool endpoint stub
7. Add voice prompt instructions for VoiceTrust tool calls
8. If time, real Twilio call to agent

# Step-by-step build plan

## Phase 0: Create project
Prompt Codex:

```txt
Create a Next.js app called keywize using TypeScript and Tailwind. Use App Router. Add basic shadcn-style components manually if needed. Create the folder structure from the implementation guide. Do not add authentication. Keep everything simple and local-demo friendly.
```

Run:

```bash
npx create-next-app@latest keywize --typescript --tailwind --app
cd keywize
npm run dev
```

## Phase 1: Add shared types
Person 2 prompt:

```txt
Create lib/types.ts with the JobSpec and Quote types from the guide. Also create a Mission type that contains id, jobSpec, quotes, status, callLog, and recommendation. Do not touch UI files.
```

## Phase 2: Add mock data
Person 2 prompt:

```txt
Create lib/mockData.ts with one demo mission for a broken key inside a main apartment deadbolt. User is locked out now, max price is 150. Add 3 vendor quotes: Vendor A bait-and-switch, Vendor B honest local at 130 all-in, Vendor C premium fast starting at 165 then negotiated to 145. Include transcript evidence, red flags, VoiceTrust signals, and confidence scores.
```

## Phase 3: Add risk scoring
Person 2 prompt:

```txt
Create lib/riskScore.ts. Implement calculateRiskScore(quote) using these rules: starts_at +35, refuses itemized pricing +25, dispatch not confirmed +20, drilling before diagnosis +25, no invoice name +20, no ID required +15, no ETA +10, low VoiceTrust score +20. Return score capped at 100 and level Low 0-24, Medium 25-59, High 60-100.
```

## Phase 3B: Add VoiceTrust scoring
Person 2 prompt:

```txt
Create lib/voiceTrust.ts. Implement analyzeVoiceTrust(input) where input includes questionType, vendorText, pauseMs, optional pitchVariance, optional volumeVariance, and optional speechRateChangePct. Score confidence from 0 to 100. Lower confidence for pause over 1500ms on price or hidden_fees, filler words, evasive phrases, starts-at pricing, technician-decides language, and sudden speech-rate change. Return trustLevel High, Medium, or Low, signals array, and recommendedPush. Also create mock VoiceTrust signals for Vendor A, B, and C.
```

## Phase 4: Add ranking
Person 2 prompt:

```txt
Create lib/ranking.ts. Implement rankQuotes(quotes, jobSpec). Rank by risk first, then total price, then ETA. Disqualify declined quotes from recommendation. Prefer quotes under maxPrice. Return recommended quote and reasons in plain English.
```

## Phase 5: Add API routes
Person 2 prompt:

```txt
Create simple Next.js API routes for intake, mission fetch, quotes, and negotiate. Use in-memory storage or mockData. POST /api/intake creates a mission. GET /api/missions/[id] returns it. POST /api/negotiate updates Vendor C from 165 to 145 and marks priceOrTermsChanged true. Keep it demo reliable.
```

## Phase 6: Build landing page
Person 1 prompt:

```txt
Build the landing page for Keywize using the provided screenshot as the design reference. Use a premium bright SaaS style, not a dark emergency style. Off-white background, huge serif hero headline, black rounded pill buttons, lots of whitespace, rounded floating cards, and mint/pink accent chips. Headline: "Locked out? Keywize gets you back in without getting played." Add CTAs for Call Keywize and Start Online. On the right, create a large rounded phone/report mockup with floating chips: "$145 all-in", "No-drill first", "ID verified", and a pink "VoiceTrust hesitation detected" chip. Add a trust strip and three stat cards below the hero. Use Tailwind only.
```

## Phase 7: Build intake page
Person 1 prompt:

```txt
Build /intake page. Create selectable cards for 5 cases: room key lost, key inside locked out, main apartment key lost, key stolen, broken key inside lock. Add fields for city, zip, door type, lock type, urgency, ideal price, max price, flexibility, new keys needed, and authorization checkbox. On submit, POST to /api/intake and navigate to /mission/[id].
```

## Phase 8: Build mission dashboard
Person 1 prompt:

```txt
Build /mission/[id] page. Fetch mission from /api/missions/[id]. Show progress steps: intake complete, finding locksmiths, calling vendor A, calling vendor B, calling vendor C, negotiating, recommendation ready. Show job spec card, call log, quote cards as they appear, a VoiceTrust live badge, and a small confidence waveform under transcript lines. Add a button "Trigger negotiation" that POSTs to /api/negotiate then refreshes.
```

## Phase 9: Build final report
Person 1 prompt:

```txt
Build /report/[id] page. Fetch mission. Show recommended vendor, ranked quote table, risk badges, itemized fees, ETA, no-drill policy, ID required, transcript evidence, VoiceTrust signals, confidence waveform, negotiation playbook used, and buttons Approve, Call me, Negotiate again. Make it look like a polished emergency report.
```

## Phase 10: Build demo panel
Person 1 prompt:

```txt
Build /demo page for judges. Add buttons: Start demo case, View mission dashboard, Trigger negotiation, View final report. Add three vendor persona cards: bait-and-switch, honest local, premium fast. This page should make the demo predictable.
```

## Phase 11: Write voice prompts
Person 3 prompt:

```txt
Create voice/prompts/intake-agent.md, caller-agent.md, and closer-agent.md. The intake agent gathers the JobSpec. The caller agent calls locksmiths and asks anti-scam questions. The closer agent negotiates using only real quotes and produces final recommendation. Include honesty rules: never invent quotes, disclose AI if asked, never misrepresent authorization.
```

## Phase 12: Write vendor personas
Person 3 prompt:

```txt
Create three vendor persona prompt files. Vendor A is bait-and-switch, says starts at 39, refuses total, vague drilling policy. Vendor B is honest local, 130 all-in, 30 minute ETA, no-drill first, ID required. Vendor C is premium fast, initially 165, 15 minute ETA, can negotiate to 145 or include 2 keys if presented with Vendor B quote.
```

## Phase 13: Add Twilio inbound stub
Person 3 prompt:

```txt
Create app/api/twilio/inbound/route.ts. It should return TwiML that says: "Thanks for calling Keywize. We will connect you to our lockout intake agent." Then add placeholder comments showing where ElevenLabs or media stream connection goes. Also create docs/TWILIO_SETUP.md with steps to buy a Twilio number and set the webhook URL.
```

## Phase 14: Add ElevenLabs tool endpoint stub
Person 3 prompt:

```txt
Create app/api/elevenlabs/tools/route.ts. It should accept JSON tool calls for create_job_spec, save_quote, analyze_voice_trust, classify_vendor_tone, and update_negotiation. For now, log the body and return success JSON. Document how the ElevenLabs agent would call this endpoint.
```

## Phase 14B: Add VoiceTrust UI components
Person 1 prompt:

```txt
Create components/VoiceTrustBadge.tsx and components/ConfidenceWaveform.tsx. VoiceTrustBadge shows trust level High, Medium, or Low with mint, yellow, or pink styling. ConfidenceWaveform renders 12 rounded bars whose heights come from confidence score and signal severity. Use it under transcript snippets. Also create components/NegotiationPlaybook.tsx to show tactics used: best ETA compliment, one-blocker framing, real competing quote anchor, book-now trade, confirmation lock.
```

## Phase 15: Connect pages together
All people pause. One person integrates.

Prompt Codex:

```txt
Connect the complete demo flow: landing to intake, intake creates mission, mission shows mock vendor calls, negotiation updates Vendor C, report shows final ranking. Fix TypeScript errors. Do not change the voice prompt files.
```

## Phase 16: Final polish checklist
- Landing page looks trustworthy
- Intake form works
- Max price is visible everywhere
- Vendor A is clearly high risk
- Vendor C visibly changes from 165 to 145
- Final report cites transcript snippets
- No fake quote is used
- Risk score is explained
- VoiceTrust alert appears on the hidden-fee answer
- Confidence waveform is visible under transcript evidence
- Demo can be completed in under 3 minutes

# Demo script

1. Open landing page.
2. Say: "The user is locked out with a broken key inside the deadbolt. They have a max budget of $150."
3. Fill intake.
4. Show dashboard calling vendors.
5. Show Vendor A says starts at $39 and gets high risk.
6. Show Vendor B gives $130 all-in.
7. Show Vendor C gives $165 but faster ETA.
8. Show VoiceTrust detecting hesitation on hidden-fee answer.
9. Click Trigger negotiation.
10. Show Vendor C drops to $145 or includes keys.
11. Open report.
12. Say: "The recommendation is not just cheapest. It balances price, ETA, no-drill first, ID verification, and risk."

# If Twilio works
Say:
"The user can call our Twilio number without internet. Twilio connects them to the Keywize intake agent. The same structured job spec powers the web demo and phone demo."

# If Twilio does not work
Say:
"We stubbed the Twilio webhook and focused the live demo on the full negotiation loop. The architecture is ready for production telephony."
