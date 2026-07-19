/**
 * In-memory mission store.
 * Pre-seeded with the demo mission so the hackathon demo is always reliable.
 * In production this would be replaced by a database.
 */

import type { Mission } from "./types";
import { DEMO_MISSION, DEMO_MISSION_ID } from "./mockData";

export { DEMO_MISSION_ID };

// Keep one process-wide map across Next.js route and server-component bundles.
// Production live workflows still need a durable database and queue.
const storeGlobal = globalThis as typeof globalThis & {
  __keywizeMissionStore?: Map<string, Mission>;
};
const _missions = storeGlobal.__keywizeMissionStore ?? new Map<string, Mission>();
storeGlobal.__keywizeMissionStore = _missions;

if (!_missions.has(DEMO_MISSION_ID)) {
  _missions.set(DEMO_MISSION_ID, structuredClone(DEMO_MISSION));
}

export function getMission(id: string): Mission | undefined {
  return _missions.get(id);
}

export function setMission(mission: Mission): void {
  _missions.set(mission.id, mission);
}

export function listMissions(): Mission[] {
  return Array.from(_missions.values());
}

/** Reset the demo mission to its default pre-negotiation state. */
export function resetDemoMission(): Mission {
  const fresh = structuredClone(DEMO_MISSION);
  _missions.set(DEMO_MISSION_ID, fresh);
  return fresh;
}
