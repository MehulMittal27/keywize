import { NextResponse } from "next/server";
import { resetDemoMission } from "@/lib/store";
import { DEMO_MISSION_ID } from "@/lib/mockData";

/**
 * POST /api/demo/reset
 * Resets the demo mission to its default pre-negotiation state.
 * Use this before hackathon demo to ensure a clean run.
 */
export async function POST() {
  const mission = resetDemoMission();
  return NextResponse.json({ reset: true, missionId: DEMO_MISSION_ID, mission });
}
