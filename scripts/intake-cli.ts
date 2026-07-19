#!/usr/bin/env npx tsx
/**
 * Keywize — Terminal Intake CLI
 *
 * Walks through the lockout intake questions, builds a JobSpec,
 * then fires an ElevenLabs outbound call.
 *
 * Questions are scoped to what each case actually needs —
 * no irrelevant fields like door type when all you need is a new key.
 *
 * Usage:
 *   npx tsx scripts/intake-cli.ts
 *   npm run intake
 *
 * Requires in .env.local:
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_AGENT_ID
 *   ELEVENLABS_AGENT_PHONE_NUMBER_ID
 */

import * as readline from "readline";
import * as path from "path";
import * as fs from "fs";
import { randomUUID } from "crypto";

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type CaseType =
  | "room_key_lost"
  | "key_inside_locked_out"
  | "main_apartment_key_lost"
  | "key_stolen"
  | "broken_key_inside_lock";

type JobSpec = {
  id: string;
  caseType: CaseType;
  urgency: string;
  propertyType: string;
  doorType: string;
  lockType: string;
  doorOpen: boolean;
  keyStolen: boolean;
  brokenKeyVisible: boolean;
  needRekey: boolean;
  newKeysNeeded: number;
  idealPrice: number;
  maxPrice: number;
  budgetFlexibility: string;
  approvalRequiredAboveBudget: boolean;
  authorizationConfirmed: boolean;
  locationCity: string;
  locationZip: string;
  createdAt: string;
};

// ─── Case definitions (mirrors lib/cases.ts) ──────────────────────────────────
const CASES: Record<CaseType, {
  label: string;
  vendorQuestions: string[];
  negotiationGoals: string[];
  redFlags: string[];
}> = {
  room_key_lost: {
    label: "Room Key Lost",
    vendorQuestions: [
      "Can you rekey instead of replacing?",
      "All-in price including service call, labor, and one new key?",
      "Separate charge for replacement knob if needed?",
      "Emergency or after-hours fee?",
    ],
    negotiationGoals: [
      "Rekey instead of replace — cheaper",
      "Total out-the-door price including service call and key",
    ],
    redFlags: [
      "Insists on replacing lock without trying rekey",
      "Refuses to confirm total before arrival",
    ],
  },
  key_inside_locked_out: {
    label: "Key Inside — Locked Out",
    vendorQuestions: [
      "No drilling unless lock is confirmed damaged?",
      "What is your dispatch fee?",
      "Total if non-destructive entry succeeds?",
      "After-hours fee and exact amount?",
      "ETA?",
    ],
    negotiationGoals: [
      "Non-destructive entry before any drilling",
      "Dispatch fee confirmed before arrival",
      "All-in total including after-hours",
    ],
    redFlags: [
      "Drilling before seeing the lock",
      "Refuses price range over the phone",
      "No dispatch fee disclosed",
    ],
  },
  main_apartment_key_lost: {
    label: "Main Apartment Key Lost",
    vendorQuestions: [
      "Rekey fee and does it include a new cylinder?",
      "How many duplicate keys included in the price?",
      "Cost per additional key?",
      "Smart lock: will you update the code and disable old access?",
      "Emergency or after-hours surcharge?",
      "Same-day service confirmed?",
    ],
    negotiationGoals: [
      "Itemized quote: rekey, cylinder, per-key cost",
      "At least 2 duplicate keys in base price",
      "Same-day service if locked out now",
    ],
    redFlags: [
      "Cannot confirm number of keys included",
      "Refuses itemized pricing",
      "Pushes full replacement without explaining why rekey won't work",
    ],
  },
  key_stolen: {
    label: "Key Stolen",
    vendorQuestions: [
      "Same-day rekey available today?",
      "Stolen key completely unable to open lock after rekey?",
      "How many new key copies included?",
      "Cost per additional copy?",
      "ID and proof of residence required?",
      "Emergency or same-day surcharge?",
    ],
    negotiationGoals: [
      "Same-day rekey — key stolen, cannot wait",
      "Old key confirmed useless after rekey",
      "At least 2 copies included",
    ],
    redFlags: [
      "No same-day rekey available",
      "Cannot confirm old key stops working",
      "No ID verification — security risk",
    ],
  },
  broken_key_inside_lock: {
    label: "Broken Key Inside Lock",
    vendorQuestions: [
      "Extraction before drilling?",
      "Total price if extraction succeeds?",
      "What if lock is damaged during extraction?",
      "Replacement key included?",
      "Emergency or after-hours surcharge?",
    ],
    negotiationGoals: [
      "Extraction before any drilling or replacement",
      "All-in price for extraction + replacement key",
    ],
    redFlags: [
      "Drilling without trying extraction first",
      "Pushes full lock replacement before inspecting",
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function askChoice<T extends string>(
  question: string,
  choices: { key: string; label: string; value: T }[]
): Promise<T> {
  return new Promise((resolve) => {
    const list = choices.map((c) => `  ${c.key}) ${c.label}`).join("\n");
    rl.question(`${question}\n${list}\n→ `, (raw) => {
      const found = choices.find((c) => c.key === raw.trim().toLowerCase());
      if (found) return resolve(found.value);
      console.log(`  ⚠  Invalid — defaulting to ${choices[0].label}.`);
      resolve(choices[0].value);
    });
  });
}

async function askYesNo(question: string): Promise<boolean> {
  const a = await ask(`${question} (y/n) → `);
  return a.toLowerCase().startsWith("y");
}

async function askNumber(question: string, fallback: number): Promise<number> {
  const raw = await ask(`${question} → $`);
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? fallback : n;
}

const dim  = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;

// ─── Dynamic vars for ElevenLabs ──────────────────────────────────────────────
function buildDynamicVars(jobSpec: JobSpec, extras: Record<string, string> = {}): Record<string, string> {
  const info = CASES[jobSpec.caseType];
  return {
    case_type:          jobSpec.caseType,
    case_label:         info.label,
    urgency:            jobSpec.urgency,
    location:           `${jobSpec.locationCity}, ${jobSpec.locationZip}`,
    ideal_price:        String(jobSpec.idealPrice),
    max_price:          String(jobSpec.maxPrice),
    budget_flexibility: jobSpec.budgetFlexibility,
    need_rekey:         String(jobSpec.needRekey),
    new_keys_needed:    String(jobSpec.newKeysNeeded),
    key_stolen:         String(jobSpec.keyStolen),
    negotiation_goals:  info.negotiationGoals.join("; "),
    vendor_questions:   info.vendorQuestions.join("; "),
    red_flags_to_watch: info.redFlags.join("; "),
    ...extras,
  };
}

// ─── ElevenLabs call ──────────────────────────────────────────────────────────
async function fireElevenLabsCall(jobSpec: JobSpec, toNumber: string, extras: Record<string, string> = {}): Promise<void> {
  const apiKey      = process.env.ELEVENLABS_API_KEY;
  const agentId     = process.env.ELEVENLABS_AGENT_ID;
  const phoneNumId  = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;

  if (!apiKey || !agentId || !phoneNumId) {
    console.log(yellow("\n⚠  ElevenLabs env vars not set. Payload that would be sent:\n"));
    console.log(dim(JSON.stringify({
      agent_id: agentId ?? "ELEVENLABS_AGENT_ID",
      agent_phone_number_id: phoneNumId ?? "ELEVENLABS_AGENT_PHONE_NUMBER_ID",
      to_number: toNumber,
      conversation_initiation_client_data: { dynamic_variables: buildDynamicVars(jobSpec, extras) },
    }, null, 2)));
    return;
  }

  // Disable SSL verification for local dev (handles corporate/VPN cert issues)
  // Remove this in production
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  console.log(cyan("\n📞 Initiating ElevenLabs outbound call…"));
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: phoneNumId,
        to_number: toNumber,
        conversation_initiation_client_data: { dynamic_variables: buildDynamicVars(jobSpec, extras) },
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    if (res.ok) {
      console.log(green("\n✅ Call initiated!"));
      console.log(`   Conversation ID : ${data.conversation_id ?? "—"}`);
      console.log(`   Call SID        : ${data.call_sid ?? "—"}`);
    } else {
      console.log(red(`\n✗ ElevenLabs returned ${res.status}:`));
      console.log(dim(JSON.stringify(data, null, 2)));
    }
  } catch (err) {
    console.log(red(`\n✗ Network error: ${String(err)}`));
  } finally {
    // Restore default SSL behavior
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  }
}

// ─── Main intake flow ─────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(bold("\n🔑  KEYWIZE — Lockout Intake CLI\n"));
  console.log(dim("Answer each question. Press Enter to confirm.\n"));
  console.log("─".repeat(50));

  // ── Authorization check (required) ──────────────────────────────────────────
  console.log("\n" + bold("SAFETY CHECK"));
  const authOk = await askYesNo(
    "Are you authorized to request locksmith service at this address?\n  (Tenant, resident, or written permission required)"
  );
  if (!authOk) {
    console.log(red("\n✗ Cannot proceed without authorization. Exiting.\n"));
    rl.close();
    process.exit(1);
  }

  // ── Case type ────────────────────────────────────────────────────────────────
  console.log("\n" + bold("WHAT HAPPENED?"));
  const caseType = await askChoice<CaseType>("Select your case:", [
    { key: "1", label: "Room key lost",             value: "room_key_lost" },
    { key: "2", label: "Key inside — locked out",   value: "key_inside_locked_out" },
    { key: "3", label: "Main apartment key lost",   value: "main_apartment_key_lost" },
    { key: "4", label: "Key stolen",                value: "key_stolen" },
    { key: "5", label: "Broken key inside lock",    value: "broken_key_inside_lock" },
  ]);

  // ── Urgency ──────────────────────────────────────────────────────────────────
  console.log("\n" + bold("URGENCY"));
  const urgency = await askChoice("How urgent is this?", [
    { key: "1", label: "Locked out right now",  value: "locked_out_now" },
    { key: "2", label: "Need it today",         value: "today" },
    { key: "3", label: "Can schedule",          value: "scheduled" },
  ]);

  // ── Case-specific questions (only what's relevant) ───────────────────────────
  let keyStolen       = false;
  let brokenKeyVisible = false;
  let needRekey       = false;
  let newKeysNeeded   = 1;

  console.log("\n" + bold("CASE DETAILS"));

  if (caseType === "key_stolen") {
    keyStolen = true;
    needRekey = true;
    console.log(yellow("⚠  Key stolen — same-day rekey is required to disable the stolen key."));
    const rawKeys = await ask("How many new keys do you need? → ");
    newKeysNeeded = parseInt(rawKeys) || 1;
  }

  if (caseType === "room_key_lost") {
    needRekey = await askYesNo("Do you want the lock rekeyed so the lost key no longer works?");
    const rawKeys = await ask("How many new keys do you need? → ");
    newKeysNeeded = parseInt(rawKeys) || 1;
  }

  if (caseType === "main_apartment_key_lost") {
    needRekey = await askYesNo("Do you want the lock rekeyed (so the lost key no longer works)?");
    const rawKeys = await ask("How many new keys do you need? → ");
    newKeysNeeded = parseInt(rawKeys) || 1;
  }

  if (caseType === "broken_key_inside_lock") {
    brokenKeyVisible = await askYesNo("Is the broken piece of the key visible or accessible in the lock?");
  }

  // ── Case 2: which room/door is locked ────────────────────────────────────────
  let lockedDoor = "";
  if (caseType === "key_inside_locked_out") {
    lockedDoor = await askChoice("Which door are you locked out of?", [
      { key: "1", label: "Bedroom / room door",        value: "bedroom" },
      { key: "2", label: "Main apartment front door",  value: "apartment_front" },
      { key: "3", label: "Bathroom",                   value: "bathroom" },
      { key: "4", label: "Building entry door",        value: "building_entry" },
      { key: "5", label: "Storage / utility room",     value: "storage" },
    ]);
  }

  // ── Budget ───────────────────────────────────────────────────────────────────
  console.log("\n" + bold("BUDGET"));
  const idealPrice = await askNumber("Ideal all-in price?", 100);
  const maxPrice   = await askNumber("Maximum you will pay before needing approval?", 150);

  const budgetFlexibility = await askChoice("Budget flexibility:", [
    { key: "1", label: "Strict — do not exceed max",          value: "strict" },
    { key: "2", label: "Flexible if they are faster",         value: "flexible_for_speed" },
    { key: "3", label: "Flexible for better service/rekey",   value: "flexible_for_rekey" },
  ]);

  // ── Location ─────────────────────────────────────────────────────────────────
  console.log("\n" + bold("LOCATION"));
  const locationCity = await ask("City → ");
  const locationZip  = await ask("Zip code → ");

  // ── ElevenLabs outbound call ──────────────────────────────────────────────────
  console.log("\n" + bold("CALL"));
  const toNumber = await ask(
    "Phone number to call (E.164, e.g. +14155550100)\n  Leave blank to skip → "
  );

  // ── Build JobSpec ─────────────────────────────────────────────────────────────
  const jobSpec: JobSpec = {
    id: randomUUID(),
    caseType,
    urgency,
    // Map lockedDoor to doorType for the JobSpec
    propertyType: "apartment",
    doorType: caseType === "room_key_lost" ? "room"
            : caseType === "key_inside_locked_out" && lockedDoor === "bedroom" ? "room"
            : caseType === "key_inside_locked_out" && lockedDoor === "building_entry" ? "building_entry"
            : caseType === "key_inside_locked_out" && lockedDoor === "storage" ? "storage"
            : "main_entry",
    lockType: "unknown",
    doorOpen: false,
    keyStolen,
    brokenKeyVisible,
    needRekey,
    newKeysNeeded,
    idealPrice,
    maxPrice,
    budgetFlexibility,
    approvalRequiredAboveBudget: true,
    authorizationConfirmed: true,
    locationCity: locationCity || "Unknown",
    locationZip:  locationZip  || "00000",
    createdAt: new Date().toISOString(),
  };

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log(bold("\n📋  JOB SPEC\n"));
  console.log(`  Case          : ${green(CASES[caseType].label)}`);
  console.log(`  Urgency       : ${jobSpec.urgency}`);
  console.log(`  Location      : ${jobSpec.locationCity}, ${jobSpec.locationZip}`);
  console.log(`  Ideal price   : $${jobSpec.idealPrice}`);
  console.log(`  Max price     : $${jobSpec.maxPrice}  (${jobSpec.budgetFlexibility})`);
  if (needRekey)       console.log(`  Rekey         : yes`);
  if (newKeysNeeded > 1) console.log(`  New keys      : ${jobSpec.newKeysNeeded}`);
  if (keyStolen)        console.log(`  Key stolen    : ${yellow("yes — same-day rekey required")}`);
  if (brokenKeyVisible) console.log(`  Broken key    : visible`);
  if (lockedDoor)       console.log(`  Locked door   : ${lockedDoor}`);
  console.log(`  Auth confirmed: ✓`);

  console.log("\n" + bold("  Vendor questions Keywize will ask:"));
  CASES[caseType].vendorQuestions.forEach((q) => console.log(`    • ${q}`));

  console.log("\n" + bold("  Negotiation goals:"));
  CASES[caseType].negotiationGoals.forEach((g) => console.log(`    • ${g}`));

  console.log("\n" + bold("  Red flags to watch:"));
  CASES[caseType].redFlags.forEach((f) => console.log(`    • ${red(f)}`));

  console.log("\n" + dim(JSON.stringify(jobSpec, null, 2)));
  console.log("─".repeat(50));

  // ── Fire call ─────────────────────────────────────────────────────────────────
  if (toNumber) {
    const extras: Record<string, string> = {};
    if (lockedDoor) extras.locked_door = lockedDoor;
    await fireElevenLabsCall(jobSpec, toNumber, extras);
  } else {
    console.log(dim("\nSkipped call (no number entered)."));
    console.log(dim("To call later: POST /api/elevenlabs/call with missionId and toNumber."));
  }

  console.log("\n" + green("✓ Intake complete.\n"));
  rl.close();
}

main().catch((err) => {
  console.error(red(`\nFatal: ${err}`));
  rl.close();
  process.exit(1);
});
