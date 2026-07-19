import { NextRequest, NextResponse } from "next/server";
import { mockMission } from "../../../../lib/mockData";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // For the demo, return the mock mission for any id
  const mission = {
    ...mockMission,
    id,
  };

  return NextResponse.json(mission);
}
