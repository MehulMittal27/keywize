"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMissionState } from "@/components/useMissionState";
import { negotiatedOffers, type NegotiatedOffer } from "@/lib/pipelineOffers";

const NEGOTIATION_FAILED_LABEL = "Negotiation could not be completed safely";

// An offer is sellable once it has a negotiated price, or - if negotiation
// failed - falls back to its basic price rather than blocking selection.
function sellablePrice(offer: NegotiatedOffer): number | null {
  if (offer.negotiatedPrice !== null) return offer.negotiatedPrice;
  if (offer.statusLabel === NEGOTIATION_FAILED_LABEL && offer.basicPrice !== null) {
    return offer.basicPrice;
  }
  return null;
}

function sortedByNegotiatedPrice(offers: NegotiatedOffer[]): NegotiatedOffer[] {
  const quoted = offers.filter((o) => sellablePrice(o) !== null);
  const waiting = offers.filter((o) => sellablePrice(o) === null);
  quoted.sort((a, b) => (sellablePrice(a) as number) - (sellablePrice(b) as number));
  return [...quoted, ...waiting];
}

export default function NegotiatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { mission, loadError } = useMissionState(id);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const hasTriggeredNegotiation = useRef(false);

  useEffect(() => {
    if (!mission) return;
    if (hasTriggeredNegotiation.current) return;
    if (mission.status !== "quotes_ready") return;
    hasTriggeredNegotiation.current = true;
    fetch("/api/negotiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId: id }),
    }).catch(() => {
      // Ignore - the mission page's own "Negotiate fastest option" button
      // covers the manual path, and useMissionState keeps polling either way.
    });
  }, [mission, id]);

  if (!mission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6 text-center text-[#111111]">
        <div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="font-medium">Loading the negotiation state...</p>
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        </div>
      </main>
    );
  }

  const offers = sortedByNegotiatedPrice(negotiatedOffers(mission));
  const quoted = offers.filter((o) => sellablePrice(o) !== null);
  const waiting = offers.filter((o) => sellablePrice(o) === null);
  const pending = pendingId ? offers.find((o) => o.quoteId === pendingId) ?? null : null;

  const confirmSelection = async (offer: NegotiatedOffer) => {
    setIsConfirming(true);
    try {
      await fetch(`/api/missions/${id}/select-locksmith`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: offer.quoteId }),
      });
    } catch {
      // Keep the demo reliable - the confirmation page will just show "pending" longer.
    }
    router.push(`/mission/${id}/confirmation`);
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24 text-[#111111]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between border-b border-black/5 px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm text-white">⌁</span>
          <span className="font-bold tracking-tight">Keywize</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/mission/${id}/prices`} className="text-sm font-semibold text-gray-600 hover:text-black">
            ← Basic price
          </Link>
          <span className="hidden text-sm font-medium text-gray-400 sm:inline">Negotiated offers</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pt-10">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            {quoted.length} of {offers.length} locksmiths negotiated
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Negotiated offers</p>
          <h1 className="mt-1 max-w-3xl font-serif text-4xl tracking-tight sm:text-5xl">
            Every offer, negotiated down.
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Keywize negotiated with each locksmith on your behalf. Sorted by negotiated price, lowest first.
          </p>
        </header>

        {loadError && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

        <section className="space-y-3" aria-label="Negotiated offers">
          {quoted.map((offer, index) => {
            const price = sellablePrice(offer) as number;
            const wasNegotiated = offer.negotiatedPrice !== null && offer.basicPrice !== offer.negotiatedPrice;
            return (
              <div
                key={offer.quoteId}
                className={`rounded-3xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                  index === 0 ? "border-[#30a985]/40" : "border-black/5"
                }`}
              >
                <div className="grid gap-4 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f3ee] font-mono text-xs font-bold text-gray-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bold">{offer.name}</h2>
                    <p className="text-xs text-gray-400">{offer.phone || "Handled by Keywize"}</p>
                    {offer.statusLabel === NEGOTIATION_FAILED_LABEL && (
                      <p className="mt-1 text-xs font-medium text-pink-600">{offer.statusLabel} — showing the basic price</p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <div className="flex items-baseline justify-end gap-2">
                      {wasNegotiated && (
                        <span className="text-sm text-gray-400 line-through">${offer.basicPrice}</span>
                      )}
                      <span className={`font-serif text-2xl font-bold ${index === 0 ? "text-[#25866b]" : "text-black"}`}>
                        ${price}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-black/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setPendingId(offer.quoteId)}
                    className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800"
                  >
                    Select Locksmith
                  </button>
                </div>
              </div>
            );
          })}

          {waiting.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">Still working</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              {waiting.map((offer) => (
                <div key={offer.quoteId} className="rounded-3xl border border-black/5 bg-white p-5 opacity-60 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-gray-300" />
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-500">{offer.name}</h2>
                    </div>
                    <div className="sm:text-right">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                        {offer.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

      </main>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="font-serif text-lg font-semibold">Confirm this locksmith?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to select <span className="font-semibold text-black">{pending.name}</span> at ${sellablePrice(pending)}?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => confirmSelection(pending)}
                className="w-full rounded-full bg-black px-5 py-3 font-semibold text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isConfirming ? "Confirming..." : "Yes, select this locksmith"}
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setPendingId(null)}
                className="w-full rounded-full border border-black/10 px-5 py-3 font-semibold text-black transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
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
