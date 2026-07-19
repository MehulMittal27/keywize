import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getMission, listMissions, setMission } from "@/lib/store";
import { analyzeVoiceTrust } from "@/lib/voiceTrust";
import { calculateRiskScore } from "@/lib/riskScore";
import { rankQuotes } from "@/lib/ranking";

/**
 * POST /api/elevenlabs/tools
 *
 * Receives tool calls from the ElevenLabs conversation agent.
 * The agent calls this endpoint with a JSON body containing:
 *   { tool_name: string, parameters: object }
 *
 * Older { tool, payload }, { tool, params }, or simple JSON-string payload
 * bodies are normalized for existing ElevenLabs dashboard configs.
 *
 * Supported tools:
 *   create_job_spec     - creates a mission from gathered intake data
 *   save_quote          - saves a vendor quote to a mission
 *   analyze_voice_trust - runs VoiceTrust analysis on a vendor response
 *   classify_vendor_tone - classifies a vendor response (heuristic)
 *   update_negotiation  - records a negotiation outcome
 */
type ToolRequestBody = Record<string, unknown>;

type NormalizedToolCall = {
  toolName: string;
  parameters: Record<string, unknown>;
};

function normalizeToolCall(body: ToolRequestBody): NormalizedToolCall | null {
  const toolName = firstString(body.tool_name, body.tool, body.name, body.toolName);
  const rawParameters = body.parameters ?? body.params ?? body.args ?? body.input ?? body.payload;
  const parameters = normalizeParameters(rawParameters);

  if (!toolName || !parameters) {
    return null;
  }

  return { toolName, parameters };
}

function normalizeParameters(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") {
    return null;
  }

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
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

function getLatestMission() {
  return listMissions().at(-1);
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
    // ─── create_job_spec ──────────────────────────────────────────────────────
    case "create_job_spec": {
      // Forward to the intake route logic inline
      const id = uuid();
      const mission = {
        id,
        jobSpec: {
          id: uuid(),
          createdAt: new Date().toISOString(),
          ...params,
        },
        quotes: [],
        status: "intake_complete",
        callLog: [
          {
            timestamp: new Date().toISOString(),
            event: "intake_complete",
            details: "Job spec created via ElevenLabs agent.",
          },
        ],
        recommendation: null,
      };
      // @ts-expect-error - agent params are loosely typed; store accepts Mission
      setMission(mission);
      return NextResponse.json({ success: true, missionId: id });
    }

    // ─── save_quote ───────────────────────────────────────────────────────────
    case "save_quote": {
      const missionId = String(params.missionId ?? "");
      const mission = missionId ? getMission(missionId) : getLatestMission();
      if (!mission) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }

      const quote = {
        id: uuid(),
        riskScore: 0,
        riskLevel: "Low" as const,
        voiceTrustSignals: [],
        voiceTrustScore: 50,
        ...params,
        missionId: mission.id,
        redFlags: toStringArray(params.redFlags),
        transcriptEvidence: toStringArray(params.transcriptEvidence),
      };

      // @ts-expect-error - loosely typed from agent
      const [score, level] = calculateRiskScore(quote, mission.jobSpec);
      quote.riskScore = score;
      // @ts-expect-error - loosely typed
      quote.riskLevel = level;

      // @ts-expect-error - loosely typed from agent
      mission.quotes.push(quote);
      mission.callLog.push({
        timestamp: new Date().toISOString(),
        event: "quote_received",
        details: `Quote saved via ElevenLabs agent for vendor: ${params.vendorName ?? "unknown"}`,
      });

      if (mission.quotes.length >= 3) {
        mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
        mission.status = "complete";
      }

      setMission(mission);
      return NextResponse.json({ success: true, quoteId: quote.id });
    }

    // ─── analyze_voice_trust ──────────────────────────────────────────────────
    case "analyze_voice_trust": {
      if (!params.questionType || params.vendorText === undefined) {
        return NextResponse.json(
          { error: "questionType and vendorText are required" },
          { status: 422 }
        );
      }

      const signal = analyzeVoiceTrust({
        quoteId: String(params.quoteId ?? uuid()),
        questionType: params.questionType as never,
        vendorText: String(params.vendorText),
        pauseMs: Number(params.pauseMs ?? 0),
        fillerWords: toStringArray(params.fillerWords),
        evasivePhrases: toStringArray(params.evasivePhrases),
        speechRateChangePct: params.speechRateChangePct as number | undefined,
        pitchVariance: params.pitchVariance as number | undefined,
        volumeVariance: params.volumeVariance as number | undefined,
      });

      return NextResponse.json({ success: true, signal });
    }

    // ─── classify_vendor_tone ─────────────────────────────────────────────────
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
        note = "Vendor used evasive language around pricing.";
      } else if (
        text.includes("all-in") ||
        text.includes("total") ||
        text.includes("no additional")
      ) {
        tone = "transparent";
        note = "Vendor gave clear all-in pricing language.";
      } else if (text.includes("drill") && !text.includes("no drill")) {
        tone = "aggressive";
        note = "Vendor mentioned drilling without non-destructive first policy.";
      }

      return NextResponse.json({ success: true, tone, note });
    }

    // ─── update_negotiation ───────────────────────────────────────────────────
    case "update_negotiation": {
      const missionId = String(params.missionId ?? "");
      const quoteId = String(params.quoteId ?? "");
      const mission = missionId ? getMission(missionId) : getLatestMission();
      if (!mission) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }

      const idx = quoteId
        ? mission.quotes.findIndex((q) => q.id === quoteId)
        : mission.quotes.findIndex((q) => q.vendorName === params.vendorName);
      if (idx === -1) {
        return NextResponse.json({ error: "Quote not found" }, { status: 404 });
      }

      const updated = { ...mission.quotes[idx] };
      if (params.afterPrice !== undefined) updated.totalEstimate = Number(params.afterPrice);
      if (params.newTotal !== undefined) updated.totalEstimate = Number(params.newTotal);
      if (params.isTotalAllIn !== undefined) updated.isTotalAllIn = Boolean(params.isTotalAllIn);
      if (params.keysIncluded !== undefined) updated.keysIncluded = Number(params.keysIncluded);
      updated.priceOrTermsChanged = true;

      const [score, level] = calculateRiskScore(updated, mission.jobSpec);
      updated.riskScore = score;
      updated.riskLevel = level;

      mission.quotes[idx] = updated;
      mission.callLog.push({
        timestamp: new Date().toISOString(),
        event: "negotiation_complete",
        details: `Negotiation recorded via ElevenLabs agent. New total: $${updated.totalEstimate}`,
      });

      mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
      mission.status = "complete";
      setMission(mission);

      return NextResponse.json({ success: true, updatedQuote: updated });
    }

    default:
      return NextResponse.json(
        { error: `Unknown tool: ${toolName}` },
        { status: 422 }
      );
  }
}
