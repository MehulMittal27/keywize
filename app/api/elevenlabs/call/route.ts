import { NextRequest, NextResponse } from "next/server";
import { activateNegotiationFallback, activateReliableFallback } from "@/lib/demoOrchestrator";
import {
  getLiveSandboxConfigStatus,
  initiateSandboxCall,
} from "@/lib/liveSandbox";
import { getMission, setMission } from "@/lib/store";
import {
  inspectLiveSandboxTelephony,
  liveSandboxTelephonyBlockingReason,
} from "@/lib/liveSandboxConfig";
import {
  missingLiveSandboxConfigFallback,
  unreadyTwilioPersonaFallback,
} from "@/lib/liveSandboxFallback";
import type { ElevenLabsCallPayload } from "@/lib/types";

/**
 * Returns only safe configuration diagnostics. No configured values or
 * provider identifiers cross the server boundary.
 */
export function GET() {
  const status = getLiveSandboxConfigStatus();
  const telephony = inspectLiveSandboxTelephony(process.env);
  const telephonyBlocked = Boolean(
    liveSandboxTelephonyBlockingReason(telephony)
  );
  const blockingDiagnostic = !status.configured
    ? missingLiveSandboxConfigFallback(status)
    : telephonyBlocked
      ? unreadyTwilioPersonaFallback()
      : null;
  return NextResponse.json(
    {
      mode: "live_sandbox",
      configured: status.configured,
      callReady: status.configured && !telephonyBlocked,
      missingEnvNames: status.missingEnvNames,
      telephony,
      blockingDiagnostic,
      diagnosticsVersion: "live-sandbox-fallback-v2",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Starts one allowlisted live sandbox leg. Destinations and provider
 * configuration are resolved only by the server-side registry.
 */
export async function POST(request: NextRequest) {
  let body: Partial<ElevenLabsCallPayload> & Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if ("toNumber" in body || "to_number" in body) {
    return NextResponse.json(
      { error: "Destination numbers are never accepted from the browser" },
      { status: 422 }
    );
  }
  if (!body.missionId || !body.vendorId || !body.role) {
    return NextResponse.json(
      { error: "missionId, vendorId, and role are required" },
      { status: 422 }
    );
  }

  const mission = getMission(body.missionId);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }
  if (mission.mode !== "live_sandbox") {
    return NextResponse.json(
      { error: "Outbound calls are available only in live sandbox mode" },
      { status: 409 }
    );
  }
  if (
    (body.role === "caller" && mission.status !== "calling_vendors") ||
    (body.role === "closer" && mission.status !== "negotiating")
  ) {
    return NextResponse.json(
      { error: "Call role is not valid for the current mission state" },
      { status: 409 }
    );
  }

  const call = mission.vendorCalls.find(
    (candidate) =>
      candidate.vendorId === body.vendorId && candidate.role === body.role
  );
  if (!call) {
    return NextResponse.json(
      { error: "Vendor is not in the controlled sandbox registry for this mission" },
      { status: 404 }
    );
  }

  const result = await initiateSandboxCall(mission, call);
  if (!result.ok) {
    if (body.role === "closer") {
      activateNegotiationFallback(mission, result.fallback);
    } else {
      activateReliableFallback(mission, result.fallback);
    }
    setMission(mission);
    return NextResponse.json(
      {
        callInitiated: false,
        fallbackStarted: true,
        message: result.fallback.detail,
        fallback: result.fallback,
      },
      { status: 200 }
    );
  }

  setMission(mission);
  return NextResponse.json({
    callInitiated: true,
    status: "call_started",
    missionId: mission.id,
    vendorId: call.vendorId,
    role: call.role,
    telephony: mission.liveSandboxTelephony,
  });
}
