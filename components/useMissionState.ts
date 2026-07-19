"use client";

import { useEffect, useState } from "react";
import type { Mission } from "@/lib/types";

export function useMissionState(missionId: string) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/missions/${missionId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Mission unavailable");
        const nextMission = (await response.json()) as Mission;
        if (!active) return;
        setMission(nextMission);
        setLoadError("");
      } catch {
        if (active) setLoadError("Mission updates paused. Retrying automatically...");
      } finally {
        if (active) timer = setTimeout(poll, 700);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [missionId]);

  return { mission, setMission, loadError, setLoadError };
}
