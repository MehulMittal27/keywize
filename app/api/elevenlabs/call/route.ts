import { NextRequest, NextResponse } from "next/server";
import type { ElevenLabsCallPayload } from "@/lib/types";
import { getMission } from "@/lib/store";
import { CASE_REGISTRY } from "@/lib/cases";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const AGENT_PHONE_NUMBER_ID = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;

/**
 * POST /api/elevenlabs/call
 *
 * Triggers an ElevenLabs outbound call via Twilio.
 * Builds dynamic variables from the mission's job spec so the AI agent
 * knows exactly what to say on the call.
 *
 * Body: { missionId: string, toNumber: string }
 */
export async function POST(request: NextRequest) {
  let body: ElevenLabsCallPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.missionId || !body.toNumber) {
    return NextResponse.json(
      { error: "missionId and toNumber are required" },
      { status: 422 }
    );
  }

  const mission = getMission(body.missionId);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  // Check env config
  if (!ELEVENLABS_API_KEY || !AGENT_ID || !AGENT_PHONE_NUMBER_ID) {
    return NextResponse.json(
      {
        error: "ElevenLabs integration not configured",
        message:
          "Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_AGENT_PHONE_NUMBER_ID in your environment.",
      },
      { status: 503 }
    );
  }

  const { jobSpec } = mission;
  const caseDef = CASE_REGISTRY[jobSpec.caseType];

  // Build dynamic variables for the ElevenLabs agent
  const dynamicVariables: Record<string, string> = {
    case_type: jobSpec.caseType,
    case_label: caseDef?.label ?? jobSpec.caseType,
    urgency: jobSpec.urgency,
    location: `${jobSpec.locationCity}, ${jobSpec.locationZip}`,
    door_type: jobSpec.doorType,
    lock_type: jobSpec.lockType,
    ideal_price: String(jobSpec.idealPrice),
    max_price: String(jobSpec.maxPrice),
    budget_flexibility: jobSpec.budgetFlexibility,
    need_rekey: String(jobSpec.needRekey),
    new_keys_needed: String(jobSpec.newKeysNeeded),
    key_stolen: String(jobSpec.keyStolen),
    quote_line_items: (caseDef?.quoteLineItems ?? []).join(", "),
    negotiation_goals: (caseDef?.negotiationGoals ?? []).join("; "),
    vendor_questions: (caseDef?.vendorQuestions ?? []).join("; "),
    red_flags_to_watch: (caseDef?.redFlags ?? []).join("; "),
  };

  // Include existing quotes as leverage for negotiation calls
  if (mission.quotes.length > 0) {
    const bestQuote = mission.quotes
      .filter((q) => q.riskLevel !== "High" && q.isTotalAllIn && q.totalEstimate !== null)
      .sort((a, b) => (a.totalEstimate ?? Infinity) - (b.totalEstimate ?? Infinity))[0];

    if (bestQuote) {
      dynamicVariables.best_competing_quote = `$${bestQuote.totalEstimate} all-in from ${bestQuote.vendorName}`;
      dynamicVariables.best_vendor_eta = String(bestQuote.etaMinutes ?? "unknown");
    }
  }

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: AGENT_ID,
          agent_phone_number_id: AGENT_PHONE_NUMBER_ID,
          to_number: body.toNumber,
          conversation_initiation_client_data: {
            dynamic_variables: dynamicVariables,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: "ElevenLabs call failed", details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      call_initiated: true,
      conversation_id: data.conversation_id ?? null,
      call_sid: data.call_sid ?? null,
      mission_id: body.missionId,
    });
  } catch (err) {
    console.error("ElevenLabs call error:", err);
    return NextResponse.json(
      { error: "Failed to initiate call", details: String(err) },
      { status: 500 }
    );
  }
}
