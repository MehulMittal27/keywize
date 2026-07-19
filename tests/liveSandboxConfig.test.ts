import assert from "node:assert/strict";
import test from "node:test";
import {
  inspectLiveSandboxConfig,
  inspectLiveSandboxTelephony,
  liveSandboxTelephonyBlockingReason,
} from "../lib/liveSandboxConfig";

const completeCanonicalEnvironment = {
  ELEVENLABS_API_KEY: "dummy-api-key",
  ELEVENLABS_CALLER_AGENT_ID: "dummy-caller-agent",
  ELEVENLABS_CLOSER_AGENT_ID: "dummy-closer-agent",
  ELEVENLABS_AGENT_PHONE_NUMBER_ID: "dummy-linked-phone-id",
  KEYWIZE_SANDBOX_VENDOR_A_PHONE: "dummy-vendor-a",
  KEYWIZE_SANDBOX_VENDOR_B_PHONE: "dummy-vendor-b",
  KEYWIZE_SANDBOX_VENDOR_C_PHONE: "dummy-vendor-c",
};

test("reports canonical missing names without configured values", () => {
  const environment = {
    ...completeCanonicalEnvironment,
    KEYWIZE_SANDBOX_VENDOR_B_PHONE: "",
  };
  const status = inspectLiveSandboxConfig(environment);

  assert.deepEqual(status, {
    configured: false,
    missingEnvNames: ["KEYWIZE_SANDBOX_VENDOR_B_PHONE"],
  });
  assert.equal(JSON.stringify(status).includes("dummy-"), false);
});

test("recognizes the documented canonical environment as configured", () => {
  assert.deepEqual(inspectLiveSandboxConfig(completeCanonicalEnvironment), {
    configured: true,
    missingEnvNames: [],
  });
});

test("accepts the legacy sandbox phone number ID alias", () => {
  assert.deepEqual(
    inspectLiveSandboxConfig({
      ...completeCanonicalEnvironment,
      ELEVENLABS_AGENT_PHONE_NUMBER_ID: undefined,
      ELEVENLABS_SANDBOX_PHONE_NUMBER_ID: "dummy-legacy-linked-phone-id",
    }),
    {
      configured: true,
      missingEnvNames: [],
    }
  );
});

test("reports the fixed provider boundary without any configured identifiers", () => {
  const diagnostics = inspectLiveSandboxTelephony({
    ...completeCanonicalEnvironment,
    KEYWIZE_SANDBOX_DESTINATION_KIND: "human_tester",
  });

  assert.deepEqual(diagnostics, {
    outboundInitiator: "elevenlabs",
    telephonyIntegration: "twilio",
    keywizeUsesTwilioRestApi: false,
    destinationKind: "human_tester",
    destinationPersonaReady: true,
    setupIssue: undefined,
  });
  assert.equal(JSON.stringify(diagnostics).includes("dummy-"), false);
});

test("blocks a declared Twilio destination until its vendor persona is confirmed", () => {
  const unready = inspectLiveSandboxTelephony({
    KEYWIZE_SANDBOX_DESTINATION_KIND: "twilio_vendor_persona",
  });
  assert.equal(unready.destinationPersonaReady, false);
  assert.equal(unready.setupIssue, "twilio_vendor_persona_not_confirmed");
  assert.match(
    liveSandboxTelephonyBlockingReason(unready) ?? "",
    /inbound Voice webhook\/TwiML/
  );

  const ready = inspectLiveSandboxTelephony({
    KEYWIZE_SANDBOX_DESTINATION_KIND: "twilio_vendor_persona",
    KEYWIZE_SANDBOX_TWILIO_PERSONA_READY: "true",
  });
  assert.equal(ready.destinationPersonaReady, true);
  assert.equal(ready.setupIssue, undefined);
  assert.equal(liveSandboxTelephonyBlockingReason(ready), undefined);
});

test("keeps undeclared legacy destinations usable but diagnoses the ambiguity", () => {
  assert.deepEqual(inspectLiveSandboxTelephony({}), {
    outboundInitiator: "elevenlabs",
    telephonyIntegration: "twilio",
    keywizeUsesTwilioRestApi: false,
    destinationKind: "unspecified",
    destinationPersonaReady: null,
    setupIssue: "destination_kind_not_declared",
  });
});

test("treats whitespace-only variables as missing", () => {
  const status = inspectLiveSandboxConfig({
    ...completeCanonicalEnvironment,
    ELEVENLABS_API_KEY: "   ",
  });

  assert.deepEqual(status, {
    configured: false,
    missingEnvNames: ["ELEVENLABS_API_KEY"],
  });
});
