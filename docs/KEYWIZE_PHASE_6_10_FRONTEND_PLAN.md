# Keywize Phase 6-10 Frontend Implementation Plan

This file expands the Person 1 prompts into a concrete build checklist. It assumes Phase 0-5 already created the Next.js App Router project, shared types, mock data, ranking/risk logic, and API routes.

## Owner and edit boundaries

Person 1 owns frontend only.

Allowed edits:
- `keywize/app/page.tsx`
- `keywize/app/intake/page.tsx`
- `keywize/app/mission/[id]/page.tsx`
- `keywize/app/report/[id]/page.tsx`
- `keywize/app/demo/page.tsx`
- `keywize/components/ConfidenceWaveform.tsx`
- `keywize/components/VoiceTrustBadge.tsx`
- `keywize/components/NegotiationPlaybook.tsx`
- `keywize/lib/mockData.ts` only if UI needs display-friendly mock fields

Do not edit:
- `keywize/app/api/**`
- `keywize/lib/types.ts`
- `keywize/lib/riskScore.ts`
- `keywize/lib/ranking.ts`
- `keywize/lib/voiceTrust.ts`
- `keywize/voice/**`

## Shared frontend style rules

Use Tailwind only. Do not add UI libraries.

Visual direction:
- Background: warm off-white, preferably `bg-[#f7f5f0]` or `bg-[#fbfaf7]`
- Text: near-black, `text-[#111111]`
- Accent colors: mint/teal `#30a985`, soft pink for VoiceTrust alerts
- Typography: huge serif hero headline using `font-serif`; body uses default/system sans
- Buttons: black rounded pills with white text; secondary buttons are outline pills
- Cards: large border radius, soft shadows, pale panels, lots of whitespace
- Layout: calm premium SaaS, not dark emergency dashboard

Recommended reusable class patterns:
- Page shell: `min-h-screen bg-[#f7f5f0] text-[#111111]`
- Section width: `mx-auto max-w-7xl px-6 py-10 lg:px-8`
- Pill button: `rounded-full bg-black px-6 py-3 text-sm font-semibold text-white`
- Card: `rounded-[2rem] border border-black/10 bg-white/70 p-6 shadow-sm`
- Accent chip: `rounded-full border border-black/10 bg-white px-4 py-2 text-sm shadow-sm`

## Files to create or update

Create/update these files during Phase 6-10:

```txt
keywize/
  app/
    page.tsx
    intake/
      page.tsx
    mission/
      [id]/
        page.tsx
    report/
      [id]/
        page.tsx
    demo/
      page.tsx
  components/
    ConfidenceWaveform.tsx
    VoiceTrustBadge.tsx
    NegotiationPlaybook.tsx
```

Optional only if needed:

```txt
keywize/lib/mockData.ts
```

## Shared components to create first

### `keywize/components/ConfidenceWaveform.tsx`

Purpose:
- Show a small decorative confidence waveform under transcript lines and VoiceTrust evidence.

Props:
- `score?: number`
- `tone?: "mint" | "pink" | "neutral"`
- `size?: "sm" | "md"`

Behavior:
- Render 12-18 rounded vertical bars.
- Bar opacity/height should loosely reflect `score`.
- Keep it purely visual; no audio logic.

### `keywize/components/VoiceTrustBadge.tsx`

Purpose:
- Show live trust status on mission and report pages.

Props:
- `level: "High" | "Medium" | "Low"`
- `label?: string`
- `score?: number`

Behavior:
- High uses mint styling.
- Medium uses amber/cream styling.
- Low uses soft pink styling.
- Include text such as `VoiceTrust live`, `Low confidence`, or `Hesitation detected`.

### `keywize/components/NegotiationPlaybook.tsx`

Purpose:
- Explain which negotiation strategy was used on the report page.

Props:
- `steps?: string[]`
- `result?: string`

Default content:
- Confirm all-in total.
- Ask no-drill-first question.
- Ask about dispatch/labor/parts/after-hours fees.
- Use best confirmed quote as leverage.
- Ask vendor to match price or include extra keys.

## Phase 6: Landing page

File:
- Update `keywize/app/page.tsx`

Build:
- Header with `Keywize` brand and nav links to `/intake`, `/demo`, and call CTA.
- Hero left column:
  - Eyebrow chip: `Anti-scam locksmith concierge`
  - Headline: `Locked out? Keywize gets you back in without getting played.`
  - Subtext from PRD: call once, compare locksmiths, detect hidden-fee risk, negotiate under budget, recommend safest deal.
  - Primary CTA: `Call Keywize`
  - Secondary CTA: `Start Online` linking to `/intake`
- Hero right column:
  - Large rounded phone/report mockup.
  - Mock live call card.
  - Floating chips:
    - `$145 all-in`
    - `No-drill first`
    - `ID verified`
    - Pink chip: `VoiceTrust hesitation detected`
  - Small mint stat card: `Risk down 68%`
- Trust strip below hero:
  - Badges such as `All-in price`, `No-drill first`, `Budget guardrail`, `Transcript evidence`
- Three stat cards:
  - `72% hidden-fee risk reduced`
  - `$20 negotiated savings`
  - `3 locksmiths called`

Acceptance checks:
- `/` renders without API dependency.
- CTAs point to call link and `/intake`.
- Page uses only Tailwind classes.

## Phase 7: Intake page

File:
- Create `keywize/app/intake/page.tsx`

Build:
- Mark as client component with `"use client"`.
- Create selectable case cards for:
  - Room key lost: `room_key_lost`
  - Key inside locked out: `key_inside_locked_out`
  - Main apartment key lost: `main_apartment_key_lost`
  - Key stolen: `key_stolen`
  - Broken key inside lock: `broken_key_inside_lock`
- Add form fields:
  - City: text input, maps to `locationCity`
  - Zip: text input, maps to `locationZip`
  - Door type: select, maps to `doorType`
  - Lock type: select, maps to `lockType`
  - Urgency: select, maps to `urgency`
  - Ideal price: number input, maps to `idealPrice`
  - Max price: number input, maps to `maxPrice`
  - Flexibility: select, maps to `budgetFlexibility`
  - New keys needed: number input, maps to `newKeysNeeded`
  - Authorization checkbox: checkbox, maps to `authorizationConfirmed`
- On submit:
  - Validate case type, city, zip, max price, and authorization.
  - POST JSON to `/api/intake`.
  - Read returned mission id from response.
  - Navigate to `/mission/[id]` with `useRouter().push(...)`.

Expected request shape:
- Match `JobSpec` fields from `keywize/lib/types.ts`.
- Fill derived booleans from selected case:
  - `keyStolen` true for `key_stolen`
  - `brokenKeyVisible` true for `broken_key_inside_lock`
  - `doorOpen` false for locked-out cases
  - `needRekey` true for stolen keys
  - `approvalRequiredAboveBudget` true

Acceptance checks:
- User cannot submit without authorization.
- Successful submit redirects to `/mission/<id>`.
- Error state is visible if API fails.

## Phase 8: Mission dashboard

File:
- Create `keywize/app/mission/[id]/page.tsx`

Build:
- Fetch mission from `/api/missions/[id]`.
- Use a client component if using refresh button state.
- Show progress steps:
  - Intake complete
  - Finding locksmiths
  - Calling vendor A
  - Calling vendor B
  - Calling vendor C
  - Negotiating
  - Recommendation ready
- Show job spec card:
  - Case type
  - City/zip
  - Door type
  - Lock type
  - Urgency
  - Ideal price and max price
  - New keys needed
- Show call log:
  - Timeline rows from `mission.callLog`
  - Transcript snippets if available
  - Add `ConfidenceWaveform` under transcript lines
- Show quote cards as they appear:
  - Vendor name
  - Total estimate
  - ETA
  - Risk level
  - Drilling policy
  - ID required
  - VoiceTrust score/badge
- Show `VoiceTrustBadge` near the live activity area.
- Add `Trigger negotiation` button:
  - POST to `/api/negotiate` with mission id.
  - Refresh mission data after success.
- Add link/button to `/report/[id]` when recommendation is ready.

Acceptance checks:
- Loading, error, and success states exist.
- Negotiation button updates the displayed Vendor C quote or terms after refresh.
- Dashboard stays readable on mobile.

## Phase 9: Final report

File:
- Create `keywize/app/report/[id]/page.tsx`

Build:
- Fetch mission from `/api/missions/[id]`.
- Show polished emergency report layout:
  - Header: `Keywize emergency report`
  - Recommended vendor hero card
  - Total estimate, ETA, risk level, and recommendation reasons
- Ranked quote table:
  - Rank
  - Vendor
  - Total
  - ETA
  - Risk
  - All-in confirmed
  - ID required
  - No-drill policy
- Risk badges:
  - Hidden fees
  - Starts-at pricing
  - Drilling risk
  - Low VoiceTrust confidence
- Itemized fees:
  - Dispatch
  - Labor
  - Parts
  - After-hours
  - Taxes/other
  - Total estimate
- Transcript evidence:
  - Quote transcript snippets.
  - `ConfidenceWaveform` below each important line.
- VoiceTrust section:
  - Signals
  - Pause/filler/evasive phrases if available
  - Recommended push
- Include `NegotiationPlaybook`.
- Buttons:
  - `Approve`
  - `Call me`
  - `Negotiate again`
- `Negotiate again` should POST to `/api/negotiate` and refresh the report.

Acceptance checks:
- Recommended vendor is visually obvious.
- Table ranking matches API mission data order or recommendation field.
- Buttons render and `Negotiate again` works.

## Phase 10: Demo panel

File:
- Create `keywize/app/demo/page.tsx`

Build:
- Judge-focused control panel with a predictable sequence.
- Buttons:
  - `Start demo case`
  - `View mission dashboard`
  - `Trigger negotiation`
  - `View final report`
- Behavior:
  - `Start demo case` POSTs to `/api/intake` with a fixed demo job spec.
  - Store returned mission id in component state and optionally `localStorage`.
  - `View mission dashboard` navigates to `/mission/[id]`.
  - `Trigger negotiation` POSTs to `/api/negotiate` for that mission.
  - `View final report` navigates to `/report/[id]`.
- Vendor persona cards:
  - Bait-and-switch: starts at `$39`, vague total, drilling risk, hidden fees.
  - Honest local: `$130 all-in`, 30 minute ETA, no-drill first, ID required.
  - Premium fast: `$165` initially, 15 minute ETA, negotiates to `$145` or includes keys.
- Add a small demo script panel explaining what judges should see:
  - Intake creates mission.
  - Dashboard shows three vendor calls.
  - Negotiation improves Vendor C.
  - Report recommends safest best-value option with transcript evidence.

Acceptance checks:
- A fresh judge can run the demo from this page without manual IDs.
- All buttons are disabled or explain what is missing until a mission id exists.
- Demo routes connect cleanly to `/mission/[id]` and `/report/[id]`.

## Manual test checklist for Person 1

Run from `keywize/`:

```bash
npm run dev
```

Then verify:
- `/` shows premium bright SaaS landing page and links to `/intake`.
- `/intake` validates required fields and creates a mission.
- `/mission/[id]` fetches mission data and negotiation refresh works.
- `/report/[id]` shows recommendation, ranked quotes, risk/VoiceTrust evidence, and `Negotiate again` works.
- `/demo` can create a predictable demo mission and navigate through dashboard/report.

If available, also run:

```bash
npm run lint
```

## Definition of done

- All five pages exist and use Tailwind only.
- Shared frontend components exist and are reused where appropriate.
- Intake POSTs to `/api/intake` and navigates to mission page.
- Mission/report fetch from `/api/missions/[id]`.
- Negotiation actions POST to `/api/negotiate` and refresh UI.
- Demo page can run the predictable judge flow without editing URLs manually.
- No Person 2 or Person 3 files are modified except `lib/mockData.ts` if strictly needed for frontend display.
