import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import type { IntakePayload, JobSpec, MissionMode } from "@/lib/types";
import { createMissionShell, startMission } from "@/lib/missionService";
import { toPublicMission } from "@/lib/publicMission";
import { clampMaxPrice } from "@/lib/jobSpec";

// Required fields with human-readable prompts
const REQUIRED_FIELDS: (keyof IntakePayload)[] = [
  "caseType",
  "urgency",
  "propertyType",
  "doorType",
  "lockType",
  "idealPrice",
  "maxPrice",
  "budgetFlexibility",
  "authorizationConfirmed",
  "locationCity",
  "locationZip",
];

const FIELD_PROMPTS: Partial<Record<keyof IntakePayload, string>> = {
  caseType: "What type of lockout case is this?",
  urgency: "How urgent is this situation?",
  propertyType: "What type of property is this?",
  doorType: "Which door needs service?",
  lockType: "What type of lock is on the door?",
  idealPrice: "What is your ideal price for this service?",
  maxPrice: "What is the maximum you can spend without approval?",
  budgetFlexibility: "How flexible is your budget?",
  authorizationConfirmed: "Has the user confirmed they are authorized to request locksmith service?",
  locationCity: "What city is the property in?",
  locationZip: "What is the zip code?",
};

export async function POST(request: NextRequest) {
  let body: Partial<IntakePayload> & { mode?: MissionMode };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  const missing: { field: string; prompt: string }[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      missing.push({ field, prompt: FIELD_PROMPTS[field] ?? field });
    }
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Missing required fields", missing },
      { status: 422 }
    );
  }

  // authorizationConfirmed must be true - safety requirement
  if (!body.authorizationConfirmed) {
    return NextResponse.json(
      {
        error: "Authorization not confirmed",
        message:
          "The user must confirm they are authorized to request locksmith service and can show proof of residence.",
      },
      { status: 422 }
    );
  }

  const payload = body as IntakePayload;

  const jobSpec: JobSpec = {
    id: uuid(),
    caseType: payload.caseType,
    urgency: payload.urgency,
    propertyType: payload.propertyType,
    doorType: payload.doorType,
    lockType: payload.lockType,
    doorOpen: payload.doorOpen ?? false,
    keyStolen: payload.keyStolen ?? false,
    brokenKeyVisible: payload.brokenKeyVisible ?? false,
    needRekey: payload.needRekey ?? false,
    newKeysNeeded: payload.newKeysNeeded ?? 1,
    idealPrice: payload.idealPrice,
    maxPrice: clampMaxPrice(payload.idealPrice, payload.maxPrice),
    budgetFlexibility: payload.budgetFlexibility,
    approvalRequiredAboveBudget: payload.approvalRequiredAboveBudget ?? true,
    authorizationConfirmed: true,
    locationCity: payload.locationCity,
    locationZip: payload.locationZip,
    createdAt: new Date().toISOString(),
  };

  const mode: MissionMode = body.mode === "live_sandbox" ? "live_sandbox" : "reliable_demo";
  const mission = createMissionShell(uuid(), jobSpec, mode);
  await startMission(mission);

  return NextResponse.json(toPublicMission(mission), { status: 201 });
}
