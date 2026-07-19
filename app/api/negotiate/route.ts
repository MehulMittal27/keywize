import { NextRequest, NextResponse } from "next/server";
import { addMissionEvent } from "@/lib/missionEvents";
import { selectStoredLeverage } from "@/lib/leverage";
import { startLiveSandboxNegotiation } from "@/lib/liveSandbox";
import { getMission, setMission } from "@/lib/store";
import type { VendorCall } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: { missionId?: string; targetQuoteId?: string };
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
  if (mission.status !== "quotes_ready" && mission.status !== "awaiting_vendor_selection") {
    return NextResponse.json(
      { error: "Quotes are not ready for negotiation", currentStatus: mission.status },
      { status: 409 }
    );
  }

  const explicitTarget = body.targetQuoteId
    ? mission.quotes.find((quote) => quote.id === body.targetQuoteId)
    : undefined;
  const fastestOverBudget = mission.quotes
    .filter(
      (quote) =>
        quote.vendorId &&
        quote.totalEstimate !== null &&
        quote.totalEstimate > mission.jobSpec.maxPrice &&
        quote.isTotalAllIn &&
        quote.riskLevel !== "High"
    )
    .sort(
      (a, b) =>
        (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity)
    )[0];
  const target = explicitTarget ?? fastestOverBudget;

  if (!target?.vendorId || target.totalEstimate === null) {
    return NextResponse.json(
      { error: "No eligible fastest option is available to negotiate" },
      { status: 422 }
    );
  }
  if (target.riskLevel === "High" || !target.isTotalAllIn) {
    return NextResponse.json(
      { error: "The selected quote is not eligible for safe negotiation" },
      { status: 422 }
    );
  }

  const leverage = selectStoredLeverage(mission, target.id);
  if (!leverage) {
    return NextResponse.json(
      { error: "No stored, evidence-backed all-in quote is eligible as leverage" },
      { status: 422 }
    );
  }

  mission.selectedVendorId = target.id;
  mission.negotiation = {
    targetQuoteId: target.id,
    targetVendorId: target.vendorId,
    status: "in_progress",
    beforePrice: target.totalEstimate,
    changedTerms: [],
    leverage,
    transcriptEvidence: [],
    startedAt: new Date().toISOString(),
    fallbackUsed: false,
  };
  mission.status = "negotiating";
  mission.orchestration.negotiationCursor = 0;
  mission.orchestration.nextActionAt = new Date(Date.now() + 250).toISOString();
  delete mission.orchestration.liveFallbackAt;

  const closerCall: VendorCall = {
    id: `${mission.id}-closer-${target.vendorId}`,
    vendorId: target.vendorId,
    vendorName: target.vendorName,
    role: "closer",
    status: "queued",
    mode: mission.mode,
    fallbackUsed: false,
  };
  mission.vendorCalls = [
    ...mission.vendorCalls.filter((call) => call.role !== "closer"),
    closerCall,
  ];

  addMissionEvent(mission, {
    event: "leverage_selected",
    details: `${leverage.vendorName}'s stored $${leverage.total} all-in, no-drill-first quote was validated as leverage.`,
    vendorId: leverage.sourceVendorId,
    category: "negotiation",
  });
  addMissionEvent(mission, {
    event: "negotiation_started",
    details: `Negotiating the fastest option from $${target.totalEstimate} toward $145 all-in. This does not authorize dispatch.`,
    vendorId: target.vendorId,
    category: "negotiation",
  });

  if (mission.mode === "live_sandbox") {
    mission.orchestration.replayActive = false;
    await startLiveSandboxNegotiation(mission);
  } else {
    mission.orchestration.replayActive = true;
  }
  setMission(mission);

  return NextResponse.json({
    mission,
    negotiationStarted: true,
    targetQuoteId: target.id,
    leverageQuoteId: leverage.sourceQuoteId,
  });
}
