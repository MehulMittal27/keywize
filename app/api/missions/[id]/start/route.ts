import { NextRequest, NextResponse } from "next/server";
import { createVendorCalls } from "@/lib/mockData";
import { getMission, setMission } from "@/lib/store";
import { toPublicMission } from "@/lib/publicMission";
import { startMission } from "@/lib/missionService";
import type { MissionMode } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { mode?: MissionMode };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.mode !== "reliable_demo" && body.mode !== "live_sandbox") {
    return NextResponse.json(
      { error: "mode must be reliable_demo or live_sandbox" },
      { status: 422 }
    );
  }

  const mission = getMission(id);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }
  if (mission.status !== "intake_complete" || mission.quotes.length > 0) {
    return NextResponse.json(
      { error: "Mission orchestration has already started" },
      { status: 409 }
    );
  }

  mission.mode = body.mode;
  mission.vendorCalls = createVendorCalls(body.mode, mission.id);
  setMission(mission);
  await startMission(mission);

  return NextResponse.json({ mission: toPublicMission(mission) });
}
