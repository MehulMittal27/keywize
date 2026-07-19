import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import type { IntakePayload, Mission, JobSpec } from "@/lib/types";
import { getMission, setMission } from "@/lib/store";
import { rankQuotes } from "@/lib/ranking";
import { getDemoQuotesForMission } from "@/lib/mockData";
import { findLocksmithsNearby } from "@/lib/openai";
import { mockRunPriceDiscovery } from "@/lib/priceDiscovery";

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
  let body: Partial<IntakePayload>;

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

  // authorizationConfirmed must be true — safety requirement
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
    maxPrice: payload.maxPrice,
    budgetFlexibility: payload.budgetFlexibility,
    approvalRequiredAboveBudget: payload.approvalRequiredAboveBudget ?? true,
    authorizationConfirmed: true,
    locationCity: payload.locationCity,
    locationZip: payload.locationZip,
    createdAt: new Date().toISOString(),
  };

  const missionId = uuid();
  const demoQuotes = getDemoQuotesForMission(missionId);

  const mission: Mission = {
    id: missionId,
    jobSpec,
    quotes: demoQuotes,
    status: "quotes_collected",
    callLog: [
      {
        timestamp: new Date().toISOString(),
        event: "intake_complete",
        details: `Case: ${jobSpec.caseType}. Max budget: $${jobSpec.maxPrice}.`,
      },
      {
        timestamp: new Date().toISOString(),
        event: "demo_calls_queued",
        details: "Demo mode queued three mock locksmith calls.",
      },
      {
        timestamp: new Date().toISOString(),
        event: "quote_received",
        details: "Speedy Lock & Key: starts at $39. High risk flagged.",
      },
      {
        timestamp: new Date().toISOString(),
        event: "quote_received",
        details: "Neighborhood Locksmith: $130 all-in. Low risk.",
      },
      {
        timestamp: new Date().toISOString(),
        event: "quote_received",
        details: "Premium Secure: $165 initial offer. Ready to negotiate.",
      },
    ],
    recommendation: rankQuotes(demoQuotes, jobSpec),
  };

  setMission(mission);

  // Trigger background search for real locksmiths
  if (jobSpec.locationCity && jobSpec.locationZip) {
    findLocksmithsNearby(jobSpec.locationCity, jobSpec.locationZip)
      .then((leads) => {
        const currentMission = getMission(missionId);
        if (currentMission) {
          currentMission.locksmithLeads = leads;
          currentMission.callLog.push({
            timestamp: new Date().toISOString(),
            event: "background_search_complete",
            details: `Found ${leads.length} locksmiths near ${jobSpec.locationCity}, ${jobSpec.locationZip}.`,
          });

          // Immediately run mock price discovery against the discovered leads
          const priceResults = mockRunPriceDiscovery(leads);
          currentMission.priceResults = priceResults;
          const quoted = priceResults.filter((r) => r.basicPrice !== null).length;
          currentMission.callLog.push({
            timestamp: new Date().toISOString(),
            event: "price_discovery_complete",
            details: `${quoted} of ${priceResults.length} agents returned a price. Results sorted ascending.`,
          });

          setMission(currentMission);
          console.log(`[Background Search] Found ${leads.length} locksmiths for mission ${missionId}:`);
          leads.forEach((lead) => {
            console.log(` - ${lead.name}: ${lead.phone}`);
          });
        }
      })
      .catch((error) => {
        console.error(`[Background Search] Failed to fetch locksmiths:`, error);
      });
  }

  return NextResponse.json(mission, { status: 201 });
}
