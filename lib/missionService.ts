import { createVendorCalls } from "./mockData";
import { addMissionEvent } from "./missionEvents";
import { startReliableDemo } from "./demoOrchestrator";
import { startLiveSandboxMission } from "./liveSandbox";
import { setMission } from "./store";
import type { JobSpec, Mission, MissionMode } from "./types";

export function createMissionShell(
  id: string,
  jobSpec: JobSpec,
  mode: MissionMode
): Mission {
  const timestamp = new Date().toISOString();
  const mission: Mission = {
    id,
    mode,
    jobSpec,
    quotes: [],
    status: "intake_complete",
    callLog: [],
    vendorCalls: createVendorCalls(mode, id),
    recommendation: null,
    negotiation: null,
    approval: null,
    orchestration: {
      replayActive: false,
      quoteCursor: 0,
      negotiationCursor: 0,
      nextActionAt: timestamp,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  addMissionEvent(mission, {
    event: "intake_complete",
    details: `Job spec stored with a $${jobSpec.maxPrice} maximum. Authorization confirmed; proof is required at the door.`,
    category: "status",
    source: mode === "live_sandbox" ? "live_sandbox" : "reliable_demo",
  });
  return mission;
}

export async function startMission(mission: Mission): Promise<void> {
  setMission(mission);
  if (mission.mode === "live_sandbox") {
    await startLiveSandboxMission(mission);
  } else {
    startReliableDemo(mission);
  }
  setMission(mission);
}
