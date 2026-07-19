import type { LiveSandboxConfigStatus } from "./liveSandboxConfig";
import { getLiveSandboxTimeoutCause } from "./liveSandboxDiagnostics";
import type {
  LiveSandboxFallbackDiagnostic,
  VendorCall,
} from "./types";

function diagnostic(
  value: LiveSandboxFallbackDiagnostic
): LiveSandboxFallbackDiagnostic {
  return value;
}

export function missingLiveSandboxConfigFallback(
  status: LiveSandboxConfigStatus
): LiveSandboxFallbackDiagnostic {
  const names = status.missingEnvNames;
  const title =
    names.length === 1
      ? `Live calls disabled: missing ${names[0]}`
      : `Live calls disabled: ${names.length} required server variables are missing`;

  return diagnostic({
    code: "missing_configuration",
    stage: "configuration",
    title,
    detail: `Missing server variables: ${names.join(", ")}.`,
    action:
      "Add the named server-only variables to the active Vercel environment, then redeploy that environment. Do not use NEXT_PUBLIC_ names.",
  });
}

export function unresolvedLiveSandboxConfigFallback(): LiveSandboxFallbackDiagnostic {
  return diagnostic({
    code: "configuration_unresolved",
    stage: "configuration",
    title: "Live calls disabled: server configuration could not be resolved",
    detail:
      "The configuration check passed, but the server could not resolve one of the required live call settings.",
    action:
      "Re-save the canonical live sandbox variables in the active Vercel environment and redeploy.",
  });
}

export function unreadyTwilioPersonaFallback(): LiveSandboxFallbackDiagnostic {
  return diagnostic({
    code: "destination_persona_not_ready",
    stage: "pre_dial",
    title: "Live calls disabled: Twilio destination persona is not verified",
    detail:
      "Keywize did not dial because the declared Twilio destination has not passed the controlled vendor-persona readiness gate.",
    action:
      "Configure and manually verify the destination's inbound Voice webhook or TwiML as a Vendor A/B/C persona, set KEYWIZE_SANDBOX_TWILIO_PERSONA_READY=true, and redeploy.",
  });
}

function normalizedProviderError(providerErrorBody: string): string {
  return providerErrorBody.toLowerCase().replaceAll("-", "_");
}

function mentionsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

/**
 * Converts an untrusted provider error into a fixed safe diagnostic. The raw
 * body can contain private IDs or phone numbers, so it is used only for local
 * classification and is never returned, persisted, or logged.
 */
export function providerRequestRejectedFallback(
  status: number,
  providerErrorBody: string
): LiveSandboxFallbackDiagnostic {
  const body = normalizedProviderError(providerErrorBody);
  const statusDetail = Number.isInteger(status) ? ` (HTTP ${status})` : "";

  if (status === 401) {
    return diagnostic({
      code: "provider_auth_rejected",
      stage: "provider_request",
      title: "Live call request failed before dialing: ElevenLabs authentication was rejected",
      detail: `ElevenLabs rejected the server credential${statusDetail}; no call start was confirmed.`,
      action:
        "Replace ELEVENLABS_API_KEY in the active Vercel environment with a valid key for the ElevenLabs workspace that owns the agents and linked phone number, then redeploy.",
    });
  }

  if (
    status === 402 ||
    mentionsAny(body, ["billing", "credit", "payment", "quota", "balance"])
  ) {
    return diagnostic({
      code: "provider_billing_rejected",
      stage: "provider_request",
      title: "Live call request failed before dialing: ElevenLabs billing or quota rejected it",
      detail: `ElevenLabs rejected the outbound request${statusDetail}; no call start was confirmed.`,
      action:
        "Check billing, credits, and outbound calling availability in the ElevenLabs workspace before retrying.",
    });
  }

  if (
    mentionsAny(body, ["to_number", "destination_number", "destination number"])
  ) {
    return diagnostic({
      code: "provider_destination_rejected",
      stage: "provider_request",
      title: "Live call request failed before dialing: provider rejected a controlled destination",
      detail: `ElevenLabs rejected an allowlisted sandbox destination${statusDetail}; no call start was confirmed.`,
      action:
        "Verify that every KEYWIZE_SANDBOX_VENDOR_*_PHONE value is a valid team-controlled destination supported by the linked ElevenLabs telephony integration, then redeploy.",
    });
  }

  if (
    mentionsAny(body, [
      "agent_phone_number_id",
      "phone_number_id",
      "phone number id",
      "linked phone number",
    ])
  ) {
    return diagnostic({
      code: "provider_phone_number_id_rejected",
      stage: "provider_request",
      title: "Live call request failed before dialing: provider rejected the phone-number ID",
      detail: `ElevenLabs rejected ELEVENLABS_AGENT_PHONE_NUMBER_ID${statusDetail}; no call start was confirmed.`,
      action:
        "In ElevenLabs, link or import a Twilio phone number from the account that owns the outbound leg, copy its ElevenLabs phone-number ID into the active Vercel environment, and redeploy.",
    });
  }

  if (
    mentionsAny(body, ["agent_id", "agent id", "agent not found", "unknown agent"])
  ) {
    return diagnostic({
      code: "provider_agent_id_rejected",
      stage: "provider_request",
      title: "Live call request failed before dialing: provider rejected an agent ID",
      detail: `ElevenLabs rejected the configured Caller or Closer agent${statusDetail}; no call start was confirmed.`,
      action:
        "Verify ELEVENLABS_CALLER_AGENT_ID and ELEVENLABS_CLOSER_AGENT_ID belong to the same accessible ElevenLabs workspace, then redeploy.",
    });
  }

  if (status === 403) {
    return diagnostic({
      code: "provider_permission_rejected",
      stage: "provider_request",
      title: "Live call request failed before dialing: ElevenLabs denied outbound permission",
      detail: `ElevenLabs denied the outbound request${statusDetail}; no call start was confirmed.`,
      action:
        "Check outbound calling permissions and the linked telephony integration in the ElevenLabs workspace before retrying.",
    });
  }

  return diagnostic({
    code: "provider_request_rejected",
    stage: "provider_request",
    title: "Live call request failed before dialing: ElevenLabs rejected the request",
    detail: `ElevenLabs rejected the controlled outbound request${statusDetail}; no call start was confirmed.`,
    action:
      "Check the Caller or Closer agent, linked phone-number ID, outbound permissions, billing, and ElevenLabs Conversations diagnostics before retrying.",
  });
}

export function providerStartUnconfirmedFallback(): LiveSandboxFallbackDiagnostic {
  return diagnostic({
    code: "provider_start_unconfirmed",
    stage: "provider_request",
    title: "Live call request failed before dialing: ElevenLabs did not confirm a call start",
    detail:
      "The provider response did not include an explicit success and trackable conversation reference, so Keywize did not claim that a call was placed.",
    action:
      "Check ElevenLabs Conversations and the phone number linked inside ElevenLabs before retrying.",
  });
}

export function providerUnreachableFallback(): LiveSandboxFallbackDiagnostic {
  return diagnostic({
    code: "provider_unreachable",
    stage: "provider_request",
    title: "Live call request failed before dialing: ElevenLabs was unreachable",
    detail:
      "Keywize could not complete the request to the ElevenLabs outbound API, so no call start was confirmed.",
    action:
      "Verify ElevenLabs availability and deployment network access, then retry. Keywize did not make a direct Twilio REST request.",
  });
}

export function quoteWaitFallback(
  pendingCalls: readonly VendorCall[],
  savedQuoteCount: number
): LiveSandboxFallbackDiagnostic {
  const startedCalls = pendingCalls.filter(
    (call) => call.startedAt || call.liveDiagnostics?.callStartedAt
  );
  const causes = new Set(startedCalls.map(getLiveSandboxTimeoutCause));
  const progress = `${savedQuoteCount}/3 controlled quotes were stored before replay.`;

  if (causes.has("webhook_rejected")) {
    return diagnostic({
      code: "quote_webhook_rejected",
      stage: "quote_webhook",
      title: "Quote webhook was rejected; using replay",
      detail: `A call was placed and save_quote reached Keywize, but at least one quote payload failed safe validation. ${progress}`,
      action:
        "Review the per-vendor safe diagnostics and verify the hosted Caller tool schema sends every required quote field to this deployment.",
    });
  }

  if (causes.has("webhook_received_no_quote")) {
    return diagnostic({
      code: "quote_not_saved",
      stage: "quote_webhook",
      title: "Quote webhook arrived but no quote was saved; using replay",
      detail: `A call was placed and save_quote reached Keywize, but a structured quote was not persisted. ${progress}`,
      action:
        "Review the per-vendor safe diagnostics, webhook response status, and hosted Caller tool schema before retrying.",
    });
  }

  if (causes.has("answered_no_webhook")) {
    return diagnostic({
      code: "quote_webhook_missing",
      stage: "quote_webhook",
      title: "Call placed but no quote webhook arrived; using replay",
      detail: `ElevenLabs showed conversation activity, but save_quote did not reach this Keywize deployment before the bounded timeout. ${progress}`,
      action:
        "Verify the hosted Caller tool points to this deployment's /api/elevenlabs/tools URL and that the controlled destination completes the vendor roleplay through final readback.",
    });
  }

  if (startedCalls.length > 0) {
    return diagnostic({
      code: "answer_or_webhook_not_confirmed",
      stage: "quote_webhook",
      title: "Call placed but no answer or quote webhook was confirmed; using replay",
      detail: `ElevenLabs accepted at least one call request, but Keywize observed neither conversation activity nor save_quote before the bounded timeout. ${progress}`,
      action:
        "Check ElevenLabs Conversations, confirm the controlled destination answers as the assigned vendor, and verify the Caller tool URL targets this deployment.",
    });
  }

  return diagnostic({
    code: "quote_wait_expired",
    stage: "quote_webhook",
    title: "No controlled call reached quote collection before timeout; using replay",
    detail: `No live call start and quote completion were observed before the bounded timeout. ${progress}`,
    action:
      "Check the per-vendor safe diagnostics and ElevenLabs Conversations before retrying live proof.",
  });
}

export function closerUnavailableFallback(): LiveSandboxFallbackDiagnostic {
  return diagnostic({
    code: "closer_unavailable",
    stage: "negotiation",
    title: "Live negotiation unavailable: Closer call slot is missing",
    detail: "The mission did not contain the controlled Vendor C Closer call slot.",
    action: "Restart the live sandbox mission from a fresh intake before retrying negotiation.",
  });
}

export function negotiationTimeoutFallback(): LiveSandboxFallbackDiagnostic {
  return diagnostic({
    code: "negotiation_timeout",
    stage: "negotiation",
    title: "Closer call produced no confirmed terms before timeout; using replay",
    detail:
      "The live Closer call did not persist a correlated negotiation result within the bounded wait.",
    action:
      "Check the Closer conversation and update_negotiation webhook diagnostics before retrying live proof.",
  });
}
