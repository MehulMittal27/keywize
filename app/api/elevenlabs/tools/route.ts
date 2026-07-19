import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { addMissionEvent } from "@/lib/missionEvents";
import { createMissionShell, startMission } from "@/lib/missionService";
import { getPrivateCallCorrelation } from "@/lib/liveSandbox";
import { leverageStillMatchesMission } from "@/lib/leverage";
import { getMission, listMissions, setMission } from "@/lib/store";
import { analyzeVoiceTrust } from "@/lib/voiceTrust";
import { calculateRiskScore } from "@/lib/riskScore";
import { rankQuotes } from "@/lib/ranking";
import { clampMaxPrice } from "@/lib/jobSpec";
import type {
  JobSpec,
  Mission,
  Quote,
  QuoteConfidence,
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

function resolveMissionForWrite(params: Record<string, unknown>): {
  mission?: Mission;
  callId: string;
  error?: string;
} {
  const missionId = String(params.missionId ?? params.mission_id ?? "");
  const callId = String(params.callId ?? params.call_id ?? "");
  const mission = missionId ? getMission(missionId) : getLatestMission();
  if (!mission) return { callId, error: "Mission not found" };

  if (mission.mode === "live_sandbox") {
    if (mission.orchestration.replayActive && mission.fallbackReason) {
      return { callId, error: "Mission has already switched to reliable replay" };
    }
    if (!missionId || !callId) {
      return {
        callId,
        error: "missionId and callId correlation are required for live sandbox writes",
      };
    }
    const correlation = getPrivateCallCorrelation(callId);
    if (!correlation || correlation.missionId !== mission.id) {
      return { callId, error: "Live sandbox call correlation is invalid" };
    }
  }
  return { mission, callId };
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
      const context = resolveMissionForWrite(params);
      if (!context.mission) {
        return NextResponse.json({ error: context.error }, { status: 422 });
      }
      const mission = context.mission;
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
        isTotalAllIn: Boolean(params.isTotalAllIn),
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

      const call = mission.vendorCalls.find((candidate) => candidate.id === context.callId);
      if (call) {
        call.quoteId = quote.id;
        call.status = "complete";
        call.completedAt = new Date().toISOString();
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
      const context = resolveMissionForWrite(params);
      if (!context.mission) {
        return NextResponse.json({ error: context.error }, { status: 422 });
      }
      const mission = context.mission;
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
