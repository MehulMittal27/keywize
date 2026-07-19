import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { addMissionEvent } from "@/lib/missionEvents";

const MOCK_EXECUTION_DELAY_MS = 4000;

/**
 * POST /api/missions/[id]/select-locksmith
 *
 * Called when the user picks a locksmith from the mock "Basic price" or
 * "Negotiated offers" list. Stores the selection and starts a mocked
 * "agent is executing the booking" delay; GET /api/missions/[id] flips it
 * to "ready" (with a mock call recording) once the delay has elapsed.
 *
 * Body: { offerId, name, phone, address, price }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { offerId?: string; name?: string; phone?: string; address?: string; price?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.offerId || !body.name || typeof body.price !== "number") {
    return NextResponse.json(
      { error: "offerId, name, and price are required" },
      { status: 422 }
    );
  }

  const mission = getMission(id);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const now = new Date();
  mission.selectedMockOffer = {
    offerId: body.offerId,
    name: body.name,
    phone: body.phone ?? "",
    address: body.address ?? "",
    price: body.price,
    status: "pending",
    selectedAt: now.toISOString(),
    readyAt: new Date(now.getTime() + MOCK_EXECUTION_DELAY_MS).toISOString(),
  };
  mission.recordingUrl = undefined;

  addMissionEvent(mission, {
    event: "locksmith_selected",
    details: `User selected ${body.name} at $${body.price}. Waiting for the agent to confirm the booking.`,
    category: "status",
  });

  setMission(mission);

  return NextResponse.json({ success: true, mission });
}
