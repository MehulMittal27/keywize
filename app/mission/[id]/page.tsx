"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { VoiceTrustBadge } from "../../../components/VoiceTrustBadge";
import { ConfidenceWaveform } from "../../../components/ConfidenceWaveform";

const STEPS = [
  "Intake complete",
  "Finding locksmiths nearby",
  "Calling Speedy Lock & Key",
  "Calling Neighborhood Locksmith",
  "Calling Premium Secure",
  "Negotiating with Premium Secure",
  "Recommendation ready",
];

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [step, setStep] = useState(0);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiated, setNegotiated] = useState(false);
  const [vendorCPrice, setVendorCPrice] = useState(165);

  // Auto-progress through steps
  useEffect(() => {
    if (step < 5) {
      const timer = setTimeout(() => setStep(s => s + 1), 1600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleTriggerNegotiation = async () => {
    setIsNegotiating(true);
    setStep(5);
    try {
      await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: id }),
      });
    } catch {
      // ignore — fallback to mock
    }
    setTimeout(() => {
      setVendorCPrice(145);
      setIsNegotiating(false);
      setNegotiated(true);
      setStep(6);
    }, 2200);
  };

  const showA = step >= 2;
  const showB = step >= 3;
  const showC = step >= 4;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#111111] font-sans pb-24">
      <nav className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto border-b border-black/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Mission: {id}</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30a985] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30a985]"></span>
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT: Job Spec + Live Call Log + Actions */}
        <div className="lg:col-span-1 space-y-5">

          {/* Job Spec Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
            <h2 className="text-lg font-serif font-semibold mb-4">Job Spec</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-500">Issue:</span>
                <span className="font-semibold">Broken key inside lock</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Door:</span>
                <span className="font-semibold">Main entry · Deadbolt</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-semibold">SF, 94109</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Urgency:</span>
                <span className="font-semibold">Locked out NOW</span>
              </li>
              <li className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="text-gray-500">Ideal price:</span>
                <span className="font-semibold">$120</span>
              </li>
              <li className="flex justify-between">
                <span className="text-red-500 font-medium">Max Budget:</span>
                <span className="font-bold text-red-600">$150</span>
              </li>
            </ul>
          </div>

          {/* Live Call Log */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
            <h2 className="text-lg font-serif font-semibold mb-4">Live Call Log</h2>
            <div className="space-y-3">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-0.5 transition-all ${done ? "bg-[#30a985]" : active ? "bg-[#30a985] animate-pulse scale-125" : "bg-gray-200"}`} />
                    </div>
                    <span className={done ? "text-gray-500" : active ? "font-semibold text-black" : "text-gray-300"}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {step >= 4 && (
            <div className="space-y-3">
              <button
                onClick={handleTriggerNegotiation}
                disabled={isNegotiating || negotiated}
                className={`w-full py-4 rounded-full font-medium text-white transition-all shadow-md ${isNegotiating || negotiated ? "bg-gray-300 cursor-not-allowed" : "bg-[#111111] hover:bg-gray-800 active:scale-95"}`}
              >
                {isNegotiating ? "AI is Negotiating..." : negotiated ? "✓ Negotiation Complete" : "Trigger Demo Negotiation"}
              </button>

              {negotiated && (
                <button
                  onClick={() => router.push(`/report/${id}`)}
                  className="w-full py-4 rounded-full font-medium text-[#111111] bg-white border border-[#111111] hover:bg-gray-50 transition-all"
                >
                  View Final Report →
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Vendor Quotes */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
            Vendor Quotes ({[showA, showB, showC].filter(Boolean).length}/3)
          </h2>

          <div className="space-y-5">

            {/* Vendor A — Bait & Switch — HIGH RISK */}
            {showA && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Speedy Lock &amp; Key</h3>
                    <p className="text-sm text-pink-600 font-medium">Refused total estimate</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-serif">Starts at $39</span>
                    <p className="text-sm text-gray-500">20 min ETA</p>
                  </div>
                </div>

                <div className="p-4 bg-pink-50 rounded-2xl mb-4 border border-pink-100">
                  <div className="flex items-center gap-3 mb-2">
                    <VoiceTrustBadge level="Low" />
                    <span className="text-xs font-bold text-pink-700 uppercase tracking-wide">HIGH RISK DETECTED</span>
                  </div>
                  <p className="text-sm italic text-gray-700">&ldquo;Uh… well, it depends on the lock.&rdquo;</p>
                  <div className="mt-3"><ConfidenceWaveform score={35} /></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-pink-50 text-pink-600 border border-pink-100 rounded-full text-xs font-medium">Tech decides drilling</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">No ID required</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">Risk score: 85/100</span>
                </div>
              </div>
            )}

            {/* Vendor B — Honest Local */}
            {showB && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Neighborhood Locksmith</h3>
                    <p className="text-sm text-green-600 font-medium">All-in quote confirmed</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-serif">$130</span>
                    <p className="text-sm text-gray-500">30 min ETA</p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-2xl mb-4 border border-green-100">
                  <div className="flex items-center gap-3 mb-2">
                    <VoiceTrustBadge level="High" />
                  </div>
                  <p className="text-sm italic text-gray-700">&ldquo;It&rsquo;s $130 total, including dispatch.&rdquo;</p>
                  <div className="mt-3"><ConfidenceWaveform score={95} /></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">No-drill first</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">ID verified</span>
                  <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-xs font-medium">Risk score: 10/100</span>
                </div>
              </div>
            )}

            {/* Vendor C — Premium Fast, negotiable */}
            {showC && (
              <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-[#111111] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">Fastest ETA</div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Premium Secure</h3>
                    <p className={`text-sm font-medium ${negotiated ? "text-[#30a985]" : "text-yellow-600"}`}>
                      {negotiated ? "Negotiated · Low-med risk" : "Unclear pricing · Medium risk"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {negotiated && <span className="text-lg text-gray-400 line-through">$165</span>}
                      <span className={`text-2xl font-serif font-bold transition-colors ${negotiated ? "text-[#30a985]" : "text-[#111111]"}`}>
                        ${vendorCPrice}
                      </span>
                    </div>
                    <p className="text-sm text-[#111111] font-semibold">15 min ETA</p>
                  </div>
                </div>

                {isNegotiating && (
                  <div className="p-4 bg-purple-50 rounded-2xl mb-4 border border-purple-100 flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                    <span className="text-sm font-medium text-purple-800">
                      &ldquo;I have a confirmed quote at $130 all-in with no-drill-first. Can you match it or include two keys?&rdquo;
                    </span>
                  </div>
                )}

                {!isNegotiating && negotiated && (
                  <div className="p-4 bg-[#f7f5f0] rounded-2xl mb-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <VoiceTrustBadge level="Medium" />
                      <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">VoiceTrust hesitation detected</span>
                    </div>
                    <p className="text-sm italic text-gray-700">&ldquo;Um, we can drop it to $145 if you book right now.&rdquo;</p>
                    <div className="mt-3"><ConfidenceWaveform score={65} /></div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${negotiated ? "bg-[#30a985]/10 text-[#30a985] border-[#30a985]/20" : "bg-yellow-50 text-yellow-700 border-yellow-100"}`}>
                    {negotiated ? "✓ $145 all-in confirmed" : "Starts at $165"}
                  </span>
                  {negotiated && <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">No-drill first</span>}
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">Risk score: 25/100</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
