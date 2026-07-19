import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { calculateRiskScore } from "@/lib/riskScore";
import { rankQuotes } from "@/lib/ranking";

/**
 * POST /api/negotiate
 *
 * Simulates the negotiation step.
 * Finds "SpeedKey Express" (or the highest-priced over-budget quote) and:
 *   - Drops total to $145
 *   - Marks isTotalAllIn = true
 *   - Adds 2 keys
 *   - Sets priceOrTermsChanged = true
 *   - Appends transcript evidence and call log entry
 *   - Re-scores risk and re-ranks all quotes
 *
 * Body: { missionId: string }
 */
export async function POST(request: NextRequest) {
  let body: { missionId: string };

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

  if (mission.quotes.length === 0) {
    return NextResponse.json(
      { error: "No quotes available to negotiate" },
      { status: 422 }
    );
  }

  // Find the target vendor: use the user's selection first, then fall back to the
  // highest over-budget quote (for backward compat with the demo reset flow).
  const maxPrice = mission.jobSpec.maxPrice;
  const target =
    (mission.selectedVendorId
      ? mission.quotes.find((q) => q.id === mission.selectedVendorId)
      : undefined) ??
    mission.quotes
      .filter((q) => q.totalEstimate !== null && q.totalEstimate > maxPrice)
      .sort((a, b) => (b.totalEstimate ?? 0) - (a.totalEstimate ?? 0))[0];

  if (!target) {
    return NextResponse.json(
      { error: "No over-budget vendor found to negotiate with" },
      { status: 422 }
    );
  }

  const negotiationLine =
    `I have another confirmed quote at $130 all-in with no-drill first. ` +
    `You are faster — can you get to $145 all-in or include two keys?`;

  const vendorReply =
    `You know what, I can do $145 all-in and I'll throw in two keys. ` +
    `Let's get you back inside quickly.`;

  // Update the vendor quote
  const idx = mission.quotes.findIndex((q) => q.id === target!.id);
  const updated = { ...mission.quotes[idx] };
  updated.totalEstimate = 145;
  updated.isTotalAllIn = true;
  updated.keysIncluded = 2;
  updated.priceOrTermsChanged = true;
  updated.transcriptEvidence = [
    ...updated.transcriptEvidence,
    `"${vendorReply}"`,
  ];
  updated.transcript =
    updated.transcript +
    `\n\nNEGOTIATION:\nAgent: ${negotiationLine}\nVendor: ${vendorReply}`;

  // Re-score risk after improvement
  const [newScore, newLevel] = calculateRiskScore(updated, mission.jobSpec);
  updated.riskScore = newScore;
  updated.riskLevel = newLevel;

  mission.quotes[idx] = updated;

  mission.callLog.push({
    timestamp: new Date().toISOString(),
    event: "negotiation_complete",
    details: `${updated.vendorName} agreed: $145 all-in + 2 keys`,
  });

  // Re-rank all quotes
  mission.recommendation = rankQuotes(mission.quotes, mission.jobSpec);
  mission.status = "negotiating";

  setMission(mission);

  return NextResponse.json({
    mission,
    negotiatedQuote: updated,
    negotiationLine,
    vendorReply,
  });
}
