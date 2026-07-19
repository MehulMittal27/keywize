import type { VendorCall, VendorCallStatus } from "@/lib/types";

const STATUS_LABELS: Record<VendorCallStatus, string> = {
  queued: "Queued",
  ringing: "Ringing",
  connected: "Connected",
  quote_saved: "Quote saved",
  complete: "Complete",
  failed: "Failed",
  replay_fallback: "Replay fallback",
};

function progressTone(call: VendorCall): string {
  if (call.status === "complete" || call.status === "quote_saved") return "bg-[#30a985]";
  if (call.status === "ringing" || call.status === "connected") {
    return "animate-pulse bg-[#30a985]";
  }
  if (call.status === "failed") return "bg-pink-400";
  if (call.status === "replay_fallback") return "animate-pulse bg-purple-400";
  return "bg-black/10";
}

export function VendorCallProgress({ calls }: { calls: VendorCall[] }) {
  if (calls.length === 0) return null;

  return (
    <div aria-label="Vendor call progress" className="grid gap-2" role="list">
      <div className="flex gap-2" aria-hidden="true">
        {calls.map((call) => (
          <div key={call.id} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors duration-500 ${progressTone(call)}`} />
          </div>
        ))}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${calls.length}, minmax(0, 1fr))` }}>
        {calls.map((call, index) => (
          <div key={call.id} className="min-w-0" role="listitem">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {call.role === "closer" ? "Closer" : `Call ${index + 1}`}
            </p>
            <p className="truncate text-xs font-semibold text-gray-700">{call.vendorName}</p>
            <p className="truncate text-[10px] text-gray-400">
              {STATUS_LABELS[call.status]}
              {call.fallbackUsed ? " - replay" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
