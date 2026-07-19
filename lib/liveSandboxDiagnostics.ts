import type { VendorCall } from "./types";

export const DEFAULT_LIVE_SANDBOX_FALLBACK_MS = 120_000;
export const MIN_LIVE_SANDBOX_FALLBACK_MS = 45_000;
export const MAX_LIVE_SANDBOX_FALLBACK_MS = 180_000;

export type LiveSandboxTimeoutCause =
  | "answered_no_webhook"
  | "webhook_rejected"
  | "webhook_received_no_quote"
  | "no_answer_observed";

export function parseLiveSandboxFallbackMs(value: string | undefined): number {
  const configured = Number(value ?? DEFAULT_LIVE_SANDBOX_FALLBACK_MS);
  if (!Number.isFinite(configured)) return DEFAULT_LIVE_SANDBOX_FALLBACK_MS;
  return Math.min(
    MAX_LIVE_SANDBOX_FALLBACK_MS,
    Math.max(MIN_LIVE_SANDBOX_FALLBACK_MS, configured)
  );
}

export function ensureLiveSandboxDiagnostics(call: VendorCall) {
  call.liveDiagnostics ??= {
    toolWebhook: "not_called",
    timedOut: false,
    fallbackReplayUsed: false,
  };
  return call.liveDiagnostics;
}

export function markLiveSandboxCallStarted(call: VendorCall): void {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  diagnostics.callStartedAt ??= new Date().toISOString();
}

export function markLiveSandboxPhoneAnswered(call: VendorCall): boolean {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  if (diagnostics.phoneAnsweredAt) return false;
  diagnostics.phoneAnsweredAt = new Date().toISOString();
  return true;
}

export function markLiveSandboxPhoneSessionEnded(call: VendorCall): boolean {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  if (diagnostics.phoneSessionEndedAt) return false;
  diagnostics.phoneSessionEndedAt = new Date().toISOString();
  return true;
}

export function markLiveSandboxToolReceived(call: VendorCall): void {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  if (diagnostics.toolWebhook !== "quote_saved") {
    diagnostics.toolWebhook = "received";
    delete diagnostics.toolRejectionReason;
  }
}

export function markLiveSandboxToolRejected(
  call: VendorCall,
  reason: string
): void {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  diagnostics.toolWebhook = "rejected";
  diagnostics.toolRejectionReason = reason;
}

export function markLiveSandboxQuoteSaved(call: VendorCall): void {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  diagnostics.toolWebhook = "quote_saved";
  delete diagnostics.toolRejectionReason;
}

export function markLiveSandboxTimedOut(call: VendorCall): void {
  ensureLiveSandboxDiagnostics(call).timedOut = true;
}

export function markLiveSandboxFallbackUsed(call: VendorCall): void {
  ensureLiveSandboxDiagnostics(call).fallbackReplayUsed = true;
}

export function getLiveSandboxTimeoutCause(
  call: VendorCall
): LiveSandboxTimeoutCause {
  const diagnostics = ensureLiveSandboxDiagnostics(call);
  if (diagnostics.toolWebhook === "rejected") return "webhook_rejected";
  if (diagnostics.toolWebhook === "received") return "webhook_received_no_quote";
  if (diagnostics.phoneAnsweredAt) return "answered_no_webhook";
  return "no_answer_observed";
}

function normalizedProviderStatus(payload: Record<string, unknown>): string {
  const status = payload.status ?? payload.conversation_status;
  return typeof status === "string" ? status.trim().toLowerCase().replaceAll("-", "_") : "";
}

export function providerConversationShowsAnswer(
  payload: Record<string, unknown>
): boolean {
  const transcript = payload.transcript;
  if (Array.isArray(transcript) && transcript.length > 0) return true;

  return ["in_progress", "processing"].includes(
    normalizedProviderStatus(payload)
  );
}

export function providerConversationHasEnded(
  payload: Record<string, unknown>
): boolean {
  return ["done", "completed", "failed"].includes(
    normalizedProviderStatus(payload)
  );
}
