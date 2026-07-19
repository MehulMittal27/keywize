"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VoiceTrustBadge } from "../../../components/VoiceTrustBadge";
import { ConfidenceWaveform } from "../../../components/ConfidenceWaveform";
import type { Mission } from "../../../lib/types";

const STEPS = [
  "Intake complete",
  "Finding locksmiths nearby",
  "Calling Neighborhood Locksmith",
  "Calling Premium Secure",
  "Negotiating with Premium Secure",
  "Recommendation ready",
];

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [step, setStep] = useState(0);
  const [mission, setMission] = useState<Mission | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/missions/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Mission | null) => {
        if (cancelled || !data) return;
        setMission(data);
      })
      .catch(() => {
        // Keep the demo page reliable with built-in mock values.
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const jobSpec = mission?.jobSpec;

  // Auto-progress through every step in the Live Call Log
  useEffect(() => {
    if (step < STEPS.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 1600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const showB = step >= 2;
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
                <span className="font-semibold">{jobSpec?.caseType.replaceAll("_", " ") ?? "Broken key inside lock"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Door:</span>
                <span className="font-semibold">{jobSpec ? `${jobSpec.doorType.replaceAll("_", " ")} · ${jobSpec.lockType.replaceAll("_", " ")}` : "Main entry · Deadbolt"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-semibold">{jobSpec ? `${jobSpec.locationCity}, ${jobSpec.locationZip}` : "SF, 94109"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Urgency:</span>
                <span className="font-semibold">{jobSpec?.urgency.replaceAll("_", " ") ?? "Locked out NOW"}</span>
              </li>
              <li className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="text-gray-500">Ideal price:</span>
                <span className="font-semibold">${jobSpec?.idealPrice ?? 120}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-red-500 font-medium">Max Budget:</span>
                <span className="font-bold text-red-600">${jobSpec?.maxPrice ?? 150}</span>
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
          {step >= STEPS.length - 1 && (
            <button
              onClick={() => router.push(`/report/${id}`)}
              className="w-full py-4 rounded-full font-medium text-white bg-[#111111] hover:bg-gray-800 active:scale-95 transition-all shadow-md"
            >
              View Final Report →
            </button>
          )}
        </div>

        {/* RIGHT: Vendor Quotes */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
            Vendor Quotes ({[showB, showC].filter(Boolean).length}/2)
          </h2>

          <div className="space-y-5">

            {/* Vendor B — Honest Local — clickable through to the full sorted price table */}
            {showB && (
              <Link
                href={`/mission/${id}/prices`}
                className="block bg-white p-6 rounded-3xl shadow-sm border border-black/5 hover:shadow-md hover:border-[#30a985]/30 transition-all cursor-pointer"
              >
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

                <div className="flex flex-wrap gap-2 items-center">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">No-drill first</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">ID verified</span>
                  <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-xs font-medium">Risk score: 10/100</span>
                  <span className="ml-auto text-xs font-semibold text-[#30a985]">Compare all quotes →</span>
                </div>
              </Link>
            )}

            {/* Vendor C — Premium Fast — clickable through to the negotiation window */}
            {showC && (
              <Link
                href={`/mission/${id}/negotiate`}
                className="block bg-white p-6 rounded-3xl shadow-md border-2 border-[#111111] relative overflow-hidden hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="absolute top-0 right-0 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">Fastest ETA</div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Negotiated Offers</h3>
                    <p className="text-sm text-yellow-600 font-medium">Unclear pricing · Medium risk</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-serif font-bold">$165</span>
                    <p className="text-sm text-[#111111] font-semibold">15 min ETA</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <span className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full text-xs font-medium">Starts at $165</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">Risk score: 25/100</span>
                  <span className="ml-auto text-xs font-semibold text-[#30a985]">View offers →</span>
                </div>
              </Link>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
