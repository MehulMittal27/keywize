import type { Mission, Quote, VoiceTrustSignal } from "./types";

export const DEMO_MISSION_ID = "demo-mission-001";

// ─── VoiceTrust signals ───────────────────────────────────────────────────────

const vtSignalA: VoiceTrustSignal = {
  id: "vt-a-001",
  quoteId: "quote-vendor-a",
  questionType: "hidden_fees",
  vendorText:
    "Uh, the technician will confirm the final price on arrival. We start at $39 for the call.",
  pauseMs: 2100,
  fillerWords: ["uh"],
  evasivePhrases: ["technician will confirm", "starts at"],
  confidenceScore: 18,
  trustLevel: "Low",
  signals: [
    "Long pause (2100ms) before answering hidden-fee question",
    'Filler word "uh" detected',
    'Evasive phrase detected: "technician will confirm"',
    'Evasive phrase detected: "starts at"',
  ],
  recommendedPush:
    "You paused there, so I want to make sure we are not missing anything. Is there any dispatch, drilling, after-hours, or parts fee not included in the total?",
};

const vtSignalB: VoiceTrustSignal = {
  id: "vt-b-001",
  quoteId: "quote-vendor-b",
  questionType: "price",
  vendorText:
    "Yes, $130 is the total out-the-door. Dispatch, labor, and key extraction are all included.",
  pauseMs: 300,
  fillerWords: [],
  evasivePhrases: [],
  confidenceScore: 92,
  trustLevel: "High",
  signals: [],
  recommendedPush: "Response looks clear and direct. No further push needed.",
};

const vtSignalC: VoiceTrustSignal = {
  id: "vt-c-001",
  quoteId: "quote-vendor-c",
  questionType: "hidden_fees",
  vendorText:
    "Well, the $165 covers the main work. There may be a small parts charge depending on the lock.",
  pauseMs: 950,
  fillerWords: ["well"],
  evasivePhrases: ["depends on"],
  confidenceScore: 58,
  trustLevel: "Medium",
  signals: [
    "Noticeable pause (950ms) before answering price question",
    'Filler word "well" detected',
    'Evasive phrase detected: "depends on"',
  ],
  recommendedPush:
    "Let's confirm that total one more time — is that truly all-in with no additional fees on arrival?",
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

const quoteA: Quote = {
  id: "quote-vendor-a",
  missionId: DEMO_MISSION_ID,
  vendorName: "QuickLock Pro",
  phone: "+14155550101",
  etaMinutes: 20,
  dispatchFee: null,         // refused to confirm
  laborFee: null,            // refused itemized
  partsFee: null,
  afterHoursFee: null,
  taxesAndOther: null,
  totalEstimate: null,       // only quoted "starts at $39"
  isTotalAllIn: false,
  drillingPolicy: "Technician will assess on arrival and drill if necessary.",
  idRequired: false,
  oldKeyDisabled: null,
  keysIncluded: null,
  warranty: null,
  quoteConfidence: "starts_at",
  redFlags: [
    "Only said 'starts at $39' — refused all-in total",
    "No itemized pricing provided",
    "Drilling mentioned without non-destructive first policy",
    "No ID or proof of residence required",
  ],
  riskScore: 95,
  riskLevel: "High",
  transcriptEvidence: [
    "\"We start at $39 for the service call.\"",
    "\"The technician will confirm the final price on arrival.\"",
    "\"We may need to drill depending on the lock.\"",
  ],
  transcript:
    "Agent: Can you give the total out-the-door estimate?\nVendor: Uh, the technician will confirm the final price on arrival. We start at $39 for the call.\nAgent: Is the dispatch fee included in that total?\nVendor: Uh, it depends on what the technician finds.\nAgent: Will you attempt non-destructive entry before drilling?\nVendor: We may need to drill depending on the lock.",
  priceOrTermsChanged: false,
  voiceTrustSignals: [vtSignalA],
  voiceTrustScore: 18,
};

const quoteB: Quote = {
  id: "quote-vendor-b",
  missionId: DEMO_MISSION_ID,
  vendorName: "Bay Area Locksmith",
  phone: "+14155550102",
  etaMinutes: 30,
  dispatchFee: 25,
  laborFee: 85,
  partsFee: 0,
  afterHoursFee: 20,
  taxesAndOther: 0,
  totalEstimate: 130,
  isTotalAllIn: true,
  drillingPolicy: "Non-destructive entry first. Drilling only if lock is physically damaged.",
  idRequired: true,
  oldKeyDisabled: null,
  keysIncluded: 0,
  warranty: "30 days on labor",
  quoteConfidence: "firm_before_arrival",
  redFlags: [],
  riskScore: 5,
  riskLevel: "Low",
  transcriptEvidence: [
    "\"$130 is the total out-the-door. Dispatch, labor, and key extraction are all included.\"",
    "\"We always attempt non-destructive entry first.\"",
    "\"We require a photo ID and proof you live there before we start.\"",
  ],
  transcript:
    "Agent: Can you give the total out-the-door estimate?\nVendor: Yes, $130 is the total out-the-door. Dispatch, labor, and key extraction are all included.\nAgent: Will you attempt non-destructive entry before drilling?\nVendor: We always attempt non-destructive entry first. Drilling only if the lock is physically damaged.\nAgent: Do you require ID?\nVendor: Yes, we require a photo ID and proof you live there before we start.",
  priceOrTermsChanged: false,
  voiceTrustSignals: [vtSignalB],
  voiceTrustScore: 92,
};

const quoteC: Quote = {
  id: "quote-vendor-c",
  missionId: DEMO_MISSION_ID,
  vendorName: "SpeedKey Express",
  phone: "+14155550103",
  etaMinutes: 15,
  dispatchFee: 30,
  laborFee: 110,
  partsFee: 0,
  afterHoursFee: 25,
  taxesAndOther: 0,
  totalEstimate: 165,
  isTotalAllIn: false,      // uncertain on hidden fees
  drillingPolicy: "Non-destructive preferred. Drilling only as last resort.",
  idRequired: true,
  oldKeyDisabled: null,
  keysIncluded: 0,
  warranty: "30 days",
  quoteConfidence: "firm_before_arrival",
  redFlags: [
    "Not fully confirmed all-in — possible parts charge on arrival",
  ],
  riskScore: 30,
  riskLevel: "Medium",
  transcriptEvidence: [
    "\"$165 covers the main work. There may be a small parts charge depending on the lock.\"",
    "\"We can be there in 15 minutes.\"",
    "\"We try non-destructive first.\"",
  ],
  transcript:
    "Agent: Can you give the total out-the-door estimate?\nVendor: Well, the $165 covers the main work. There may be a small parts charge depending on the lock.\nAgent: Is there an after-hours fee?\nVendor: That's included in the $165.\nAgent: What is your ETA?\nVendor: We can be there in 15 minutes.",
  priceOrTermsChanged: false,
  voiceTrustSignals: [vtSignalC],
  voiceTrustScore: 58,
};

// ─── Demo Mission (pre-negotiation state) ────────────────────────────────────

export const DEMO_MISSION: Mission = {
  id: DEMO_MISSION_ID,
  jobSpec: {
    id: "spec-001",
    caseType: "broken_key_inside_lock",
    urgency: "locked_out_now",
    propertyType: "apartment",
    doorType: "main_entry",
    lockType: "deadbolt",
    doorOpen: false,
    keyStolen: false,
    brokenKeyVisible: true,
    needRekey: false,
    newKeysNeeded: 1,
    idealPrice: 100,
    maxPrice: 150,
    budgetFlexibility: "strict",
    approvalRequiredAboveBudget: true,
    authorizationConfirmed: true,
    locationCity: "San Francisco",
    locationZip: "94103",
    createdAt: new Date().toISOString(),
  },
  quotes: [quoteA, quoteB, quoteC],
  status: "quotes_collected",
  callLog: [
    {
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      event: "intake_complete",
      details: "Broken key inside main deadbolt. Max budget $150.",
    },
    {
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      event: "calling_vendor_a",
      details: "Calling QuickLock Pro…",
    },
    {
      timestamp: new Date(Date.now() - 4.5 * 60 * 1000).toISOString(),
      event: "quote_received",
      details: "QuickLock Pro: starts at $39 — HIGH RISK flagged",
    },
    {
      timestamp: new Date(Date.now() - 3.5 * 60 * 1000).toISOString(),
      event: "calling_vendor_b",
      details: "Calling Bay Area Locksmith…",
    },
    {
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      event: "quote_received",
      details: "Bay Area Locksmith: $130 all-in — LOW RISK",
    },
    {
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      event: "calling_vendor_c",
      details: "Calling SpeedKey Express…",
    },
    {
      timestamp: new Date(Date.now() - 1.5 * 60 * 1000).toISOString(),
      event: "quote_received",
      details: "SpeedKey Express: $165 initially — MEDIUM RISK",
    },
  ],
  recommendation: null,
};
