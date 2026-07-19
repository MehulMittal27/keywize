import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { advanceMissionOrchestration } from "@/lib/demoOrchestrator";
import { addMissionEvent } from "@/lib/missionEvents";
import {
  advanceLiveSandboxCallerCalls,
  refreshLiveSandboxCallStatuses,
} from "@/lib/liveSandbox";

const MOCK_RECORDING_URL = "/recordings/mock-call.m4a";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mission = getMission(id);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const diagnosticsChanged = await refreshLiveSandboxCallStatuses(mission);
  const liveCallsChanged = await advanceLiveSandboxCallerCalls(mission);
  const orchestrationChanged = advanceMissionOrchestration(mission);
  let changed = diagnosticsChanged || liveCallsChanged || orchestrationChanged;

  const offer = mission.selectedMockOffer;
  if (offer && offer.status === "pending" && Date.now() >= Date.parse(offer.readyAt)) {
    offer.status = "ready";
    mission.recordingUrl = MOCK_RECORDING_URL;
    addMissionEvent(mission, {
      event: "booking_confirmed",
      details: `${offer.name} confirmed the booking. Call recording is available.`,
      category: "status",
    });
    changed = true;
  }

  if (changed) {
    setMission(mission);
  }

  return NextResponse.json(mission, {
    headers: { "Cache-Control": "no-store" },
  });
}
