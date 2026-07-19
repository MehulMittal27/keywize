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
  markLiveSandboxToolReceived(vendorCall);
  markLiveSandboxQuoteSaved(vendorCall);
  markLiveSandboxFallbackUsed(vendorCall);

  assert.deepEqual(ensureLiveSandboxDiagnostics(vendorCall), {
    toolWebhook: "quote_saved",
    timedOut: false,
    fallbackReplayUsed: true,
  });
  assert.equal(JSON.stringify(vendorCall.liveDiagnostics).includes("provider"), false);
});

test("recognizes provider answer and end states from safe conversation status", () => {
  assert.equal(providerConversationShowsAnswer({ status: "initiated" }), false);
  assert.equal(providerConversationShowsAnswer({ status: "in-progress" }), true);
  assert.equal(providerConversationShowsAnswer({ status: "done" }), false);
  assert.equal(providerConversationShowsAnswer({ status: "initiated", transcript: [{}] }), true);
  assert.equal(providerConversationHasEnded({ status: "done" }), true);
  assert.equal(providerConversationHasEnded({ status: "in-progress" }), false);
});
