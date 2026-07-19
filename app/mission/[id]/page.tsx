"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { VoiceTrustBadge } from "@/components/VoiceTrustBadge";
import { ConfidenceWaveform } from "@/components/ConfidenceWaveform";
import { VendorDoorsScene, type DoorPhase } from "@/components/VendorDoorsScene";

const STEPS = [
  "Intake complete",
  "Finding specialists nearby",
  "Calling Marcus Webb · Speedy Lock & Key",
  "Calling Daniel Reyes · Neighborhood Locksmith",
  "Calling Alex Petrov · Premium Secure",
  "Negotiating with Alex Petrov",
  "Recommendation ready",
];

const SPECIALISTS = [
  {
    key: "A",
    firstName: "Marcus",
    lastName: "Webb",
    company: "Speedy Lock & Key",
    price: "$39 + ?" as string,
    priceRaw: null as number | null,
    eta: "20 min",
    risk: "High" as "High" | "Medium" | "Low",
    riskScore: 85,
    trustLevel: "Low" as "Low" | "Medium" | "High",
    trustScore: 35,
    quote: "\"Uh… well, it depends on the lock.\"",
    tags: ["Tech decides drilling", "No ID required"],
    tagColors: ["pink", "gray"],
    negotiable: false,
    alwaysOverBudget: true,
  },
  {
    key: "B",
    firstName: "Daniel",
    lastName: "Reyes",
    company: "Neighborhood Locksmith",
    price: "$130" as string,
    priceRaw: 130 as number | null,
    eta: "30 min",
    risk: "Low" as "High" | "Medium" | "Low",
    riskScore: 10,
    trustLevel: "High" as "Low" | "Medium" | "High",
    trustScore: 95,
    quote: "\"It's $130 total, including dispatch.\"",
    tags: ["No-drill first", "ID verified", "All-in confirmed"],
    tagColors: ["blue", "gray", "green"],
    negotiable: false,
    alwaysOverBudget: false,
  },
  {
    key: "C",
    firstName: "Alex",
    lastName: "Petrov",
    company: "Premium Secure",
    price: "$165" as string,
    priceRaw: 165 as number | null,
    eta: "15 min",
    risk: "Medium" as "High" | "Medium" | "Low",
    riskScore: 25,
    trustLevel: "Medium" as "Low" | "Medium" | "High",
    trustScore: 65,
    quote: "\"Um, we can drop it to $145 if you book right now.\"",
    tags: ["Starts at $165", "ID required"],
    tagColors: ["yellow", "gray"],
    negotiable: true,
    alwaysOverBudget: false,
  },
];

const MAX_BUDGET = 110;

function TagChip({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    pink: "bg-pink-50 text-pink-600 border-pink-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-[#30a985]/10 text-[#1a7a5a] border-[#30a985]/20",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-[8px] text-xs font-medium border ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [step, setStep] = useState(0);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiated, setNegotiated] = useState(false);
  const [rejectedVendors, setRejectedVendors] = useState<Set<string>>(new Set());
  const [acceptedVendor, setAcceptedVendor] = useState<string | null>(null);

  useEffect(() => {
    if (step < 5) {
      const timer = setTimeout(() => setStep(s => s + 1), 1600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleNegotiate = async (vendorKey: string) => {
    if (vendorKey !== "C" || isNegotiating || negotiated) return;
    setIsNegotiating(true);
    setStep(5);
    try {
      await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: id }),
      });
    } catch {
      // fallback to mock
    }
    setTimeout(() => {
      setIsNegotiating(false);
      setNegotiated(true);
      setStep(6);
    }, 2200);
  };

  const handleAccept = (vendorKey: string) => {
    setAcceptedVendor(vendorKey);
    setTimeout(() => {
      router.push(`/report/${id}?vendor=${vendorKey}`);
    }, 700);
  };

  const handleReject = (vendorKey: string) => {
    setRejectedVendors(prev => new Set(prev).add(vendorKey));
  };

  const getDoorPhase = (key: string): DoorPhase => {
    if (rejectedVendors.has(key)) return "declined";
    if (acceptedVendor === key) return "open";
    const callStep = key === "A" ? 2 : key === "B" ? 3 : 4;
    if (step < callStep) return "idle";
    if (step === callStep || (key === "C" && step === 5 && isNegotiating)) return "trying";
    return "open";
  };

  const showA = step >= 2;
  const showB = step >= 3;
  const showC = step >= 4;

  const getEffectivePrice = (s: typeof SPECIALISTS[0]) => {
    if (s.key === "C" && negotiated) return 145;
    return s.priceRaw;
  };

  const isUnderBudget = (s: typeof SPECIALISTS[0]) => {
    const price = getEffectivePrice(s);
    return price !== null && price <= MAX_BUDGET;
  };

  const vendors = [
    { spec: SPECIALISTS[0], visible: showA },
    { spec: SPECIALISTS[1], visible: showB },
    { spec: SPECIALISTS[2], visible: showC },
  ];

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#111111] font-sans pb-24">
      <nav className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto border-b border-black/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              <circle cx="7.5" cy="15.5" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">Mission #{id.slice(-6)}</span>
          {step < 6 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B87333] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B87333]" />
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* RIGHT on mobile: vendor cards first so they're immediately visible */}
        <div className="lg:col-span-2 lg:order-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Specialists ({vendors.filter(v => v.visible).length}/3 contacted)
            </h2>
            {isNegotiating && (
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-[8px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                AI negotiating…
              </span>
            )}
          </div>

          {/* Door scene */}
          {step >= 1 && (
            <VendorDoorsScene
              vendors={[
                { key: "A", name: "Marcus Webb", phase: getDoorPhase("A") },
                { key: "B", name: "Daniel Reyes", phase: getDoorPhase("B") },
                { key: "C", name: "Alex Petrov",  phase: getDoorPhase("C") },
              ]}
            />
          )}

          {vendors.map(({ spec: s, visible }) => {
            if (!visible) return null;
            const rejected = rejectedVendors.has(s.key);
            const under = isUnderBudget(s);
            const effectivePrice = getEffectivePrice(s);
            const isNegVendor = s.key === "C";
            const negotiatedNow = isNegVendor && negotiated;

            return (
              <div
                key={s.key}
                className={`bg-white rounded-[18px] border shadow-sm transition-all overflow-hidden ${
                  rejected
                    ? "opacity-40 border-gray-200"
                    : s.risk === "High"
                    ? "border-pink-100"
                    : s.risk === "Low"
                    ? "border-green-100"
                    : "border-black/8"
                }`}
              >
                <div className="p-4 sm:p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif font-bold border-2 shrink-0 ${
                        s.risk === "High" ? "bg-pink-50 border-pink-200 text-pink-700" :
                        s.risk === "Low" ? "bg-green-50 border-green-200 text-green-700" :
                        "bg-[#f7f5f0] border-gray-200 text-gray-700"
                      }`}>
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{s.firstName} {s.lastName}</div>
                        <div className="text-xs text-gray-400">{s.company}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-serif font-bold ${
                        under ? "text-[#30a985]" :
                        s.alwaysOverBudget ? "text-pink-500" :
                        negotiatedNow ? "text-[#30a985]" : "text-[#111111]"
                      }`}>
                        {negotiatedNow ? `$${effectivePrice}` : s.price}
                      </div>
                      {negotiatedNow && (
                        <div className="text-xs text-gray-400 line-through">$165</div>
                      )}
                      <div className="text-xs text-gray-400">{s.eta} ETA</div>
                    </div>
                  </div>

                  {/* Budget indicator */}
                  {!s.alwaysOverBudget && effectivePrice !== null && (
                    <div className={`text-xs font-semibold px-2.5 py-0.5 rounded-[8px] inline-block mb-3 ${
                      under
                        ? "bg-[#30a985]/10 text-[#1a7a5a]"
                        : "bg-pink-50 text-pink-600"
                    }`}>
                      {under ? `✓ Within $${MAX_BUDGET} budget` : `⚠ Over $${MAX_BUDGET} budget`}
                    </div>
                  )}
                  {s.alwaysOverBudget && (
                    <div className="text-xs font-semibold px-2.5 py-0.5 rounded-[8px] inline-block mb-3 bg-pink-50 text-pink-600">
                      ✗ Refused to confirm total
                    </div>
                  )}

                  {/* VoiceTrust + transcript */}
                  <div className={`p-3 rounded-[14px] mb-3 border ${
                    s.risk === "High" ? "bg-pink-50 border-pink-100" :
                    s.risk === "Low" ? "bg-green-50 border-green-100" :
                    "bg-[#f7f5f0] border-gray-200"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <VoiceTrustBadge level={s.trustLevel} score={s.trustScore} />
                      {s.risk === "High" && (
                        <span className="text-xs font-bold text-pink-700 uppercase tracking-wide">High risk</span>
                      )}
                    </div>
                    {isNegotiating && isNegVendor && (
                      <p className="text-sm italic text-purple-800 mb-2">
                        &ldquo;I have a confirmed quote at $130 all-in. Can you match it or include two keys?&rdquo;
                      </p>
                    )}
                    {!(isNegotiating && isNegVendor) && (
                      <p className="text-sm italic text-gray-600">{s.quote}</p>
                    )}
                    <div className="mt-2">
                      <ConfidenceWaveform score={s.trustScore} />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {s.tags.map((t, i) => (
                      <TagChip key={t} label={negotiatedNow && s.key === "C" && i === 0 ? "✓ $145 all-in confirmed" : t} color={negotiatedNow && s.key === "C" && i === 0 ? "green" : s.tagColors[i] ?? "gray"} />
                    ))}
                    {negotiatedNow && (
                      <TagChip label="No-drill first" color="blue" />
                    )}
                    <TagChip label={`Risk: ${s.riskScore}/100`} color={s.riskScore >= 70 ? "pink" : s.riskScore <= 20 ? "green" : "yellow"} />
                  </div>

                  {/* Action buttons */}
                  {!rejected && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(s.key)}
                        disabled={s.alwaysOverBudget}
                        className={`flex-1 py-2.5 rounded-[12px] font-semibold text-sm transition-all active:scale-[0.97] ${
                          s.alwaysOverBudget
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-[#111111] text-white hover:bg-gray-800 shadow-sm"
                        }`}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleNegotiate(s.key)}
                        disabled={!s.negotiable || isNegotiating || negotiated}
                        className={`flex-1 py-2.5 rounded-[12px] font-semibold text-sm border transition-all active:scale-[0.97] ${
                          !s.negotiable || negotiated
                            ? "border-gray-200 text-gray-300 cursor-not-allowed"
                            : isNegotiating
                            ? "border-purple-200 text-purple-500 animate-pulse"
                            : "border-[#111111] text-[#111111] hover:bg-gray-50"
                        }`}
                      >
                        {isNegotiating && isNegVendor ? "Negotiating…" : negotiatedNow ? "✓ Negotiated" : "Negotiate"}
                      </button>
                      <button
                        onClick={() => handleReject(s.key)}
                        className="flex-1 py-2.5 rounded-[12px] font-semibold text-sm border border-pink-100 text-pink-600 hover:bg-pink-50 transition-all active:scale-[0.97]"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {rejected && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Rejected</span>
                      <button
                        onClick={() => setRejectedVendors(prev => { const s2 = new Set(prev); s2.delete(s.key); return s2; })}
                        className="text-xs text-gray-400 underline hover:text-gray-600"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {step >= 6 && (
            <div className="bg-[#30a985]/10 border border-[#30a985]/20 rounded-[14px] p-4 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p className="text-sm font-semibold text-[#1a7a5a]">Negotiation complete. Accept a specialist above to book your service.</p>
            </div>
          )}
        </div>

        {/* LEFT sidebar: progress + job spec */}
        <div className="lg:col-span-1 lg:order-1 space-y-4">
          <div className="bg-white p-5 rounded-[18px] shadow-sm border border-black/5">
            <h2 className="text-base font-serif font-semibold mb-3">Live progress</h2>
            <div className="space-y-2.5">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${done ? "bg-[#B87333]" : active ? "bg-[#B87333] animate-pulse scale-125" : "bg-gray-200"}`} />
                    <span className={done ? "text-gray-400" : active ? "font-semibold text-black" : "text-gray-300"}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-[18px] shadow-sm border border-black/5">
            <h2 className="text-base font-serif font-semibold mb-3">Job spec</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-gray-400">Issue</span><span className="font-medium">Broken key</span></li>
              <li className="flex justify-between"><span className="text-gray-400">Door</span><span className="font-medium">Main entry · Deadbolt</span></li>
              <li className="flex justify-between"><span className="text-gray-400">Location</span><span className="font-medium">SF, 94109</span></li>
              <li className="flex justify-between"><span className="text-gray-400">Urgency</span><span className="font-medium">Right now</span></li>
              <li className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="text-gray-400">Ideal</span><span className="font-medium">$80</span>
              </li>
              <li className="flex justify-between">
                <span className="text-pink-500 font-medium">Max budget</span>
                <span className="font-bold text-pink-600">${MAX_BUDGET}</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
