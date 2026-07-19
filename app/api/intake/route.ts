import { NextRequest, NextResponse } from "next/server";

// In-memory store for the demo — no database needed
const missions: Record<string, unknown> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields from the JobSpec type
    if (!body.caseType || !body.authorizationConfirmed) {
      return NextResponse.json(
        { error: "Missing required fields: caseType or authorizationConfirmed" },
        { status: 400 }
      );
    }

    // For the demo, we always use mission-001 so the mock data matches
    const missionId = "mission-001";

    const mission = {
      id: missionId,
      status: "calling_vendors",
      jobSpec: {
        id: missionId,
        caseType: body.caseType,
        urgency: body.urgency ?? "locked_out_now",
        propertyType: body.propertyType ?? "apartment",
        doorType: body.doorType ?? "main_entry",
        lockType: body.lockType ?? "deadbolt",
        doorOpen: body.doorOpen ?? false,
        keyStolen: body.keyStolen ?? false,
        brokenKeyVisible: body.brokenKeyVisible ?? false,
        needRekey: body.needRekey ?? false,
        newKeysNeeded: body.newKeysNeeded ?? 1,
        idealPrice: body.idealPrice ?? 120,
        maxPrice: body.maxPrice ?? 150,
        budgetFlexibility: body.budgetFlexibility ?? "strict",
        approvalRequiredAboveBudget: body.approvalRequiredAboveBudget ?? true,
        authorizationConfirmed: body.authorizationConfirmed,
        locationCity: body.locationCity ?? "San Francisco",
        locationZip: body.locationZip ?? "94109",
        createdAt: new Date().toISOString(),
      },
      quotes: [],
      callLog: ["Intake complete"],
      recommendation: null,
    };

    missions[missionId] = mission;

    return NextResponse.json({ id: missionId }, { status: 201 });
  } catch (err) {
    console.error("Intake error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ missions: Object.keys(missions) });
}
