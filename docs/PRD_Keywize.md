# Product Requirements Document: Keywize

## 1. Product name
Keywize

## 2. One-line pitch
Locked out? Call once. Keywize calls locksmiths, compares real all-in prices, negotiates under your budget, and protects you from bait-and-switch scams.

## 3. Problem
People who are locked out or have lost keys are stressed and usually call the first locksmith they find. Locksmith pricing is often unclear. A phone quote may start at $39, but the final bill can become $250 or more after dispatch fees, labor, drilling, parts, after-hours fees, and tax. Customers do not know which services they actually need, and they do not know which questions to ask.

## 4. Target users
- Renters locked out of an apartment or room
- Students in dorms or shared housing
- Roommates who need new keys
- Tenants whose keys were stolen
- People with a broken key stuck inside the lock

## 5. Supported MVP cases
1. Room door key lost
2. Key inside room and locked out
3. Main apartment key lost
4. Key stolen
5. Broken key inside lock

## 6. Core promise
Keywize will:
- Understand the user's lock problem through voice or web intake
- Ask for max budget and urgency
- Confirm the user is authorized to request locksmith service
- Call at least 3 locksmiths or simulated locksmiths
- Ask protective anti-scam questions
- Capture itemized quotes in a structured format
- Use real competing quotes to negotiate price or terms
- Rank vendors by price, ETA, risk, and evidence
- Recommend the safest best-value option

## 7. Differentiation
This is not a generic quote comparison tool. It is an emergency anti-scam negotiator.

Unique features:
- Bait-and-switch risk score
- No-drill-first verification
- Max budget guardrail
- Authorization and proof-of-residence reminder
- Transcript-backed recommendation
- Terms negotiation, not only price negotiation
- Phone-first experience through Twilio, so the user can call without internet

## 8. User journey
### Step 1: User starts
User either calls the Twilio number or opens the website.

### Step 2: Intake
The agent asks:
- What happened?
- Are you locked out right now?
- Is this a room door or main apartment door?
- Is the key lost, stolen, inside, or broken?
- What kind of lock is it?
- What is your ideal price?
- What is your maximum all-in price before approval is needed?
- Can you show proof that you live there or are authorized?

### Step 3: Job spec creation
The system creates a single structured job spec and reuses it in every call.

### Step 4: Vendor calls
The agent calls 3 vendors or 3 simulated vendors. It asks for all-in pricing, itemized fees, ETA, drilling policy, ID requirement, warranty, and included keys.

### Step 5: Negotiation
After receiving quotes, the agent uses the best real quote as leverage. Example: "I have another confirmed quote at $130 all-in with no-drill first. Can you match that or include two keys?"

### Step 6: Report
The user sees or receives a ranked recommendation with transcript evidence.

## 9. Required product screens
### Landing page
Purpose: explain product and start user flow.

Must include:
- Headline: Locked out? Do not get scammed.
- CTA: Call Keywize
- CTA: Start online intake
- Benefits: all-in price, no-drill first, budget guardrail, transcript evidence

### Intake page
Purpose: collect the job spec.

Must include:
- Case type cards
- Location
- Door type
- Lock type
- Urgency
- Ideal price
- Max price
- Budget flexibility
- Authorization confirmation

### Live mission dashboard
Purpose: show progress while calls happen.

Must include:
- Intake complete
- Calling Vendor A
- Calling Vendor B
- Calling Vendor C
- Negotiating
- Recommendation ready
- Job spec card
- Live call log

### Final report page
Purpose: show ranked quotes and recommendation.

Must include:
- Recommended vendor
- Ranked table
- Total price
- ETA
- Risk level
- Red flags
- Transcript snippets
- Approve, call me, negotiate again buttons

### Demo control panel
Purpose: make hackathon demo reliable.

Must include:
- Start demo case
- Simulate Vendor A: bait-and-switch
- Simulate Vendor B: honest local
- Simulate Vendor C: premium fast
- Trigger negotiation
- Generate final report

## 10. Structured data schemas
### Job spec
```json
{
  "case_type": "broken_key_inside_lock",
  "urgency": "locked_out_now",
  "property_type": "apartment",
  "door_type": "main_entry",
  "lock_type": "deadbolt",
  "door_open": false,
  "key_stolen": false,
  "broken_key_visible": true,
  "need_rekey": false,
  "new_keys_needed": 2,
  "ideal_price": 100,
  "max_price": 150,
  "budget_flexibility": "strict",
  "approval_required_above_budget": true,
  "authorization_confirmed": true,
  "location_city": "San Francisco",
  "location_zip": "94103"
}
```

### Quote
```json
{
  "vendor_name": "SafeLock Local",
  "phone": "+14155550123",
  "eta_minutes": 25,
  "dispatch_fee": 25,
  "labor_fee": 100,
  "parts_fee": 0,
  "after_hours_fee": 20,
  "taxes_and_other": 0,
  "total_estimate": 145,
  "is_total_all_in": true,
  "drilling_policy": "no drilling unless lock is damaged",
  "id_required": true,
  "old_key_disabled": null,
  "keys_included": 0,
  "warranty": "30 days",
  "quote_confidence": "firm_before_arrival",
  "red_flags": [],
  "risk_score": 18,
  "risk_level": "Low",
  "transcript_evidence": ["$145 total", "no drilling unless damaged", "ETA 25 minutes"]
}
```

## 11. Risk scoring rules
Start with 0 risk points. Add points:
- Says "starts at" without giving total: +35
- Refuses itemized pricing: +25
- Refuses to confirm dispatch fee: +20
- Mentions drilling before diagnosis: +25
- Refuses company name or invoice name: +20
- Does not require proof of residence: +15
- Quote is more than 40 percent below median: +20
- Quote is more than 50 percent above median: +10
- Cannot provide ETA: +10

Risk levels:
- 0 to 24: Low
- 25 to 59: Medium
- 60 to 100: High

## 12. Agent behavior rules
The agent must:
- Never invent a competing quote
- Never lie about the job
- Never claim the user owns the property unless the user confirmed authorization
- Disclose it is an AI if asked
- Ask for total all-in price before sharing the user's max budget
- End every call with a structured outcome
- Push for non-destructive opening first
- Ask for confirmation before accepting anything above the user's max price

## 13. Anti-scam call script
The caller agent should ask:
1. Can you give the total out-the-door estimate including dispatch, labor, parts, after-hours, tax, and any other fees?
2. Is the dispatch fee included in that total?
3. Will you attempt non-destructive entry before drilling?
4. Under what condition would drilling be required?
5. Will the technician call before starting if the price changes?
6. What is the ETA?
7. Do you require ID or proof of residence before opening?
8. What company name will appear on the invoice?
9. Are any keys included?
10. Is there a warranty?

## 14. MVP success criteria
- User can complete web intake
- User can enter ideal price and max price
- System creates a structured job spec
- Demo calls or simulated calls produce 3 structured quotes
- At least one vendor changes price or terms because of another real quote
- Final report ranks all vendors
- Final report cites transcript evidence
- Risk score flags bait-and-switch behavior
- Twilio inbound call path is at least stubbed or connected if time allows

## 15. Hackathon demo story
Demo case: broken key inside main apartment deadbolt, user locked out, max budget $150.

Vendor A: Cheap bait-and-switch
- Says starts at $39
- Refuses all-in total
- No clear drilling policy
- Risk: High

Vendor B: Honest local
- $130 all-in
- 30 minute ETA
- No-drill first
- ID required
- Risk: Low

Vendor C: Premium fast
- Starts at $165
- 15 minute ETA
- After negotiation, drops to $145 or includes 2 keys
- Risk: Low or Medium

Winning moment:
The agent says: "I have another confirmed quote at $130 all-in with no-drill first. You are faster. Can you get to $145 all-in or include two keys?"
