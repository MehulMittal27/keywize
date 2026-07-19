"use client";

export type DoorPhase = "idle" | "trying" | "open" | "declined";

function KeyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10.5 10.5 19 19M19 19l2-2M19 19l-2.2 2.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PHASE_STYLE: Record<DoorPhase, {
  frame: string;
  door: string;
  label: string;
  labelTone: string;
}> = {
  idle: {
    frame: "border-black/10 bg-[#f5f3ee]",
    door: "bg-[#e7e4db]",
    label: "Waiting",
    labelTone: "text-gray-400",
  },
  trying: {
    frame: "border-[#30a985]/30 bg-[#eefaf5]",
    door: "bg-[#d6f2e6]",
    label: "Knocking",
    labelTone: "text-[#1a7a5a]",
  },
  open: {
    frame: "border-[#B87333]/30 bg-[#fdf6ee]",
    door: "bg-[#B87333]",
    label: "Door open",
    labelTone: "text-[#8a5520]",
  },
  declined: {
    frame: "border-[#f0a8b0] bg-[#fdeef0]",
    door: "bg-[#f0a8b0]",
    label: "Declined",
    labelTone: "text-[#b0303a]",
  },
};

export function Door({
  label,
  phase,
  sublabel,
}: {
  label: string;
  phase: DoorPhase;
  sublabel?: string;
}) {
  const style = PHASE_STYLE[phase];

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border p-3 text-center transition-colors duration-500 ${style.frame}`}
    >
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      {/* Door frame + animated door panel */}
      <div
        className="relative mx-auto mt-3 h-16 w-11"
        style={{ perspective: "300px" }}
      >
        {/* Frame shadow */}
        <div className="absolute inset-0 rounded-md bg-black/10" aria-hidden="true" />

        {/* Door panel */}
        <div
          className={`absolute inset-0 origin-left rounded-md shadow-sm ${style.door} ${
            phase === "open"
              ? "animate-door-open"
              : phase === "declined"
              ? "animate-door-shake"
              : ""
          }`}
        >
          {/* Door knob */}
          <span className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-black/25" />
        </div>

        {/* Flying key while calling */}
        {phase === "trying" && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-key-drop">
            <div className="animate-key-jiggle" style={{ animationDelay: "0.45s" }}>
              <KeyIcon className="h-4 w-4 text-[#111111]/70" />
            </div>
          </div>
        )}

        {/* Result badge */}
        {phase === "open" && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#8a5520] shadow">
            ✓
          </span>
        )}
        {phase === "declined" && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#b0303a] shadow">
            ✕
          </span>
        )}
      </div>

      <p className={`mt-2 text-[10px] font-semibold ${style.labelTone}`}>
        {sublabel ?? style.label}
      </p>
    </div>
  );
}

export function VendorDoorsScene({
  vendors,
}: {
  vendors: { key: string; name: string; phase: DoorPhase }[];
}) {
  if (vendors.length === 0) return null;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${vendors.length}, minmax(0, 1fr))` }}
      aria-label="Specialist outreach in progress"
    >
      {vendors.map((v) => (
        <Door key={v.key} label={v.name} phase={v.phase} />
      ))}
    </div>
  );
}
