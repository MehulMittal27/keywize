import { calculateRiskScore } from "./riskScore";
import { rankQuotes } from "./ranking";
import { getDemoQuoteForVendor, VENDOR_DEFINITIONS, createVendorCalls } from "./mockData";
import { addMissionEvent } from "./missionEvents";
import { leverageStillMatchesMission } from "./leverage";
import type { Mission, MissionEventSource, VendorId, VoiceTrustSignal } from "./types";

const REPLAY_STEP_DELAY_MS = 650;
const VENDOR_ORDER: VendorId[] = ["vendor_a", "vendor_b", "vendor_c"];

function nextAction(delayMs = REPLAY_STEP_DELAY_MS): string {
  return new Date(Date.now() + delayMs).toISOString();
}

function eventSource(mission: Mission): MissionEventSource {
  return mission.mode === "live_sandbox" ? "fallback" : "reliable_demo";
}

export function startReliableDemo(mission: Mission): void {
  mission.mode = "reliable_demo";
  mission.status = "calling_vendors";
  mission.vendorCalls = createVendorCalls("reliable_demo", mission.id);
  mission.orchestration = {
    replayActive: true,
    quoteCursor: 0,
    negotiationCursor: 0,
    nextActionAt: nextAction(300),
  };
  addMissionEvent(mission, {
    event: "demo_calls_queued",
    details: "Three simulated vendor personas queued for deterministic replay.",
    category: "status",
    source: "reliable_demo",
  });
}

export function activateReliableFallback(mission: Mission, reason: string): void {
  mission.fallbackReason = reason;
  mission.status = "calling_vendors";
  mission.orchestration.replayActive = true;
  mission.orchestration.quoteCursor = 0;
  mission.orchestration.nextActionAt = nextAction(150);
  delete mission.orchestration.liveFallbackAt;

  for (const call of mission.vendorCalls.filter((candidate) => candidate.role === "caller")) {
    if (!call.quoteId) {
      call.status = "replay_fallback";
      call.fallbackUsed = true;
    }
  }

  addMissionEvent(mission, {
    event: "reliable_fallback_started",
    details: `${reason} Continuing with the disclosed simulated vendor replay.`,
    category: "fallback",
    source: "fallback",
  });
}

export function activateNegotiationFallback(mission: Mission, reason: string): void {
  mission.fallbackReason = reason;
  mission.orchestration.replayActive = true;
  mission.orchestration.negotiationCursor = 0;
  mission.orchestration.nextActionAt = nextAction(150);
  delete mission.orchestration.liveFallbackAt;

  const closerCall = mission.vendorCalls.find((call) => call.role === "closer");
  if (closerCall) {
    closerCall.status = "replay_fallback";
    closerCall.fallbackUsed = true;
  }
  if (mission.negotiation) mission.negotiation.fallbackUsed = true;

  addMissionEvent(mission, {
    event: "negotiation_fallback_started",
    details: `${reason} Continuing with the disclosed Vendor C negotiation replay.`,
    category: "fallback",
    source: "fallback",
    vendorId: "vendor_c",
  });
}

function findCall(mission: Mission, vendorId: VendorId, role: "caller" | "closer" = "caller") {
  return mission.vendorCalls.find(
    (call) => call.vendorId === vendorId && call.role === role
  );
}

function saveReliableQuote(mission: Mission, vendorId: VendorId): void {
  if (mission.quotes.some((quote) => quote.vendorId === vendorId)) return;

  const quote = getDemoQuoteForVendor(mission.id, vendorId);
  const [riskScore, riskLevel] = calculateRiskScore(quote, mission.jobSpec);
  quote.riskScore = riskScore;
  quote.riskLevel = riskLevel;
  mission.quotes.push(quote);

  const call = findCall(mission, vendorId);
  if (call) {
    call.status = "complete";
    call.quoteId = quote.id;
    call.completedAt = new Date().toISOString();
  }

  addMissionEvent(mission, {
    event: "quote_saved",
    details:
      quote.totalEstimate === null
        ? `${quote.vendorName} gave starts-at pricing without a firm total.`
        : `${quote.vendorName} confirmed $${quote.totalEstimate} all-in with a ${quote.etaMinutes}-minute ETA.`,
    vendorId,
    category: "tool",
    source: eventSource(mission),
    toolName: "quote_saved",
  });
  addMissionEvent(mission, {
    event: "uncertainty_analyzed",
    details:
      vendorId === "vendor_a"
        ? "Hesitation and evasive wording flagged as uncertainty, not deception."
        : "Response checked against the stored transcript evidence.",
    vendorId,
    category: "tool",
    source: eventSource(mission),
    toolName: "uncertainty_analyzed",
  });
  addMissionEvent(mission, {
    event: "risk_recalculated",
    details: `${quote.vendorName} risk is ${quote.riskLevel.toLowerCase()} (${quote.riskScore}/100).`,
    vendorId,
    category: "tool",
    source: eventSource(mission),
    toolName: "risk_recalculated",
  });
}

function advanceQuoteReplay(mission: Mission): void {
  const cursor = mission.orchestration.quoteCursor;
  const vendorId = VENDOR_ORDER[Math.floor(cursor / 2)];

  if (!vendorId) {
    mission.status = "quotes_ready";
    mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
    addMissionEvent(mission, {
      event: "quotes_ready",
      details: "Three structured quotes are stored. The fastest safe option is ready to negotiate.",
      category: "status",
      source: eventSource(mission),
    });
    return;
  }

  const call = findCall(mission, vendorId);
  const isCallStep = cursor % 2 === 0;
  if (isCallStep) {
    if (mission.quotes.some((quote) => quote.vendorId === vendorId)) {
      mission.orchestration.quoteCursor += 2;
      mission.orchestration.nextActionAt = nextAction(50);
      return;
    }

    if (call) {
      call.status = "connected";
      call.startedAt ??= new Date().toISOString();
    }
    addMissionEvent(mission, {
      event: "vendor_call_connected",
      details: `${VENDOR_DEFINITIONS[vendorId].vendorName} simulated persona connected.`,
      vendorId,
      category: "call",
      source: eventSource(mission),
    });
  } else {
    saveReliableQuote(mission, vendorId);
  }

  mission.orchestration.quoteCursor += 1;
  mission.orchestration.nextActionAt = nextAction();
}

const NEGOTIATION_SIGNAL_TEXT =
  "Um, yes. We can do $145 all-in, keep the 15-minute ETA, and require approval before any drilling or price change.";

function completeReliableNegotiation(mission: Mission): void {
  const negotiation = mission.negotiation;
  if (!negotiation || !leverageStillMatchesMission(mission, negotiation.leverage)) {
    mission.status = "failed";
    if (negotiation) negotiation.status = "failed";
    addMissionEvent(mission, {
      event: "negotiation_failed",
      details: "Stored leverage was no longer valid, so no competitor claim was made.",
      category: "negotiation",
      source: eventSource(mission),
    });
    return;
  }

  const targetIndex = mission.quotes.findIndex(
    (quote) => quote.id === negotiation.targetQuoteId
  );
  const target = mission.quotes[targetIndex];
  if (!target || target.totalEstimate !== negotiation.beforePrice) {
    mission.status = "failed";
    negotiation.status = "failed";
    addMissionEvent(mission, {
      event: "negotiation_failed",
      details: "The target quote changed before confirmation, so Keywize stopped safely.",
      category: "negotiation",
      source: eventSource(mission),
    });
    return;
  }

  const signal: VoiceTrustSignal = {
    id: `vt-c-negotiation-${mission.id}`,
    quoteId: target.id,
    questionType: "final_confirmation",
    vendorText: NEGOTIATION_SIGNAL_TEXT,
    pauseMs: 1200,
    fillerWords: ["um"],
    evasivePhrases: [],
    confidenceScore: 65,
    trustLevel: "Medium",
    signals: ["Moderate pause", "Clear final confirmation after hesitation"],
    recommendedPush: "Persist the exact confirmed terms and ask the user for approval.",
  };

  const updated = structuredClone(target);
  updated.totalEstimate = 145;
  updated.isTotalAllIn = true;
  updated.priceOrTermsChanged = true;
  updated.redFlags = updated.redFlags.filter((flag) => !flag.toLowerCase().includes("over budget"));
  updated.transcriptEvidence.push(NEGOTIATION_SIGNAL_TEXT);
  updated.transcript +=
    `\n\nNEGOTIATION:\nKeywize: We have a confirmed $${negotiation.leverage.total} all-in, no-drill-first offer. ` +
    "You are faster. Can you do $145 all-in while keeping the 15-minute ETA and approval before any drilling or price change?" +
    `\nPremium: ${NEGOTIATION_SIGNAL_TEXT}`;
  updated.voiceTrustSignals.push(signal);
  updated.voiceTrustScore = 65;
  const [riskScore, riskLevel] = calculateRiskScore(updated, mission.jobSpec);
  updated.riskScore = riskScore;
  updated.riskLevel = riskLevel;
  mission.quotes[targetIndex] = updated;

  negotiation.status = "secured";
  negotiation.afterPrice = 145;
  negotiation.isTotalAllIn = true;
  negotiation.changedTerms = [
    "Price reduced from $165 to $145 all-in",
    "15-minute ETA retained",
    "Approval required before drilling or any price change",
  ];
  negotiation.transcriptEvidence = [NEGOTIATION_SIGNAL_TEXT];
  negotiation.completedAt = new Date().toISOString();

  const closerCall = findCall(mission, "vendor_c", "closer");
  if (closerCall) {
    closerCall.status = "complete";
    closerCall.completedAt = negotiation.completedAt;
  }

  mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
  mission.approval = {
    status: "pending",
    quoteId: updated.id,
    total: 145,
    dispatchAuthorized: false,
  };
  mission.status = "terms_secured";

  addMissionEvent(mission, {
    event: "negotiation_persisted",
    details: "$145 all-in confirmed. No unsupported free keys were added.",
    vendorId: "vendor_c",
    category: "tool",
    source: eventSource(mission),
    toolName: "negotiation_persisted",
  });
  addMissionEvent(mission, {
    event: "risk_recalculated",
    details: `Premium Secure risk recalculated to ${updated.riskLevel.toLowerCase()} (${updated.riskScore}/100).`,
    vendorId: "vendor_c",
    category: "tool",
    source: eventSource(mission),
    toolName: "risk_recalculated",
  });
  addMissionEvent(mission, {
    event: "terms_secured",
    details: "Terms secured under the maximum budget. Awaiting the user's quote approval; dispatch is not authorized.",
    vendorId: "vendor_c",
    category: "status",
    source: eventSource(mission),
  });
}

function advanceNegotiationReplay(mission: Mission): void {
  if (mission.orchestration.negotiationCursor === 0) {
    const closerCall = findCall(mission, "vendor_c", "closer");
    if (closerCall) {
      closerCall.status = "connected";
      closerCall.startedAt ??= new Date().toISOString();
    }
    addMissionEvent(mission, {
      event: "closer_connected",
      details: `Closer presented the stored $${mission.negotiation?.leverage.total} all-in Vendor B quote to Vendor C.`,
      vendorId: "vendor_c",
      category: "negotiation",
      source: eventSource(mission),
    });
    mission.orchestration.negotiationCursor = 1;
    mission.orchestration.nextActionAt = nextAction(800);
    return;
  }

  completeReliableNegotiation(mission);
  mission.orchestration.replayActive = false;
}

export function advanceMissionOrchestration(mission: Mission): boolean {
  const now = Date.now();
  const liveFallbackAt = mission.orchestration.liveFallbackAt
    ? Date.parse(mission.orchestration.liveFallbackAt)
    : null;

  if (!mission.orchestration.replayActive && liveFallbackAt && now >= liveFallbackAt) {
    if (mission.status === "calling_vendors") {
      activateReliableFallback(mission, "The live sandbox calls did not produce complete quotes in time.");
    } else if (mission.status === "negotiating") {
      activateNegotiationFallback(mission, "The live Closer call did not confirm terms in time.");
    }
    return true;
  }

  if (!mission.orchestration.replayActive) return false;
  if (now < Date.parse(mission.orchestration.nextActionAt)) return false;

  if (mission.status === "calling_vendors") {
    advanceQuoteReplay(mission);
    return true;
  }
  if (mission.status === "negotiating") {
    advanceNegotiationReplay(mission);
    return true;
  }
  return false;
}
