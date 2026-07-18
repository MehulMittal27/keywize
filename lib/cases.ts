import type { CaseDefinition } from "./types";

/**
 * Case definitions aligned to the product schema:
 *
 * Case 1: room_key_lost          — make new key or replace interior lock
 * Case 2: key_inside_locked_out  — non-destructive unlock, no drilling first
 * Case 3: main_apartment_key_lost — rekey or replace main lock, multiple keys
 * Case 4: key_stolen             — immediate rekey, old key must stop working
 * Case 5: broken_key_inside_lock — extract broken piece before drilling/replace
 */

export const CASE_DEFINITIONS: CaseDefinition[] = [
  // ─── 1. Room key lost ───────────────────────────────────────────────────────
  {
    caseType: "room_key_lost",
    label: "Room Key Lost",
    description: "You lost the key to a room door. Usually simple — new key or rekey the interior lock.",
    quoteLineItems: [
      "service call fee",
      "labor",
      "new key",
      "replacement knob or lock (if needed)",
    ],
    redFlags: [
      "Insists on replacing the lock without attempting a rekey",
      "Refuses to confirm total out-the-door price before arrival",
    ],
    negotiationGoals: [
      "Ask if they can rekey instead of replacing — it's cheaper",
      "Get the total out-the-door price including service call, labor, and key",
      "If replacing hardware, ask for the knob/lock cost separately",
    ],
    vendorQuestions: [
      "Can you rekey the existing lock instead of replacing it?",
      "What is the all-in price including service call fee, labor, and one new key?",
      "Is there a separate charge for the replacement knob or lock if needed?",
      "Is there an emergency or after-hours fee?",
    ],
    extraRequiredFields: ["needRekey", "newKeysNeeded"],
  },

  // ─── 2. Key inside — locked out ─────────────────────────────────────────────
  {
    caseType: "key_inside_locked_out",
    label: "Key Inside — Locked Out",
    description: "You are locked out and the key is inside. Non-destructive unlock should be possible.",
    quoteLineItems: [
      "dispatch fee",
      "unlock labor",
      "after-hours fee (if applicable)",
    ],
    redFlags: [
      "Insists on drilling before seeing the lock",
      "Refuses to give a price range over the phone",
      "Cannot confirm non-destructive entry will be attempted first",
      "No dispatch fee disclosed upfront",
    ],
    negotiationGoals: [
      "Confirm non-destructive entry before any drilling",
      "Get the dispatch fee confirmed before they arrive",
      "Ask if after-hours fees apply and the exact amount",
      "Get total if non-destructive entry succeeds",
    ],
    vendorQuestions: [
      "Can you guarantee no drilling unless the lock is confirmed damaged?",
      "What is your dispatch fee?",
      "What is the total if you open it non-destructively?",
      "Are there after-hours fees? What is the exact amount?",
      "What is your ETA?",
    ],
    extraRequiredFields: [],
  },

  // ─── 3. Main apartment key lost ──────────────────────────────────────────────
  {
    caseType: "main_apartment_key_lost",
    label: "Main Apartment Key Lost",
    description: "You lost the key to your main apartment door. May need rekey, new cylinder, or smart lock update.",
    quoteLineItems: [
      "lockout opening fee (if locked out)",
      "rekey fee",
      "new cylinder or lock (if replaced)",
      "duplicate keys (cost per additional key)",
      "emergency or after-hours fee",
    ],
    redFlags: [
      "Cannot confirm number of new keys included",
      "Refuses itemized pricing",
      "Pushes full lock replacement without explaining why rekey won't work",
    ],
    negotiationGoals: [
      "Get itemized quote: opening fee, rekey fee, cylinder/lock cost, per-key cost",
      "Ask how many duplicate keys are included in the base price",
      "If smart lock: confirm keypad code is changed and old access is disabled",
      "Confirm same-day service if urgency is locked out now",
      "Push to include at least 2 duplicate keys in the base price",
    ],
    vendorQuestions: [
      "What is the rekey fee, and does it include a new cylinder?",
      "How many duplicate keys are included in the quoted price?",
      "What is the cost per additional key?",
      "If it is a smart lock, will you update the keypad code and disable old access?",
      "Is there an emergency or after-hours surcharge?",
      "Can you confirm same-day service?",
    ],
    extraRequiredFields: ["needRekey", "newKeysNeeded"],
  },

  // ─── 4. Key stolen ───────────────────────────────────────────────────────────
  {
    caseType: "key_stolen",
    label: "Key Stolen",
    description: "Your key was stolen. Someone may know the address. Immediate rekey is critical — different from lost key.",
    quoteLineItems: [
      "rekey fee",
      "duplicate keys",
      "emergency same-day fee",
      "new cylinder if needed",
    ],
    redFlags: [
      "Cannot confirm same-day rekey",
      "Cannot confirm old key stops working after rekey",
      "Refuses to say how many key copies are included",
      "No ID verification required — security risk",
    ],
    negotiationGoals: [
      "Stress urgency: key was stolen, rekey must happen today",
      "Ask explicitly: does rekeying make the stolen key completely useless?",
      "Ask how many key copies are included, push for at least 2",
      "If they cannot do same-day, find someone who can",
      "Confirm ID verification is required before rekeying",
    ],
    vendorQuestions: [
      "Can you do a same-day rekey today?",
      "After rekeying, will the stolen key be completely unable to open the lock?",
      "How many new key copies are included in the price?",
      "What is the cost for additional copies?",
      "Do you require ID and proof of residence before rekeying?",
      "Is there an emergency or same-day surcharge?",
    ],
    extraRequiredFields: ["needRekey"],
  },

  // ─── 5. Broken key inside lock ───────────────────────────────────────────────
  {
    caseType: "broken_key_inside_lock",
    label: "Broken Key Inside Lock",
    description: "A key broke and is stuck inside the lock. Extraction should be attempted before drilling or replacing.",
    quoteLineItems: [
      "key extraction",
      "lock inspection",
      "replacement key (if needed)",
      "service call",
    ],
    redFlags: [
      "Jumps to drilling without attempting extraction first",
      "Pushes full lock replacement before even inspecting",
    ],
    negotiationGoals: [
      "Confirm extraction attempt before any drilling or replacement",
      "Get all-in price for extraction plus replacement key",
      "Ask what happens if the lock is damaged during extraction",
    ],
    vendorQuestions: [
      "Will you attempt to extract the broken key before drilling?",
      "What is your total price if extraction succeeds without drilling?",
      "What happens if the lock is damaged during extraction?",
      "Is a replacement key included in the price?",
      "Is there an emergency or after-hours surcharge?",
    ],
    extraRequiredFields: ["brokenKeyVisible"],
  },
];

export const CASE_REGISTRY: Record<string, CaseDefinition> = Object.fromEntries(
  CASE_DEFINITIONS.map((c) => [c.caseType, c])
);
