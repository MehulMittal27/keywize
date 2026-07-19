import type {
  Mission,
  Quote,
  VendorCall,
  VendorId,
  VoiceTrustSignal,
} from "./types";

export const DEMO_MISSION_ID = "mission-001";

export const VENDOR_DEFINITIONS: Record<
  VendorId,
  { vendorName: string; fixtureQuoteId: string }
> = {
  vendor_a: { vendorName: "Speedy Lock & Key", fixtureQuoteId: "quote-a" },
  vendor_b: { vendorName: "Neighborhood Locksmith", fixtureQuoteId: "quote-b" },
  vendor_c: { vendorName: "Negotiated Offers", fixtureQuoteId: "quote-c" },
};

const mockVoiceTrustSignals: Record<VendorId, VoiceTrustSignal[]> = {
  vendor_a: [
    {
      id: "vt-a-1",
      quoteId: "quote-a",
      questionType: "hidden_fees",
      vendorText: "Uh... well, it depends on the lock.",
      pauseMs: 1800,
      fillerWords: ["uh", "well"],
      evasivePhrases: ["depends on"],
      confidenceScore: 35,
      trustLevel: "Low",
      signals: ["Long pause (1.8s)", "Evasive language", "Filler words"],
      recommendedPush: "Force a firm cap on labor before dispatch.",
    },
  ],
  vendor_b: [
    {
      id: "vt-b-1",
      quoteId: "quote-b",
      questionType: "price",
      vendorText: "It is $130 total, including dispatch.",
      pauseMs: 200,
      fillerWords: [],
      evasivePhrases: [],
      confidenceScore: 95,
      trustLevel: "High",
      signals: ["Quick response", "Direct language"],
      recommendedPush: "Confirm no-drill policy.",
    },
  ],
  vendor_c: [
    {
      id: "vt-c-1",
      quoteId: "quote-c",
      questionType: "hidden_fees",
      vendorText: "The $165 is all-in for the described job.",
      pauseMs: 300,
      fillerWords: [],
      evasivePhrases: [],
      confidenceScore: 92,
      trustLevel: "High",
      signals: ["Direct all-in confirmation"],
      recommendedPush: "Use the safe stored comparison to negotiate price.",
    },
  ],
};

export const mockQuotes: Quote[] = [
  {
    id: "quote-a",
    missionId: DEMO_MISSION_ID,
    vendorId: "vendor_a",
    vendorName: VENDOR_DEFINITIONS.vendor_a.vendorName,
    phone: "",
    etaMinutes: 20,
    dispatchFee: 39,
    laborFee: null,
    partsFee: null,
    afterHoursFee: null,
    taxesAndOther: null,
    totalEstimate: null,
    isTotalAllIn: false,
    drillingPolicy: "Technician decides on site",
    idRequired: false,
    oldKeyDisabled: null,
    keysIncluded: 0,
    warranty: "None",
    quoteConfidence: "starts_at",
    redFlags: ["Refused to give total", "Starts at $39 pricing", "No ID required"],
    riskScore: 85,
    riskLevel: "High",
    transcriptEvidence: [
      "It starts at $39, the tech will tell you the rest.",
      "Uh... well, it depends on the lock.",
    ],
    transcript:
      "Keywize: What is the all-in total?\nSpeedy: It starts at $39, the tech will tell you the rest.\nKeywize: Are there any hidden fees?\nSpeedy: Uh... well, it depends on the lock.",
    priceOrTermsChanged: false,
    voiceTrustSignals: mockVoiceTrustSignals.vendor_a,
    voiceTrustScore: 35,
  },
  {
    id: "quote-b",
    missionId: DEMO_MISSION_ID,
    vendorId: "vendor_b",
    vendorName: VENDOR_DEFINITIONS.vendor_b.vendorName,
    phone: "",
    etaMinutes: 30,
    dispatchFee: 40,
    laborFee: 90,
    partsFee: 0,
    afterHoursFee: 0,
    taxesAndOther: 0,
    totalEstimate: 130,
    isTotalAllIn: true,
    drillingPolicy: "No-drill guarantee first",
    idRequired: true,
    oldKeyDisabled: null,
    keysIncluded: 0,
    warranty: "90 days",
    quoteConfidence: "firm_before_arrival",
    redFlags: [],
    riskScore: 10,
    riskLevel: "Low",
    transcriptEvidence: [
      "It is $130 total, including dispatch.",
      "We always try to pick it first without drilling.",
    ],
    transcript:
      "Keywize: What is the total cost?\nNeighborhood: It is $130 total, including dispatch.\nKeywize: Do you drill the lock?\nNeighborhood: We always try to pick it first without drilling.",
    priceOrTermsChanged: false,
    voiceTrustSignals: mockVoiceTrustSignals.vendor_b,
    voiceTrustScore: 95,
  },
  {
    id: "quote-c",
    missionId: DEMO_MISSION_ID,
    vendorId: "vendor_c",
    vendorName: VENDOR_DEFINITIONS.vendor_c.vendorName,
    phone: "",
    etaMinutes: 15,
    dispatchFee: 45,
    laborFee: 120,
    partsFee: 0,
    afterHoursFee: 0,
    taxesAndOther: 0,
    totalEstimate: 165,
    isTotalAllIn: true,
    drillingPolicy: "Non-destructive entry first; approval before drilling",
    idRequired: true,
    oldKeyDisabled: null,
    keysIncluded: 0,
    warranty: "1 year",
    quoteConfidence: "firm_before_arrival",
    redFlags: ["Initial quote over budget ($150)"],
    riskScore: 25,
    riskLevel: "Medium",
    transcriptEvidence: [
      "It is $165 all-in for emergency extraction.",
      "We can be there in 15 minutes.",
    ],
    transcript:
      "Keywize: What is the total price?\nNegotiated Offers: It is $165 all-in for emergency extraction.\nKeywize: What is the ETA?\nNegotiated Offers: We can be there in 15 minutes.",
    priceOrTermsChanged: false,
    voiceTrustSignals: mockVoiceTrustSignals.vendor_c,
    voiceTrustScore: 92,
  },
];

export function getDemoQuoteForVendor(missionId: string, vendorId: VendorId): Quote {
  const fixture = mockQuotes.find((quote) => quote.vendorId === vendorId);
  if (!fixture) {
    throw new Error(`Missing reliable demo fixture for ${vendorId}`);
  }

  const quote = structuredClone(fixture);
  quote.id = `${fixture.id}-${missionId}`;
  quote.missionId = missionId;
  quote.voiceTrustSignals = quote.voiceTrustSignals.map((signal) => ({
    ...signal,
    id: `${signal.id}-${missionId}`,
    quoteId: quote.id,
  }));
  return quote;
}

export function getDemoQuotesForMission(missionId: string): Quote[] {
  return (["vendor_a", "vendor_b", "vendor_c"] as VendorId[]).map((vendorId) =>
    getDemoQuoteForVendor(missionId, vendorId)
  );
}

export function createVendorCalls(mode: Mission["mode"], missionId = DEMO_MISSION_ID): VendorCall[] {
  return (["vendor_a", "vendor_b", "vendor_c"] as VendorId[]).map((vendorId) => ({
    id: `${missionId}-caller-${vendorId}`,
    vendorId,
    vendorName: VENDOR_DEFINITIONS[vendorId].vendorName,
    role: "caller",
    status: "queued",
    mode,
    fallbackUsed: false,
  }));
}

const seededAt = new Date().toISOString();

export const DEMO_MISSION: Mission = {
  id: DEMO_MISSION_ID,
  mode: "reliable_demo",
  jobSpec: {
    id: "job-001",
    caseType: "broken_key_inside_lock",
    urgency: "locked_out_now",
    propertyType: "apartment",
    doorType: "main_entry",
    lockType: "deadbolt",
    doorOpen: false,
    keyStolen: false,
    brokenKeyVisible: true,
    needRekey: false,
    newKeysNeeded: 0,
    idealPrice: 120,
    maxPrice: 150,
    budgetFlexibility: "strict",
    approvalRequiredAboveBudget: true,
    authorizationConfirmed: true,
    locationCity: "San Francisco",
    locationZip: "94109",
    createdAt: seededAt,
  },
  quotes: [],
  status: "calling_vendors",
  callLog: [
    {
      id: "event-1",
      sequence: 1,
      timestamp: seededAt,
      event: "intake_complete",
      details: "Broken key inside main deadbolt. Max budget $150.",
      category: "status",
      source: "reliable_demo",
    },
    {
      id: "event-2",
      sequence: 2,
      timestamp: seededAt,
      event: "demo_calls_queued",
      details: "Three simulated vendor personas queued for deterministic replay.",
      category: "status",
      source: "reliable_demo",
    },
  ],
  vendorCalls: createVendorCalls("reliable_demo", DEMO_MISSION_ID),
  recommendation: null,
  negotiation: null,
  approval: null,
  orchestration: {
    replayActive: true,
    quoteCursor: 0,
    negotiationCursor: 0,
    nextActionAt: seededAt,
  },
  createdAt: seededAt,
  updatedAt: seededAt,
};

export const mockMission = DEMO_MISSION;
