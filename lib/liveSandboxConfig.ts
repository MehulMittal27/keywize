import type {
  LiveSandboxDestinationKind,
  LiveSandboxTelephonyDiagnostics,
} from "./types";

export const LIVE_SANDBOX_REQUIRED_ENV_NAMES = [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_CALLER_AGENT_ID",
  "ELEVENLABS_CLOSER_AGENT_ID",
  "ELEVENLABS_AGENT_PHONE_NUMBER_ID",
  "KEYWIZE_SANDBOX_VENDOR_A_PHONE",
  "KEYWIZE_SANDBOX_VENDOR_B_PHONE",
  "KEYWIZE_SANDBOX_VENDOR_C_PHONE",
] as const;

export const LEGACY_LIVE_SANDBOX_PHONE_NUMBER_ID_ENV_NAME =
  "ELEVENLABS_SANDBOX_PHONE_NUMBER_ID" as const;

export type LiveSandboxRequiredEnvName =
  (typeof LIVE_SANDBOX_REQUIRED_ENV_NAMES)[number];

export type LiveSandboxConfigStatus = {
  configured: boolean;
  missingEnvNames: LiveSandboxRequiredEnvName[];
};

type Environment = Readonly<Record<string, string | undefined>>;

const DESTINATION_KINDS: readonly LiveSandboxDestinationKind[] = [
  "human_tester",
  "twilio_vendor_persona",
];

type Requirement = {
  canonicalName: LiveSandboxRequiredEnvName;
  acceptedNames: readonly string[];
};

const REQUIREMENTS: readonly Requirement[] = LIVE_SANDBOX_REQUIRED_ENV_NAMES.map(
  (canonicalName) => ({
    canonicalName,
    acceptedNames:
      canonicalName === "ELEVENLABS_AGENT_PHONE_NUMBER_ID"
        ? [canonicalName, LEGACY_LIVE_SANDBOX_PHONE_NUMBER_ID_ENV_NAME]
        : [canonicalName],
  })
);

function configuredValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function getLiveSandboxEnvValue(
  environment: Environment,
  ...acceptedNames: readonly string[]
): string | undefined {
  for (const name of acceptedNames) {
    const value = configuredValue(environment[name]);
    if (value) return value;
  }
  return undefined;
}

export function getLiveSandboxPhoneNumberId(
  environment: Environment
): string | undefined {
  return getLiveSandboxEnvValue(
    environment,
    "ELEVENLABS_AGENT_PHONE_NUMBER_ID",
    LEGACY_LIVE_SANDBOX_PHONE_NUMBER_ID_ENV_NAME
  );
}

export function inspectLiveSandboxTelephony(
  environment: Environment
): LiveSandboxTelephonyDiagnostics {
  const configuredKind = getLiveSandboxEnvValue(
    environment,
    "KEYWIZE_SANDBOX_DESTINATION_KIND"
  );
  const destinationKind = DESTINATION_KINDS.includes(
    configuredKind as LiveSandboxDestinationKind
  )
    ? (configuredKind as LiveSandboxDestinationKind)
    : "unspecified";
  const twilioPersonaReady =
    getLiveSandboxEnvValue(
      environment,
      "KEYWIZE_SANDBOX_TWILIO_PERSONA_READY"
    )?.toLowerCase() === "true";

  return {
    outboundInitiator: "elevenlabs",
    telephonyIntegration: "twilio",
    keywizeUsesTwilioRestApi: false,
    destinationKind,
    destinationPersonaReady:
      destinationKind === "human_tester"
        ? true
        : destinationKind === "twilio_vendor_persona"
          ? twilioPersonaReady
          : null,
    setupIssue:
      destinationKind === "unspecified"
        ? "destination_kind_not_declared"
        : destinationKind === "twilio_vendor_persona" && !twilioPersonaReady
          ? "twilio_vendor_persona_not_confirmed"
          : undefined,
  };
}

export function liveSandboxTelephonyBlockingReason(
  diagnostics: LiveSandboxTelephonyDiagnostics
): string | undefined {
  if (diagnostics.setupIssue !== "twilio_vendor_persona_not_confirmed") {
    return undefined;
  }
  return (
    "Live sandbox did not dial the declared Twilio destination because its vendor persona is not confirmed. " +
    "Set its inbound Voice webhook/TwiML to a controlled vendor persona, verify it by calling manually, then set KEYWIZE_SANDBOX_TWILIO_PERSONA_READY=true."
  );
}

export function inspectLiveSandboxConfig(
  environment: Environment
): LiveSandboxConfigStatus {
  const missingEnvNames = REQUIREMENTS.filter(
    ({ acceptedNames }) => !getLiveSandboxEnvValue(environment, ...acceptedNames)
  ).map(({ canonicalName }) => canonicalName);

  return {
    configured: missingEnvNames.length === 0,
    missingEnvNames,
  };
}

export function liveSandboxConfigFallbackReason(
  status: LiveSandboxConfigStatus
): string {
  if (status.configured) return "Live sandbox configuration is available.";
  return `Live sandbox is not configured on this server. Missing: ${status.missingEnvNames.join(
    ", "
  )}.`;
}
