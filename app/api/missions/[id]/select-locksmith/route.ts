import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { addMissionEvent } from "@/lib/missionEvents";

const MOCK_EXECUTION_DELAY_MS = 4000;

/**
 * POST /api/missions/[id]/select-locksmith
 *
 * Called when the user picks a locksmith from the "Basic price" or
 * "Negotiated offers" list. Resolves the selection against the mission's
 * real stored quote (never trusts client-supplied price/name), stores it,
 * and starts a mocked "agent is executing the booking" delay; GET
 * /api/missions/[id] flips it to "ready" (with a mock call recording) once
 * the delay has elapsed.
 *
 * Body: { quoteId }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { quoteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 422 });
  }

  const mission = getMission(id);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const quote = mission.quotes.find((candidate) => candidate.id === body.quoteId);
  if (!quote) {
    return NextResponse.json({ error: "Quote not found in this mission" }, { status: 404 });
  }
  if (quote.vendorId === "vendor_a") {
    return NextResponse.json(
      { error: "This vendor is flagged high risk and cannot be selected" },
      { status: 422 }
    );
  }

  const price =
    quote.vendorId === "vendor_c"
      ? (mission.negotiation?.afterPrice ?? mission.negotiation?.beforePrice ?? quote.totalEstimate)
      : quote.totalEstimate;
  if (price === null || price === undefined) {
    return NextResponse.json({ error: "This quote has no firm price to book" }, { status: 422 });
  }

  const now = new Date();
  mission.selectedVendorId = quote.vendorId;
  mission.selectedMockOffer = {
    offerId: quote.id,
    name: quote.vendorName,
    phone: quote.phone || "Handled by Keywize",
    address: `${mission.jobSpec.locationCity}, ${mission.jobSpec.locationZip}`,
    price,
    status: "pending",
    selectedAt: now.toISOString(),
    readyAt: new Date(now.getTime() + MOCK_EXECUTION_DELAY_MS).toISOString(),
  };
  mission.recordingUrl = undefined;

  addMissionEvent(mission, {
    event: "locksmith_selected",
    details: `User selected ${quote.vendorName} at $${price}. Waiting for the agent to confirm the booking.`,
    vendorId: quote.vendorId,
    category: "status",
  });

  setMission(mission);

  return NextResponse.json({ success: true, mission });
}
