"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { LocksmithPriceResult } from "../../../../lib/types";

type ArrivalSlot = { id: string; label: string };
type NegotiatedResult = LocksmithPriceResult & { negotiatedPrice: number | null };

function getArrivalSlots(): ArrivalSlot[] {
  const now = new Date();
  const evening = new Date(now);
  evening.setHours(18, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowLabel = tomorrow.toLocaleDateString("en-US", { weekday: "long" });

  return [
    { id: "asap", label: "Today · ASAP (30–45 min)" },
    { id: "evening", label: `Today · ${evening.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` },
    { id: "tomorrow", label: `Tomorrow · ${tomorrowLabel} 9:00 AM` },
  ];
}

// Mock negotiation: knock ~13% off the basic price, rounded to the nearest $5.
function negotiatePrice(basicPrice: number): number {
  return Math.max(10, Math.round((basicPrice * 0.87) / 5) * 5);
}

export default function NegotiatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [results, setResults] = useState<NegotiatedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentsRunning, setAgentsRunning] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Record<string, string>>({});
  const [confirmedVendor, setConfirmedVendor] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  // Computed client-side only (after mount) to avoid a server/client render
  // mismatch from date-based labels.
  const [arrivalSlots, setArrivalSlots] = useState<ArrivalSlot[]>([]);

  useEffect(() => {
    setArrivalSlots(getArrivalSlots());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      // Simulate negotiation calls running in parallel (1.5s visual delay)
      await new Promise((r) => setTimeout(r, 1500));
      if (cancelled) return;
      setAgentsRunning(false);

      const res = await fetch(`/api/missions/${id}/prices`);
      if (cancelled || !res.ok) return;
      const data = await res.json();
      const priceResults: LocksmithPriceResult[] = data.priceResults ?? [];
      const negotiated: NegotiatedResult[] = priceResults
        .map((r) => ({ ...r, negotiatedPrice: r.basicPrice !== null ? negotiatePrice(r.basicPrice) : null }))
        .sort((a, b) => {
          if (a.negotiatedPrice === null) return 1;
          if (b.negotiatedPrice === null) return -1;
          return a.negotiatedPrice - b.negotiatedPrice;
        });
      if (!cancelled) {
        setResults(negotiated);
        setLoading(false);
      }
    }

    fetchPrices();
    return () => { cancelled = true; };
  }, [id]);

  const quoted = results.filter((r) => r.negotiatedPrice !== null);
  const unquoted = results.filter((r) => r.negotiatedPrice === null);
  const best = quoted[0] ?? null;
  const confirmedResult = confirmedVendor ? results.find((r) => r.phone === confirmedVendor) ?? null : null;
  const confirmedSlot = confirmedVendor
    ? arrivalSlots.find((s) => s.id === selectedSlot[confirmedVendor]) ?? null
    : null;
  const pendingResult = pendingSelection ? results.find((r) => r.phone === pendingSelection) ?? null : null;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#111111] font-sans pb-24">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-4xl mx-auto border-b border-black/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/mission/${id}`} className="text-sm text-gray-500 hover:text-black transition-colors">
            ← Mission
          </Link>
          <span className="text-sm font-medium text-gray-400">Negotiated Offers</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-10 px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#30a985]/10 text-[#30a985] text-xs font-bold uppercase tracking-wide border border-[#30a985]/20 mb-4">
            <span className={`w-2 h-2 rounded-full bg-[#30a985] ${agentsRunning ? "animate-pulse" : ""}`} />
            {agentsRunning ? "Negotiating..." : `${quoted.length} locksmiths negotiated`}
          </div>
          <h1 className="text-4xl font-serif tracking-tight mb-2">
            Negotiated Offers
          </h1>
          <p className="text-gray-500 text-base">
            Keywize negotiated with each locksmith on your behalf. Results sorted by negotiated price, lowest first.
          </p>
        </div>

        {/* Agent slots status bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: 10 }).map((_, i) => {
            const result = results[i];
            const color = !result
              ? "bg-gray-200"
              : result.negotiatedPrice !== null
              ? "bg-[#30a985]"
              : result.status === "refused"
              ? "bg-pink-400"
              : "bg-gray-300";
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full transition-all duration-700 ${agentsRunning ? "bg-gray-200 animate-pulse" : color}`} />
                <span className="text-[9px] text-gray-400 font-mono">A{i + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-gray-100 rounded" />
                    <div className="h-3 w-56 bg-gray-100 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results table */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-4 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Service</div>
              <div className="col-span-4">Address</div>
              <div className="col-span-3 text-right">Negotiated Price</div>
            </div>

            {/* Quoted rows */}
            {quoted.map((r, i) => {
              const isConfirmed = confirmedVendor === r.phone;
              return (
                <div
                  key={r.phone}
                  className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md ${
                    isConfirmed
                      ? "border-[#30a985] ring-2 ring-[#30a985]/30"
                      : i === 0
                      ? "border-[#30a985]/40 ring-1 ring-[#30a985]/20"
                      : "border-black/5"
                  }`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center px-5 py-4">
                    {/* Rank */}
                    <div className="col-span-1">
                      <span className="text-sm font-mono text-gray-400">{i + 1}</span>
                    </div>

                    {/* Name + phone */}
                    <div className="col-span-4">
                      <div className="font-semibold text-sm text-[#111111]">{r.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{r.phone}</div>
                    </div>

                    {/* Address */}
                    <div className="col-span-4">
                      <div className="text-sm text-gray-600">{r.address}</div>
                    </div>

                    {/* Price */}
                    <div className="col-span-3 text-right">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-sm text-gray-400 line-through">${r.basicPrice}</span>
                        <span className={`text-lg font-serif font-bold ${i === 0 ? "text-[#30a985]" : "text-[#111111]"}`}>
                          ${r.negotiatedPrice}
                        </span>
                      </div>
                    </div>
                  </div>

                  {i === 0 && !confirmedVendor && (
                    <div className="px-5 pb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#30a985] bg-[#30a985]/10 px-2 py-0.5 rounded-full">
                        Best negotiated deal
                      </span>
                    </div>
                  )}

                  {/* Arrival time selection + Select Locksmith */}
                  <div className="px-5 pb-5 pt-2 border-t border-gray-50">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Arrival time</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {arrivalSlots.map((slot) => {
                        const active = selectedSlot[r.phone] === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlot((prev) => ({ ...prev, [r.phone]: slot.id }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              active
                                ? "bg-[#111111] text-white border-[#111111]"
                                : "bg-[#f7f5f0] text-gray-600 border-transparent hover:border-gray-300"
                            }`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingSelection(r.phone)}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                        isConfirmed
                          ? "bg-[#30a985] text-white hover:bg-[#279670] active:scale-95"
                          : "bg-[#111111] text-white hover:bg-gray-800 active:scale-95"
                      }`}
                    >
                      {isConfirmed ? "✓ Locksmith Selected" : "Select Locksmith"}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Divider before unquoted */}
            {unquoted.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">No price returned</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {/* Unquoted rows */}
            {unquoted.map((r) => (
              <div key={r.phone} className="bg-white rounded-2xl border border-black/5 shadow-sm opacity-60">
                <div className="grid grid-cols-12 gap-4 items-center px-5 py-4">
                  <div className="col-span-1">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="font-semibold text-sm text-gray-500">{r.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 font-mono">{r.phone}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-sm text-gray-400">{r.address}</div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      r.status === "refused"
                        ? "bg-pink-50 text-pink-600"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.status === "refused" ? "Declined" : "No answer"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary footer */}
        {!loading && confirmedResult && (
          <div className="mt-8 bg-[#30a985] text-white rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Locksmith selected</div>
              <div className="text-xl font-bold">{confirmedResult.name}</div>
              <div className="text-sm text-white/80 mt-0.5">{confirmedSlot?.label ?? confirmedResult.address}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-serif font-bold">${confirmedResult.negotiatedPrice}</div>
              <div className="text-xs text-white/70 mt-1">Negotiated · dispatch will be notified</div>
            </div>
          </div>
        )}

        {!loading && !confirmedResult && best && (
          <div className="mt-8 bg-[#111111] text-white rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Best negotiated deal</div>
              <div className="text-xl font-bold">{best.name}</div>
              <div className="text-sm text-gray-400 mt-0.5">{best.address}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-serif font-bold text-[#30a985]">${best.negotiatedPrice}</div>
              <div className="text-xs text-gray-400 mt-1">Was ${best.basicPrice} · ready to book</div>
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && results.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No locksmith leads found yet.</p>
            <p className="text-sm mt-2">Leads are discovered in the background after intake.</p>
          </div>
        )}
      </main>

      {/* Confirm-selection modal */}
      {pendingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-serif font-semibold mb-2">Book this locksmith?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Confirm you want to book{" "}
              <span className="font-semibold text-[#111111]">{pendingResult.name}</span> at the negotiated ${pendingResult.negotiatedPrice} rate.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmedVendor(pendingSelection);
                  setPendingSelection(null);
                }}
                className="w-full py-3 rounded-full font-medium text-white bg-[#111111] hover:bg-gray-800 active:scale-95 transition-all"
              >
                Yes, book this locksmith
              </button>
              <button
                type="button"
                onClick={() => setPendingSelection(null)}
                className="w-full py-3 rounded-full font-medium text-[#111111] border border-black/10 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
