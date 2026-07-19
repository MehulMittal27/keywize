import type { Mission } from "./types";

/**
 * Removes private server-side call-correlation IDs from mission payloads.
 * The deterministic slot key is sufficient for browser rendering and cannot
 * be used to correlate an ElevenLabs conversation or provider call.
 */
export function toPublicMission(mission: Mission): Mission {
  return {
    ...mission,
    vendorCalls: mission.vendorCalls.map((call) => ({
      ...call,
      id: `slot-${call.role}-${call.vendorId}`,
    })),
  };
}
