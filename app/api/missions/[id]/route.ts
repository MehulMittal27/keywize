import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { advanceMissionOrchestration } from "@/lib/demoOrchestrator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mission = getMission(id);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  if (advanceMissionOrchestration(mission)) {
    setMission(mission);
  }

  return NextResponse.json(mission, {
    headers: { "Cache-Control": "no-store" },
  });
}
