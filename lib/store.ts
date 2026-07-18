/**
 * In-memory mission store.
 * Pre-seeded with the demo mission so the hackathon demo is always reliable.
 * In production this would be replaced by a database.
 */

import type { Mission } from "./types";
import { DEMO_MISSION, DEMO_MISSION_ID } from "./mockData";

export { DEMO_MISSION_ID };

// Module-level map — persists across requests in the same Node.js process.
// Next.js dev mode hot-reloads may reset this; the demo mission is re-seeded
// on every import so the demo always works.
const _missions: Map<string, Mission> = new Map();

// Seed the demo mission
_missions.set(DEMO_MISSION_ID, structuredClone(DEMO_MISSION));

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
