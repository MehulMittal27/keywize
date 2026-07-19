import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { advanceMissionOrchestration } from "@/lib/demoOrchestrator";
import {
  advanceLiveSandboxCallerCalls,
  refreshLiveSandboxCallStatuses,
} from "@/lib/liveSandbox";

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
  if (diagnosticsChanged || liveCallsChanged || orchestrationChanged) {
    setMission(mission);
  }

  return NextResponse.json(mission, {
    headers: { "Cache-Control": "no-store" },
  });
}
