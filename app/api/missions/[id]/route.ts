import { NextRequest, NextResponse } from "next/server";
import { getMission } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mission = getMission(id);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  return NextResponse.json(mission);
}
