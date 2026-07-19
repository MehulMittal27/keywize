import type {
  CallLogEntry,
  Mission,
  MissionEventCategory,
  MissionEventSource,
  VendorId,
} from "./types";

export type AddMissionEventInput = {
  event: string;
  details?: string;
  vendorId?: VendorId;
  category: MissionEventCategory;
  source?: MissionEventSource;
  toolName?: NonNullable<CallLogEntry["toolName"]>;
};

export function addMissionEvent(mission: Mission, input: AddMissionEventInput): void {
  const sequence = (mission.callLog.at(-1)?.sequence ?? 0) + 1;
  const timestamp = new Date().toISOString();

  mission.callLog.push({
    id: `${mission.id}-event-${sequence}`,
    sequence,
    timestamp,
    event: input.event,
    details: input.details,
    vendorId: input.vendorId,
    category: input.category,
    source:
      input.source ??
      (mission.mode === "live_sandbox" ? "live_sandbox" : "reliable_demo"),
    toolName: input.toolName,
  });
  mission.updatedAt = timestamp;
}
