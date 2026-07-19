"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { NegotiationPlaybook } from "@/components/NegotiationPlaybook";
import { VoiceTrustBadge } from "@/components/VoiceTrustBadge";
import { ConfidenceWaveform } from "@/components/ConfidenceWaveform";

const ACCEPTED_VENDORS: Record<string, {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  price: number;
  eta: string;
  riskLevel: string;
  riskScore: number;
  trustLevel: "High" | "Medium" | "Low";
  trustScore: number;
  transcriptLines: { speaker: string; text: string; highlight?: boolean }[];
  badges: string[];
}> = {
  A: {
    firstName: "Marcus", lastName: "Webb", company: "Speedy Lock & Key",
    phone: "(555) 019-2834", price: 39, eta: "20 min", riskLevel: "High", riskScore: 85,
    trustLevel: "Low", trustScore: 35,
    transcriptLines: [
      { speaker: "Keywize", text: "What is the total cost including all fees?" },
      { speaker: "Marcus", text: "Uh… well, it depends on the lock.", highlight: true },
    ],
    badges: [],
  },
  B: {
    firstName: "Daniel", lastName: "Reyes", company: "Neighborhood Locksmith",
    phone: "(555) 837-1120", price: 130, eta: "30 min", riskLevel: "Low", riskScore: 10,
    trustLevel: "High", trustScore: 95,
    transcriptLines: [
      { speaker: "Keywize", text: "What is the total cost?" },
      { speaker: "Daniel", text: "It's $130 total, including dispatch." },
      { speaker: "Keywize", text: "Do you drill the lock?" },
      { speaker: "Daniel", text: "We always try to pick it first without drilling." },
    ],
    badges: ["No-drill first", "ID verified", "All-in confirmed"],
  },
  C: {
    firstName: "Alex", lastName: "Petrov", company: "Premium Secure",
    phone: "(555) 991-4455", price: 145, eta: "15 min", riskLevel: "Medium", riskScore: 25,
    trustLevel: "Medium", trustScore: 65,
    transcriptLines: [
      { speaker: "Keywize", text: "What is the total price?" },
      { speaker: "Alex", text: "Usually it's $165 for emergency extraction." },
      { speaker: "Keywize", text: "Can you do $145? I have another quote for $130 but you're faster." },
      { speaker: "Alex", text: "Um, we can drop it to $145 if you book right now.", highlight: true },
    ],
    badges: ["$145 all-in", "No-drill first", "ID required", "1-yr warranty"],
  },
};

function AudioPlayer() {
  return (
    <div className="bg-[#f7f5f0] border border-black/8 rounded-[14px] p-4 flex items-center gap-4">
      <button
        aria-label="Play recording"
        className="w-10 h-10 rounded-[10px] bg-[#111111] flex items-center justify-center shrink-0 hover:bg-gray-700 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="ml-0.5">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-500 mb-1.5">Confirmed agreement recording</div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-[#B87333]/60"
              style={{ height: `${8 + Math.sin(i * 0.9) * 6 + ((i * 7) % 5)}px` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
          <span>0:00</span>
          <span>2:34</span>
        </div>
      </div>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const vendorKey = searchParams.get("vendor") ?? "C";
  const vendor = ACCEPTED_VENDORS[vendorKey] ?? ACCEPTED_VENDORS.C;

  const riskColor = vendor.riskLevel === "Low"
    ? "text-green-700 bg-green-50 border-green-100"
    : vendor.riskLevel === "High"
    ? "text-pink-700 bg-pink-50 border-pink-100"
    : "text-yellow-700 bg-yellow-50 border-yellow-100";

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#111111] font-sans pb-24">
      <nav className="flex items-center justify-between px-6 py-5 max-w-2xl mx-auto border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              <circle cx="7.5" cy="15.5" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </div>
        <span className="px-3 py-1 bg-[#30a985] text-white text-xs font-bold rounded-[8px] uppercase tracking-wide">
          Booked
        </span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pt-8 space-y-5">

        {/* Success hero */}
        <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-7 text-center">
          <div className="w-14 h-14 rounded-[14px] bg-[#30a985]/10 border-2 border-[#30a985]/20 flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight mb-2">
            Your job is booked!
          </h1>
          <p className="text-gray-500 text-base">
            {vendor.firstName} {vendor.lastName} from <strong>{vendor.company}</strong> is on the way.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 text-base font-bold">
            <span className="text-3xl font-serif">${vendor.price}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 font-medium">{vendor.eta} ETA</span>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-black/8 text-sm font-medium shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            ID Verified
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-black/8 text-sm font-medium shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Guaranteed Price
          </span>
          {vendor.badges.map(b => (
            <span key={b} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-black/8 text-sm font-medium shadow-sm">
              {b}
            </span>
          ))}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-sm font-medium ${riskColor}`}>
            Risk {vendor.riskScore}/100
          </span>
        </div>

        {/* SMS confirmation */}
        <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#30a985]/10 border border-[#30a985]/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-sm mb-0.5">SMS confirmation sent</div>
            <p className="text-sm text-gray-500">
              A confirmation has been sent to {vendor.firstName} {vendor.lastName} at {vendor.phone}. They will contact you before arrival.
            </p>
          </div>
        </div>

        {/* Audio recording */}
        <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span className="font-semibold text-sm">Agreement recording saved</span>
          </div>
          <AudioPlayer />
          <p className="mt-3 text-xs text-gray-400">
            The audio recording of the confirmed agreement is saved in your personal cabinet.
          </p>
        </div>

        {/* Specialist card */}
        <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Specialist details</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-[#f7f5f0] border-2 border-black/8 flex items-center justify-center font-serif text-lg font-bold">
              {vendor.firstName[0]}{vendor.lastName[0]}
            </div>
            <div>
              <div className="font-bold">{vendor.firstName} {vendor.lastName}</div>
              <div className="text-sm text-gray-400">{vendor.company}</div>
            </div>
            <VoiceTrustBadge level={vendor.trustLevel} score={vendor.trustScore} className="ml-auto" />
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-gray-400">Agreed price</span><span className="font-bold text-[#30a985]">${vendor.price} all-in</span></div>
            <div className="flex justify-between"><span className="text-gray-400">ETA</span><span className="font-medium">{vendor.eta}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="font-medium">{vendor.phone}</span></div>
          </div>

          {/* Transcript */}
          {vendor.transcriptLines.length > 0 && (
            <div className="bg-[#fbfaf7] rounded-[14px] p-4 border border-black/5 space-y-2.5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Transcript evidence</div>
              {vendor.transcriptLines.map((line, i) => (
                <div key={i} className="text-sm">
                  <span className="font-bold text-[#111111]">{line.speaker}: </span>
                  {line.highlight ? (
                    <span className="bg-yellow-100 px-1 rounded">{line.text}</span>
                  ) : (
                    <span className="text-gray-600">{line.text}</span>
                  )}
                </div>
              ))}
              <div className="mt-2"><ConfidenceWaveform score={vendor.trustScore} /></div>
            </div>
          )}
        </div>

        <NegotiationPlaybook tactics={[
          "Confirmed all-in total before booking",
          "Used competitor quote as leverage",
          "Verified no-drill-first policy",
          "Locked dispatch + labor + parts in writing",
        ]} />

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-4">
          <Link href="/" className="flex-1 py-4 rounded-[14px] bg-[#111111] text-white font-semibold text-center hover:bg-gray-800 active:scale-[0.97] transition-all shadow-xl shadow-black/10">
            Back to home
          </Link>
          <Link href="/demo" className="flex-1 py-4 rounded-[14px] bg-white text-[#111111] font-semibold text-center border border-gray-200 hover:bg-gray-50 active:scale-[0.97] transition-all">
            Demo panel
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
