"use client";

export function ConfidenceWaveform({
  score,
  signals = [],
}: {
  score: number;
  signals?: string[];
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const bars = Array.from({ length: 12 }, (_, i) => {
    const base = (clamped / 100) * 28;
    const jitter = clamped < 50
      ? Math.sin(i * 1.7 + score * 0.1) * (14 * (1 - clamped / 100))
      : Math.sin(i * 0.9) * 3;
    return Math.max(4, Math.round(base + jitter));
  });

  const color =
    clamped >= 70 ? "#30a985" : clamped >= 40 ? "#f0b429" : "#f0a8b0";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-[3px] h-8">
        {bars.map((height, i) => (
          <div
            key={i}
            className="rounded-full w-[5px] shrink-0 transition-all"
            style={{ height: `${height}px`, backgroundColor: color }}
          />
        ))}
      </div>
      {signals.length > 0 && (
        <ul className="text-xs text-[#666] space-y-0.5 mt-1">
          {signals.slice(0, 3).map((signal, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-[#f0a8b0]">•</span>
              {signal}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConfidenceWaveform;
