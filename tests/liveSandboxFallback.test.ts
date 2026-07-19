import assert from "node:assert/strict";
import test from "node:test";
import {
  missingLiveSandboxConfigFallback,
  providerRequestRejectedFallback,
  quoteWaitFallback,
} from "../lib/liveSandboxFallback";
import type { VendorCall } from "../lib/types";

function call(
  overrides: Partial<VendorCall> = {}
): VendorCall {
  return {
    id: "safe-call-slot",
    vendorId: "vendor_a",
    vendorName: "Vendor A",
    role: "caller",
    status: "ringing",
    mode: "live_sandbox",
    fallbackUsed: false,
    startedAt: new Date().toISOString(),
    liveDiagnostics: {
      callStartedAt: new Date().toISOString(),
      toolWebhook: "not_called",
      timedOut: true,
      fallbackReplayUsed: false,
    },
    ...overrides,
  };
}

test("names the exact missing canonical setting and gives a redeploy action", () => {
  const fallback = missingLiveSandboxConfigFallback({
    configured: false,
    missingEnvNames: ["ELEVENLABS_AGENT_PHONE_NUMBER_ID"],
  });

  assert.equal(
    fallback.title,
    "Live calls disabled: missing ELEVENLABS_AGENT_PHONE_NUMBER_ID"
  );
  assert.match(fallback.action, /active Vercel environment/);
  assert.match(fallback.action, /redeploy/);
});

test("classifies a rejected phone-number ID without exposing the provider response", () => {
  const privateProviderId = "private-provider-phone-id";
  const fallback = providerRequestRejectedFallback(
    422,
    `agent_phone_number_id ${privateProviderId} is invalid`
  );
  const publicDiagnostic = JSON.stringify(fallback);

  assert.equal(fallback.code, "provider_phone_number_id_rejected");
  assert.equal(
    fallback.title,
    "Live call request failed before dialing: provider rejected the phone-number ID"
  );
  assert.equal(publicDiagnostic.includes(privateProviderId), false);
  assert.match(fallback.action, /phone number linked inside ElevenLabs|link or import/);
});

test("uses fixed safe authentication guidance instead of a raw provider error", () => {
  const privateError = "credential private-api-key-value failed";
  const fallback = providerRequestRejectedFallback(401, privateError);

  assert.equal(fallback.code, "provider_auth_rejected");
  assert.equal(JSON.stringify(fallback).includes(privateError), false);
  assert.match(fallback.action, /ELEVENLABS_API_KEY/);
});

test("reports conversation activity with no quote webhook as the timeout cause", () => {
  const answered = call({
    liveDiagnostics: {
      callStartedAt: new Date().toISOString(),
      phoneAnsweredAt: new Date().toISOString(),
      answerEvidence: "elevenlabs_conversation_activity",
      toolWebhook: "not_called",
      timedOut: true,
      fallbackReplayUsed: false,
    },
  });
  const fallback = quoteWaitFallback([answered], 0);

  assert.equal(fallback.code, "quote_webhook_missing");
  assert.equal(
    fallback.title,
    "Call placed but no quote webhook arrived; using replay"
  );
  assert.match(fallback.action, /\/api\/elevenlabs\/tools/);
});

test("prioritizes a rejected quote webhook over a generic timeout", () => {
  const rejected = call({
    liveDiagnostics: {
      callStartedAt: new Date().toISOString(),
      phoneAnsweredAt: new Date().toISOString(),
      answerEvidence: "correlated_tool_webhook",
      toolWebhook: "rejected",
      toolRejectionReason: "missing or invalid fields: totalEstimate",
      timedOut: true,
      fallbackReplayUsed: false,
    },
  });
  const fallback = quoteWaitFallback([rejected, call()], 1);

  assert.equal(fallback.code, "quote_webhook_rejected");
  assert.equal(fallback.title, "Quote webhook was rejected; using replay");
  assert.equal(
    JSON.stringify(fallback).includes("missing or invalid fields: totalEstimate"),
    false
  );
});
