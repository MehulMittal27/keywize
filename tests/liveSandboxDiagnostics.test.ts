import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LIVE_SANDBOX_FALLBACK_MS,
  MAX_LIVE_SANDBOX_FALLBACK_MS,
  MIN_LIVE_SANDBOX_FALLBACK_MS,
  ensureLiveSandboxDiagnostics,
  getLiveSandboxTimeoutCause,
  markLiveSandboxFallbackUsed,
  markLiveSandboxPhoneAnswered,
  markLiveSandboxQuoteSaved,
  markLiveSandboxTimedOut,
  markLiveSandboxToolReceived,
  markLiveSandboxToolRejected,
  outboundCallStartWasConfirmed,
  parseLiveSandboxFallbackMs,
  providerConversationHasEnded,
  providerConversationShowsAnswer,
} from "../lib/liveSandboxDiagnostics";
import type { VendorCall } from "../lib/types";

function call(): VendorCall {
  return {
    id: "safe-call-id",
    vendorId: "vendor_b",
    vendorName: "Vendor B",
    role: "caller",
    status: "ringing",
    mode: "live_sandbox",
    fallbackUsed: false,
  };
}

test("requires an explicit successful provider response before marking a call started", () => {
  assert.equal(
    outboundCallStartWasConfirmed({
      success: true,
      conversation_id: "private-conversation-id",
    }),
    true
  );
  assert.equal(
    outboundCallStartWasConfirmed({
      success: false,
      message: "provider did not initiate the call",
    }),
    false
  );
  assert.equal(outboundCallStartWasConfirmed({ success: true }), false);
});

test("uses a bounded two-minute default instead of the previous 20-second timeout", () => {
  assert.equal(parseLiveSandboxFallbackMs(undefined), DEFAULT_LIVE_SANDBOX_FALLBACK_MS);
  assert.equal(parseLiveSandboxFallbackMs("not-a-number"), DEFAULT_LIVE_SANDBOX_FALLBACK_MS);
  assert.equal(parseLiveSandboxFallbackMs("1000"), MIN_LIVE_SANDBOX_FALLBACK_MS);
  assert.equal(parseLiveSandboxFallbackMs("999999"), MAX_LIVE_SANDBOX_FALLBACK_MS);
  assert.equal(parseLiveSandboxFallbackMs("90000"), 90_000);
});

test("separates an answered phone with no webhook from a rejected webhook", () => {
  const answered = call();
  markLiveSandboxPhoneAnswered(answered);
  markLiveSandboxTimedOut(answered);
  assert.equal(getLiveSandboxTimeoutCause(answered), "answered_no_webhook");

  const rejected = call();
  markLiveSandboxPhoneAnswered(rejected);
  markLiveSandboxToolReceived(rejected);
  markLiveSandboxToolRejected(rejected, "missing or invalid fields: totalEstimate");
  markLiveSandboxTimedOut(rejected);
  assert.equal(getLiveSandboxTimeoutCause(rejected), "webhook_rejected");
  assert.equal(
    ensureLiveSandboxDiagnostics(rejected).toolRejectionReason,
    "missing or invalid fields: totalEstimate"
  );
});

test("tracks accepted quote and disclosed fallback without provider identifiers", () => {
  const vendorCall = call();
  markLiveSandboxPhoneAnswered(vendorCall, "correlated_tool_webhook");
  markLiveSandboxToolReceived(vendorCall);
  markLiveSandboxQuoteSaved(vendorCall);
  markLiveSandboxFallbackUsed(vendorCall);

  const diagnostics = ensureLiveSandboxDiagnostics(vendorCall);
  assert.equal(diagnostics.toolWebhook, "quote_saved");
  assert.equal(diagnostics.answerEvidence, "correlated_tool_webhook");
  assert.equal(typeof diagnostics.phoneAnsweredAt, "string");
  assert.equal(diagnostics.timedOut, false);
  assert.equal(diagnostics.fallbackReplayUsed, true);
  assert.equal(JSON.stringify(vendorCall.liveDiagnostics).includes("private-conversation-id"), false);
});

test("recognizes provider answer and end states from safe conversation status", () => {
  assert.equal(providerConversationShowsAnswer({ status: "initiated" }), false);
  assert.equal(providerConversationShowsAnswer({ status: "in-progress" }), true);
  assert.equal(providerConversationShowsAnswer({ status: "processing" }), false);
  assert.equal(providerConversationShowsAnswer({ status: "done" }), false);
  assert.equal(providerConversationShowsAnswer({ status: "initiated", transcript: [{}] }), true);
  assert.equal(providerConversationHasEnded({ status: "done" }), true);
  assert.equal(providerConversationHasEnded({ status: "in-progress" }), false);
});
