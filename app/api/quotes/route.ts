import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import type { QuotePayload, Quote } from "@/lib/types";
import { getMission, setMission } from "@/lib/store";
import { calculateRiskScore } from "@/lib/riskScore";
import { rankQuotes } from "@/lib/ranking";

export async function POST(request: NextRequest) {
  let body: QuotePayload & { missionId: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.missionId) {
    return NextResponse.json({ error: "missionId is required" }, { status: 422 });
  }

  const mission = getMission(body.missionId);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  // Build the quote with auto-scored risk
  const partialQuote: Quote = {
    id: uuid(),
    missionId: body.missionId,
    vendorName: body.vendorName ?? "",
    phone: body.phone ?? "",
    etaMinutes: body.etaMinutes ?? null,
    dispatchFee: body.dispatchFee ?? null,
    laborFee: body.laborFee ?? null,
    partsFee: body.partsFee ?? null,
    afterHoursFee: body.afterHoursFee ?? null,
    taxesAndOther: body.taxesAndOther ?? null,
    totalEstimate: body.totalEstimate ?? null,
    isTotalAllIn: body.isTotalAllIn ?? false,
    drillingPolicy: body.drillingPolicy ?? "",
    idRequired: body.idRequired ?? null,
    oldKeyDisabled: body.oldKeyDisabled ?? null,
    keysIncluded: body.keysIncluded ?? null,
    warranty: body.warranty ?? null,
    quoteConfidence: body.quoteConfidence ?? "callback",
    redFlags: body.redFlags ?? [],
    riskScore: 0,
    riskLevel: "Low",
    transcriptEvidence: body.transcriptEvidence ?? [],
    transcript: body.transcript ?? "",
    priceOrTermsChanged: body.priceOrTermsChanged ?? false,
    voiceTrustSignals: [],
    voiceTrustScore: 50, // default until voice-trust is called
  };

  // Auto-score risk
  const [riskScore, riskLevel] = calculateRiskScore(partialQuote, mission.jobSpec);
  const quote: Quote = { ...partialQuote, riskScore, riskLevel };

  mission.quotes.push(quote);
  mission.callLog.push({
    timestamp: new Date().toISOString(),
    event: "quote_received",
    details: `${quote.vendorName}: ${
      quote.totalEstimate !== null ? `$${quote.totalEstimate}` : "no total"
    } — risk ${quote.riskLevel}`,
  });

  // Auto-rank once we have 3+ quotes
  if (mission.quotes.length >= 3) {
    mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
    mission.status = "awaiting_vendor_selection";
  } else {
    mission.status = "calling_vendors";
  }

  setMission(mission);

  return NextResponse.json(quote, { status: 201 });
}
