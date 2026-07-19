import assert from "node:assert/strict";
import test from "node:test";
import {
  inspectLiveSandboxConfig,
  liveSandboxConfigFallbackReason,
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
  assert.equal(
    liveSandboxConfigFallbackReason(status),
    "Live sandbox is not configured on this server. Missing: KEYWIZE_SANDBOX_VENDOR_B_PHONE."
  );
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
