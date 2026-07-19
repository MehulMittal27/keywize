import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { addMissionEvent } from "@/lib/missionEvents";
import { createMissionShell, startMission } from "@/lib/missionService";
import {
  getPrivateCallCorrelation,
  getPrivateCallCorrelationByConversationId,
  scheduleNextSandboxCallerCall,
} from "@/lib/liveSandbox";
import {
  ensureLiveSandboxDiagnostics,
  markLiveSandboxPhoneAnswered,
  markLiveSandboxQuoteSaved,
  markLiveSandboxToolReceived,
  markLiveSandboxToolRejected,
} from "@/lib/liveSandboxDiagnostics";
import { liveSandboxVendorLabel } from "@/lib/liveSandboxGuide";
import { leverageStillMatchesMission } from "@/lib/leverage";
import { getMission, listMissions, setMission } from "@/lib/store";
import { analyzeVoiceTrust } from "@/lib/voiceTrust";
import { calculateRiskScore } from "@/lib/riskScore";
import { rankQuotes } from "@/lib/ranking";
import { clampMaxPrice } from "@/lib/jobSpec";
import type {
  CallRole,
  JobSpec,
  Mission,
  Quote,
  QuoteConfidence,
  VendorCall,
  VendorId,
} from "@/lib/types";

type ToolRequestBody = Record<string, unknown>;
type NormalizedToolCall = {
  toolName: string;
  parameters: Record<string, unknown>;
};

function normalizeToolCall(body: ToolRequestBody): NormalizedToolCall | null {
  const toolName = firstString(body.tool_name, body.tool, body.name, body.toolName);
  const rawParameters = body.parameters ?? body.params ?? body.args ?? body.input ?? body.payload;
  const parameters = normalizeParameters(rawParameters);
  return toolName && parameters ? { toolName, parameters } : null;
}

function normalizeParameters(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return { payload: value };
  }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanOrNull(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function getLatestMission(): Mission | undefined {
  return listMissions().at(-1);
}

type LiveWriteContext = {
  mission?: Mission;
  call?: VendorCall;
  callId: string;
  error?: string;
};

function likelyActiveCall(
  mission: Mission,
  expectedRole: CallRole
): VendorCall | undefined {
  const candidates = mission.vendorCalls.filter(
    (call) =>
      call.role === expectedRole &&
      Boolean(call.startedAt) &&
      !call.quoteId &&
      !call.fallbackUsed
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

function resolveMissionForWrite(
  params: Record<string, unknown>,
  body: ToolRequestBody,
  expectedRole: CallRole
): LiveWriteContext {
  const requestedMissionId = firstString(params.missionId, params.mission_id);
  const requestedCallId = firstString(params.callId, params.call_id);
  const conversationId = firstString(body.conversation_id, body.conversationId);
  const correlation =
    (conversationId
      ? getPrivateCallCorrelationByConversationId(conversationId)
      : undefined) ??
    (requestedCallId ? getPrivateCallCorrelation(requestedCallId) : undefined);
  const missionId = requestedMissionId || correlation?.missionId || "";
  const callId = requestedCallId || correlation?.callId || "";
  const mission = missionId ? getMission(missionId) : getLatestMission();
  if (!mission) return { callId, error: "Mission not found" };

  const call =
    mission.vendorCalls.find((candidate) => candidate.id === callId) ??
    likelyActiveCall(mission, expectedRole);
  if (mission.mode !== "live_sandbox") return { mission, call, callId };

  if (mission.orchestration.replayActive && mission.fallbackReason) {
    return {
      mission,
      call,
      callId,
      error: "Mission has already switched to reliable replay",
    };
  }
  if (!correlation) {
    return {
      mission,
      call,
      callId,
      error: "Missing live call correlation",
    };
  }
  if (
    correlation.missionId !== mission.id ||
    correlation.callId !== callId ||
    correlation.role !== expectedRole ||
    !call ||
    call.id !== correlation.callId
  ) {
    return {
      mission,
      call,
      callId,
      error: "Invalid live call correlation",
    };
  }
  return { mission, call, callId };
}

function recordLiveToolReceived(
  mission: Mission,
  call: VendorCall | undefined,
  toolName: "save_quote" | "update_negotiation"
): void {
  if (mission.mode !== "live_sandbox" || !call) return;
  const previous = ensureLiveSandboxDiagnostics(call).toolWebhook;
  markLiveSandboxToolReceived(call);
  if (previous === "received" || previous === "quote_saved") return;
  addMissionEvent(mission, {
    event: "tool_called",
    details: `${toolName} reached Keywize for ${liveSandboxVendorLabel(call.vendorId)}. Validating correlation and required fields.`,
    vendorId: call.vendorId,
    category: "tool",
    source: "live_sandbox",
    toolName,
  });
}

function recordLiveToolRejection(
  mission: Mission,
  call: VendorCall | undefined,
  toolName: "save_quote" | "update_negotiation",
  reason: string
): void {
  if (mission.mode !== "live_sandbox" || !call) return;
  markLiveSandboxToolRejected(call, reason);
  addMissionEvent(mission, {
    event: `${toolName}_webhook_rejected`,
    details: `${toolName} reached Keywize for ${liveSandboxVendorLabel(call.vendorId)} but was rejected: ${reason}.`,
    vendorId: call.vendorId,
    category: "tool",
    source: "live_sandbox",
  });
}

const QUOTE_CONFIDENCE_VALUES: QuoteConfidence[] = [
  "firm_before_arrival",
  "starts_at",
  "callback",
  "declined",
];

function invalidSaveQuoteFields(params: Record<string, unknown>): string[] {
  const invalid: string[] = [];
  const allIn = booleanOrNull(params.isTotalAllIn);
  if (!firstString(params.vendorName)) invalid.push("vendorName");
  if (numberOrNull(params.etaMinutes) === null) invalid.push("etaMinutes");
  if (allIn === null) invalid.push("isTotalAllIn");
  if (allIn === true && numberOrNull(params.totalEstimate) === null) {
    invalid.push("totalEstimate");
  }
  if (!firstString(params.drillingPolicy)) invalid.push("drillingPolicy");
  if (booleanOrNull(params.idRequired) === null) invalid.push("idRequired");
  if (!QUOTE_CONFIDENCE_VALUES.includes(String(params.quoteConfidence) as QuoteConfidence)) {
    invalid.push("quoteConfidence");
  }
  if (toStringArray(params.transcriptEvidence).length === 0) {
    invalid.push("transcriptEvidence");
  }
  if (!firstString(params.transcript)) invalid.push("transcript");
  return invalid;
}

function inferredVendorId(
  mission: Mission,
  callId: string,
  value: unknown
): VendorId | undefined {
  const requested = String(value ?? "") as VendorId;
  const validRequested = ["vendor_a", "vendor_b", "vendor_c"].includes(requested)
    ? requested
    : undefined;
  if (mission.mode !== "live_sandbox") return validRequested;
  return getPrivateCallCorrelation(callId)?.vendorId;
}

export async function POST(request: NextRequest) {
  let body: ToolRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeToolCall(body);
  if (!normalized) {
    return NextResponse.json({ error: "tool_name and parameters required" }, { status: 422 });
  }
  const { toolName, parameters: params } = normalized;

  switch (toolName) {
    case "create_job_spec": {
      if (params.authorizationConfirmed !== true) {
        return NextResponse.json(
          {
            error: "Authorization not confirmed",
            message: "Authorization and proof-of-residence readiness are required.",
          },
          { status: 422 }
        );
      }

      const timestamp = new Date().toISOString();
      const jobSpec: JobSpec = {
        id: uuid(),
        caseType: params.caseType as JobSpec["caseType"],
        urgency: params.urgency as JobSpec["urgency"],
        propertyType: params.propertyType as JobSpec["propertyType"],
        doorType: params.doorType as JobSpec["doorType"],
        lockType: params.lockType as JobSpec["lockType"],
        doorOpen: Boolean(params.doorOpen),
        keyStolen: Boolean(params.keyStolen),
        brokenKeyVisible: Boolean(params.brokenKeyVisible),
        needRekey: Boolean(params.needRekey),
        newKeysNeeded: Number(params.newKeysNeeded ?? 0),
        idealPrice: Number(params.idealPrice),
        maxPrice: clampMaxPrice(Number(params.idealPrice), Number(params.maxPrice)),
        budgetFlexibility:
          (params.budgetFlexibility as JobSpec["budgetFlexibility"]) ?? "strict",
        approvalRequiredAboveBudget: true,
        authorizationConfirmed: true,
        locationCity: String(params.locationCity ?? ""),
        locationZip: String(params.locationZip ?? ""),
        createdAt: timestamp,
      };
      const mission = createMissionShell(uuid(), jobSpec, "reliable_demo");
      await startMission(mission);
      return NextResponse.json({ success: true, missionId: mission.id });
    }

    case "save_quote": {
      const context = resolveMissionForWrite(params, body, "caller");
      if (!context.mission) {
        return NextResponse.json({ error: context.error }, { status: 422 });
      }
      const mission = context.mission;
      recordLiveToolReceived(mission, context.call, "save_quote");
      if (context.error) {
        recordLiveToolRejection(
          mission,
          context.call,
          "save_quote",
          context.error
        );
        setMission(mission);
        return NextResponse.json({ error: context.error }, { status: 422 });
      }

      if (context.call) {
        markLiveSandboxPhoneAnswered(context.call, "correlated_tool_webhook");
      }

      const invalidFields = invalidSaveQuoteFields(params);
      if (invalidFields.length > 0) {
        const reason = `missing or invalid fields: ${invalidFields.join(", ")}`;
        recordLiveToolRejection(
          mission,
          context.call,
          "save_quote",
          reason
        );
        setMission(mission);
        return NextResponse.json({ error: reason }, { status: 422 });
      }

      const vendorId = inferredVendorId(
        mission,
        context.callId,
        params.vendorId ?? params.vendor_id
      );
      const quoteConfidence = String(params.quoteConfidence ?? "callback") as QuoteConfidence;
      const quote: Quote = {
        id: uuid(),
        missionId: mission.id,
        vendorId,
        vendorName: String(params.vendorName ?? "Unknown sandbox vendor"),
        phone: "",
        etaMinutes: numberOrNull(params.etaMinutes),
        dispatchFee: numberOrNull(params.dispatchFee),
        laborFee: numberOrNull(params.laborFee),
        partsFee: numberOrNull(params.partsFee),
        afterHoursFee: numberOrNull(params.afterHoursFee),
        taxesAndOther: numberOrNull(params.taxesAndOther),
        totalEstimate: numberOrNull(params.totalEstimate),
        isTotalAllIn: booleanOrNull(params.isTotalAllIn) === true,
        drillingPolicy: String(params.drillingPolicy ?? "Unknown"),
        idRequired: booleanOrNull(params.idRequired),
        oldKeyDisabled: booleanOrNull(params.oldKeyDisabled),
        keysIncluded: numberOrNull(params.keysIncluded),
        warranty: params.warranty ? String(params.warranty) : null,
        quoteConfidence,
        redFlags: toStringArray(params.redFlags),
        riskScore: 0,
        riskLevel: "Low",
        transcriptEvidence: toStringArray(params.transcriptEvidence),
        transcript: String(params.transcript ?? ""),
        priceOrTermsChanged: false,
        voiceTrustSignals: [],
        voiceTrustScore: 50,
      };
      const [riskScore, riskLevel] = calculateRiskScore(quote, mission.jobSpec);
      quote.riskScore = riskScore;
      quote.riskLevel = riskLevel;

      const existingIndex = vendorId
        ? mission.quotes.findIndex((candidate) => candidate.vendorId === vendorId)
        : -1;
      if (existingIndex >= 0) mission.quotes[existingIndex] = quote;
      else mission.quotes.push(quote);

      const call = context.call;
      if (call) {
        call.quoteId = quote.id;
        call.status = mission.mode === "live_sandbox" ? "quote_saved" : "complete";
        call.completedAt = new Date().toISOString();
        markLiveSandboxQuoteSaved(call);
      }
      addMissionEvent(mission, {
        event: "quote_saved",
        details: `${quote.vendorName} quote persisted from a correlated call.`,
        vendorId,
        category: "tool",
        toolName: "quote_saved",
      });
      addMissionEvent(mission, {
        event: "risk_recalculated",
        details: `${quote.vendorName} risk recalculated to ${quote.riskLevel.toLowerCase()}.`,
        vendorId,
        category: "tool",
        toolName: "risk_recalculated",
      });

      if (mission.quotes.length >= 3) {
        mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
        mission.status = "quotes_ready";
        delete mission.orchestration.liveFallbackAt;
        addMissionEvent(mission, {
          event: "quotes_ready",
          details: "Three correlated live sandbox quotes are stored and ready for review.",
          category: "status",
        });
      } else if (mission.mode === "live_sandbox") {
        scheduleNextSandboxCallerCall(mission);
      }
      setMission(mission);
      return NextResponse.json({ success: true, quoteId: quote.id });
    }

    case "analyze_voice_trust": {
      if (!params.questionType || params.vendorText === undefined) {
        return NextResponse.json(
          { error: "questionType and vendorText are required" },
          { status: 422 }
        );
      }
      const quoteId = String(params.quoteId ?? params.quote_id ?? uuid());
      const signal = analyzeVoiceTrust({
        quoteId,
        questionType: params.questionType as never,
        vendorText: String(params.vendorText),
        pauseMs: Number(params.pauseMs ?? 0),
        fillerWords: toStringArray(params.fillerWords),
        evasivePhrases: toStringArray(params.evasivePhrases),
        speechRateChangePct: params.speechRateChangePct as number | undefined,
        pitchVariance: params.pitchVariance as number | undefined,
        volumeVariance: params.volumeVariance as number | undefined,
      });

      const missionId = String(params.missionId ?? params.mission_id ?? "");
      const mission = missionId ? getMission(missionId) : undefined;
      const quote = mission?.quotes.find((candidate) => candidate.id === quoteId);
      if (mission && quote) {
        quote.voiceTrustSignals.push(signal);
        quote.voiceTrustScore = Math.round(
          quote.voiceTrustSignals.reduce((sum, item) => sum + item.confidenceScore, 0) /
            quote.voiceTrustSignals.length
        );
        addMissionEvent(mission, {
          event: "uncertainty_analyzed",
          details: "VoiceTrust uncertainty attached to the correlated quote.",
          vendorId: quote.vendorId,
          category: "tool",
          toolName: "uncertainty_analyzed",
        });
        setMission(mission);
      }
      return NextResponse.json({ success: true, signal });
    }

    case "classify_vendor_tone": {
      const text = String(params.vendorLatestMessage ?? params.vendorText ?? "").toLowerCase();
      let tone = "neutral";
      let note = "";
      if (
        text.includes("starts at") ||
        text.includes("technician will confirm") ||
        text.includes("depends on")
      ) {
        tone = "evasive";
        note = "Vendor used uncertain language around pricing.";
      } else if (
        text.includes("all-in") ||
        text.includes("total") ||
        text.includes("no additional")
      ) {
        tone = "transparent";
        note = "Vendor gave clear all-in pricing language.";
      } else if (text.includes("drill") && !text.includes("no drill")) {
        tone = "aggressive";
        note = "Vendor mentioned drilling without a non-destructive-first policy.";
      }
      return NextResponse.json({ success: true, tone, note });
    }

    case "update_negotiation": {
      const context = resolveMissionForWrite(params, body, "closer");
      if (!context.mission) {
        return NextResponse.json({ error: context.error }, { status: 422 });
      }
      const mission = context.mission;
      recordLiveToolReceived(mission, context.call, "update_negotiation");
      if (context.error) {
        recordLiveToolRejection(
          mission,
          context.call,
          "update_negotiation",
          context.error
        );
        setMission(mission);
        return NextResponse.json({ error: context.error }, { status: 422 });
      }
      if (context.call) {
        markLiveSandboxPhoneAnswered(context.call, "correlated_tool_webhook");
      }

      const negotiation = mission.negotiation;
      if (!negotiation || !leverageStillMatchesMission(mission, negotiation.leverage)) {
        return NextResponse.json(
          { error: "Stored negotiation context or leverage is invalid" },
          { status: 409 }
        );
      }
      const quoteId = String(params.quoteId ?? params.quote_id ?? negotiation.targetQuoteId);
      const quoteIndex = mission.quotes.findIndex((quote) => quote.id === quoteId);
      const current = mission.quotes[quoteIndex];
      const beforePrice = Number(params.beforePrice ?? current?.totalEstimate);
      const afterPrice = Number(params.afterPrice ?? params.newTotal);
      if (
        !current ||
        current.id !== negotiation.targetQuoteId ||
        current.totalEstimate !== beforePrice ||
        !Number.isFinite(afterPrice) ||
        afterPrice > mission.jobSpec.maxPrice
      ) {
        return NextResponse.json(
          { error: "Negotiated terms do not match the stored target or budget" },
          { status: 422 }
        );
      }

      const updated = structuredClone(current);
      updated.totalEstimate = afterPrice;
      updated.isTotalAllIn = params.isTotalAllIn === undefined
        ? true
        : Boolean(params.isTotalAllIn);
      updated.priceOrTermsChanged = Boolean(params.priceOrTermsChanged ?? true);
      updated.transcriptEvidence.push(...toStringArray(params.transcriptEvidence));
      const [score, level] = calculateRiskScore(updated, mission.jobSpec);
      updated.riskScore = score;
      updated.riskLevel = level;
      mission.quotes[quoteIndex] = updated;

      negotiation.status = updated.priceOrTermsChanged ? "secured" : "no_improvement";
      negotiation.afterPrice = afterPrice;
      negotiation.isTotalAllIn = updated.isTotalAllIn;
      negotiation.changedTerms = toStringArray(params.termsChanged);
      negotiation.transcriptEvidence = toStringArray(params.transcriptEvidence);
      negotiation.completedAt = new Date().toISOString();
      mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
      mission.approval = {
        status: "pending",
        quoteId: updated.id,
        total: afterPrice,
        dispatchAuthorized: false,
      };
      mission.status = "terms_secured";
      delete mission.orchestration.liveFallbackAt;

      const closerCall = mission.vendorCalls.find((call) => call.id === context.callId);
      if (closerCall) {
        closerCall.status = "complete";
        closerCall.completedAt = negotiation.completedAt;
        markLiveSandboxQuoteSaved(closerCall);
      }
      addMissionEvent(mission, {
        event: "negotiation_persisted",
        details: `Confirmed $${afterPrice} all-in terms persisted. Dispatch remains unauthorized.`,
        vendorId: updated.vendorId,
        category: "tool",
        toolName: "negotiation_persisted",
      });
      setMission(mission);
      return NextResponse.json({ success: true, updatedQuote: updated });
    }

    default:
      return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 422 });
  }
}
