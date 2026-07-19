import "server-only";

import { addMissionEvent } from "./missionEvents";
import { activateNegotiationFallback, activateReliableFallback } from "./demoOrchestrator";
import {
  getLiveSandboxEnvValue,
  getLiveSandboxPhoneNumberId,
  inspectLiveSandboxConfig,
  liveSandboxConfigFallbackReason,
  type LiveSandboxConfigStatus,
} from "./liveSandboxConfig";
import type { CallRole, Mission, VendorCall, VendorId } from "./types";

const OUTBOUND_URL = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call";

const destinationEnvNames: Record<VendorId, string> = {
  vendor_a: "KEYWIZE_SANDBOX_VENDOR_A_PHONE",
  vendor_b: "KEYWIZE_SANDBOX_VENDOR_B_PHONE",
  vendor_c: "KEYWIZE_SANDBOX_VENDOR_C_PHONE",
};

type PrivateCallCorrelation = {
  missionId: string;
  callId: string;
  vendorId: VendorId;
  role: CallRole;
  conversationId?: string;
  providerCallId?: string;
};

const callRegistryGlobal = globalThis as typeof globalThis & {
  __keywizePrivateCallRegistry?: Map<string, PrivateCallCorrelation>;
};
const privateCallRegistry =
  callRegistryGlobal.__keywizePrivateCallRegistry ??
  new Map<string, PrivateCallCorrelation>();
callRegistryGlobal.__keywizePrivateCallRegistry = privateCallRegistry;

function fallbackDelayMs(): number {
  const configured = Number(process.env.KEYWIZE_LIVE_SANDBOX_FALLBACK_MS ?? 20000);
  if (!Number.isFinite(configured)) return 20000;
  return Math.min(120000, Math.max(5000, configured));
}

function configFor(role: CallRole, vendorId: VendorId) {
  return {
    apiKey: getLiveSandboxEnvValue(process.env, "ELEVENLABS_API_KEY"),
    agentId: getLiveSandboxEnvValue(
      process.env,
      role === "caller"
        ? "ELEVENLABS_CALLER_AGENT_ID"
        : "ELEVENLABS_CLOSER_AGENT_ID"
    ),
    agentPhoneNumberId: getLiveSandboxPhoneNumberId(process.env),
    destination: getLiveSandboxEnvValue(
      process.env,
      destinationEnvNames[vendorId]
    ),
    environment: getLiveSandboxEnvValue(process.env, "ELEVENLABS_ENVIRONMENT"),
  };
}

export function getLiveSandboxConfigStatus(): LiveSandboxConfigStatus {
  return inspectLiveSandboxConfig(process.env);
}

export function liveSandboxIsConfigured(): boolean {
  return getLiveSandboxConfigStatus().configured;
}

function callerFirstMessage(mission: Mission): string {
  const job = mission.jobSpec;
  return (
    `Hi, I'm calling on behalf of an authorized customer seeking a pre-dispatch quote for ` +
    `${job.caseType.replaceAll("_", " ")} at a ${job.propertyType} ${job.doorType.replaceAll("_", " ")} ` +
    `in ${job.locationCity}, ${job.locationZip}. The lock is ${job.lockType.replaceAll("_", " ")}. ` +
    "Could I get the firm all-in total, including every fee and tax?"
  );
}

function closerFirstMessage(mission: Mission): string {
  const negotiation = mission.negotiation;
  if (!negotiation) return "Hi, I'm following up on the stored quote for this customer.";
  return (
    `Hi, I'm following up on your $${negotiation.beforePrice} all-in quote. ` +
    `We have a confirmed $${negotiation.leverage.total} all-in, no-drill-first offer. ` +
    "You're faster. Can you do $145 all-in while keeping the 15-minute ETA and requiring customer approval before any drilling or price change?"
  );
}

export async function initiateSandboxCall(
  mission: Mission,
  call: VendorCall
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const configStatus = getLiveSandboxConfigStatus();
  if (!configStatus.configured) {
    return {
      ok: false,
      reason: liveSandboxConfigFallbackReason(configStatus),
    };
  }

  const config = configFor(call.role, call.vendorId);
  if (!config.apiKey || !config.agentId || !config.agentPhoneNumberId || !config.destination) {
    return { ok: false, reason: "Live sandbox configuration could not be resolved safely." };
  }

  call.status = "ringing";
  call.startedAt = new Date().toISOString();
  addMissionEvent(mission, {
    event: "sandbox_call_started",
    details: `${call.role === "caller" ? "Caller" : "Closer"} started a controlled sandbox call to ${call.vendorName}.`,
    vendorId: call.vendorId,
    category: "call",
    source: "live_sandbox",
  });

  const dynamicVariables: Record<string, string> = {
    mission_id: mission.id,
    call_id: call.id,
    vendor_id: call.vendorId,
    role: call.role,
    case_type: mission.jobSpec.caseType,
    urgency: mission.jobSpec.urgency,
    property_type: mission.jobSpec.propertyType,
    door_type: mission.jobSpec.doorType,
    lock_type: mission.jobSpec.lockType,
    location_city: mission.jobSpec.locationCity,
    location_zip: mission.jobSpec.locationZip,
    authorization_confirmed: String(mission.jobSpec.authorizationConfirmed),
    dispatch_authorized: "false",
  };

  if (call.role === "closer" && mission.negotiation) {
    dynamicVariables.target_quote_id = mission.negotiation.targetQuoteId;
    dynamicVariables.before_price = String(mission.negotiation.beforePrice);
    dynamicVariables.target_price = "145";
    dynamicVariables.max_price = String(mission.jobSpec.maxPrice);
    dynamicVariables.leverage_quote_id = mission.negotiation.leverage.sourceQuoteId;
    dynamicVariables.leverage_total = String(mission.negotiation.leverage.total);
    dynamicVariables.leverage_all_in = "true";
  }

  const clientData: Record<string, unknown> = {
    dynamic_variables: dynamicVariables,
    conversation_config_override: {
      agent: {
        first_message:
          call.role === "caller" ? callerFirstMessage(mission) : closerFirstMessage(mission),
      },
    },
  };
  if (config.environment) clientData.environment = config.environment;

  try {
    const response = await fetch(OUTBOUND_URL, {
      method: "POST",
      headers: {
        "xi-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: config.agentId,
        agent_phone_number_id: config.agentPhoneNumberId,
        to_number: config.destination,
        call_recording_enabled: false,
        telephony_call_config: { ringing_timeout_secs: 25 },
        conversation_initiation_client_data: clientData,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      call.status = "failed";
      return { ok: false, reason: "A controlled sandbox call could not be started." };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    privateCallRegistry.set(call.id, {
      missionId: mission.id,
      callId: call.id,
      vendorId: call.vendorId,
      role: call.role,
      conversationId:
        typeof raw.conversation_id === "string" ? raw.conversation_id : undefined,
      providerCallId:
        typeof raw.callSid === "string"
          ? raw.callSid
          : typeof raw.call_sid === "string"
            ? raw.call_sid
            : undefined,
    });
    return { ok: true };
  } catch {
    call.status = "failed";
    return { ok: false, reason: "A controlled sandbox call could not be started." };
  }
}

export function getPrivateCallCorrelation(callId: string): PrivateCallCorrelation | undefined {
  return privateCallRegistry.get(callId);
}

export async function startLiveSandboxMission(mission: Mission): Promise<void> {
  mission.mode = "live_sandbox";
  mission.status = "calling_vendors";
  mission.orchestration.replayActive = false;
  mission.orchestration.quoteCursor = 0;
  mission.orchestration.nextActionAt = new Date().toISOString();

  addMissionEvent(mission, {
    event: "live_sandbox_requested",
    details: "Live proof requested. Calls are restricted to the server-side controlled vendor registry.",
    category: "status",
    source: "live_sandbox",
  });

  const configStatus = getLiveSandboxConfigStatus();
  if (!configStatus.configured) {
    activateReliableFallback(
      mission,
      liveSandboxConfigFallbackReason(configStatus)
    );
    return;
  }

  const callerCalls = mission.vendorCalls.filter((call) => call.role === "caller");
  const results = await Promise.all(
    callerCalls.map((call) => initiateSandboxCall(mission, call))
  );
  if (results.some((result) => !result.ok)) {
    activateReliableFallback(
      mission,
      "At least one controlled sandbox call could not be started."
    );
    return;
  }

  mission.orchestration.liveFallbackAt = new Date(
    Date.now() + fallbackDelayMs()
  ).toISOString();
  addMissionEvent(mission, {
    event: "live_calls_in_progress",
    details: "Controlled sandbox calls started. Incomplete legs will fall back to reliable replay automatically.",
    category: "status",
    source: "live_sandbox",
  });
}

export async function startLiveSandboxNegotiation(mission: Mission): Promise<void> {
  const closerCall = mission.vendorCalls.find((call) => call.role === "closer");
  if (!closerCall) {
    activateNegotiationFallback(mission, "Live Closer call is unavailable.");
    return;
  }

  const configStatus = getLiveSandboxConfigStatus();
  if (!configStatus.configured) {
    activateNegotiationFallback(
      mission,
      liveSandboxConfigFallbackReason(configStatus)
    );
    return;
  }

  const result = await initiateSandboxCall(mission, closerCall);
  if (!result.ok) {
    activateNegotiationFallback(mission, result.reason);
    return;
  }

  mission.orchestration.replayActive = false;
  mission.orchestration.liveFallbackAt = new Date(
    Date.now() + fallbackDelayMs()
  ).toISOString();
}
