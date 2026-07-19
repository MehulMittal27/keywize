import { NextRequest, NextResponse } from "next/server";
import { addMissionEvent } from "@/lib/missionEvents";
import { getMission, setMission } from "@/lib/store";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mission = getMission(id);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }
  if (mission.status !== "terms_secured" && mission.status !== "awaiting_approval") {
    return NextResponse.json(
      { error: "Confirmed terms are not awaiting approval" },
      { status: 409 }
    );
  }
  if (!mission.approval || !mission.jobSpec.authorizationConfirmed) {
    return NextResponse.json(
      { error: "Authorization and a stored quote are required" },
      { status: 422 }
    );
  }

  mission.approval.status = "approved";
  mission.approval.approvedAt = new Date().toISOString();
  mission.status = "approved";
  addMissionEvent(mission, {
    event: "quote_approved",
    details: `The user approved the stored $${mission.approval.total} quote. Dispatch is still not authorized or confirmed.`,
    category: "approval",
  });
  setMission(mission);

  return NextResponse.json({
    approved: true,
    dispatchAuthorized: false,
    status: mission.status,
  });
}
