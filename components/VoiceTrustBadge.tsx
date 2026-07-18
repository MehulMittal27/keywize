import type { TrustLevel } from "@/lib/types";

const STYLES: Record<TrustLevel, { bg: string; dot: string; label: string }> = {
  High:   { bg: "bg-[#e6f7f1] text-[#1a7a5a]", dot: "bg-[#30a985]", label: "High confidence" },
  Medium: { bg: "bg-[#fff8e6] text-[#a06b00]", dot: "bg-[#f0b429]", label: "Medium confidence" },
  Low:    { bg: "bg-[#fdeef0] text-[#b0303a]", dot: "bg-[#f0a8b0]",  label: "Low confidence — push back" },
};

export default function VoiceTrustBadge({
  level,
  score,
  compact = false,
}: {
  level: TrustLevel;
  score?: number;
  compact?: boolean;
}) {
  const s = STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.bg}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot} shrink-0`} />
      {compact ? `VoiceTrust: ${level}` : s.label}
      {score !== undefined && !compact && (
        <span className="opacity-60 ml-1">({score})</span>
      )}
    </span>
  );
}
