import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";

/**
 * POST /api/missions/[id]/select-vendor
 *
 * Called after session 1 ends and the user picks a vendor from the ranked list.
 * Body: { vendorId: string }
 *
 * Transitions mission status: "awaiting_vendor_selection" → "negotiating"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { vendorId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.vendorId) {
    return NextResponse.json({ error: "vendorId is required" }, { status: 422 });
  }

  const mission = getMission(id);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  if (mission.status !== "awaiting_vendor_selection") {
    return NextResponse.json(
      {
        error: "Mission is not awaiting vendor selection",
        currentStatus: mission.status,
      },
      { status: 409 }
    );
  }

  // Validate the selected vendor exists and is not disqualified
  const selectedQuote = mission.quotes.find((q) => q.id === body.vendorId);
  if (!selectedQuote) {
    return NextResponse.json(
      { error: "Vendor not found in this mission's quotes" },
      { status: 404 }
    );
  }
  if (selectedQuote.quoteConfidence === "declined") {
    return NextResponse.json(
      { error: "Cannot select a disqualified vendor" },
      { status: 422 }
    );
  }

  mission.selectedVendorId = body.vendorId;
  mission.status = "negotiating";
  mission.callLog.push({
    timestamp: new Date().toISOString(),
    event: "vendor_selected",
    details: `User selected ${selectedQuote.vendorName} for session 2 negotiation.`,
  });

  setMission(mission);

  return NextResponse.json({
    missionId: mission.id,
    selectedVendorId: mission.selectedVendorId,
    selectedVendorName: selectedQuote.vendorName,
    status: mission.status,
  });
}
