"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMissionState } from "@/components/useMissionState";
import { generateMockOffers, type MockLocksmithOffer } from "@/lib/mockLocksmithOffers";

function sortedByPrice(offers: MockLocksmithOffer[]): MockLocksmithOffer[] {
  const quoted = offers.filter((o) => o.basicPrice !== null);
  const unquoted = offers.filter((o) => o.basicPrice === null);
  quoted.sort((a, b) => (a.basicPrice as number) - (b.basicPrice as number));
  return [...quoted, ...unquoted];
}

export default function PricesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { mission, loadError } = useMissionState(id);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!mission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6 text-center text-[#111111]">
        <div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="font-medium">Loading stored quote results...</p>
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        </div>
      </main>
    );
  }

  const offers = sortedByPrice(
    generateMockOffers(mission.jobSpec.locationCity, mission.jobSpec.locationZip)
  );
  const quoted = offers.filter((o) => o.basicPrice !== null);
  const unquoted = offers.filter((o) => o.basicPrice === null);
  const pending = pendingId ? offers.find((o) => o.id === pendingId) ?? null : null;

  const confirmSelection = async (offer: MockLocksmithOffer) => {
    setIsConfirming(true);
    try {
      await fetch(`/api/missions/${id}/select-locksmith`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          name: offer.name,
          phone: offer.phone,
          address: offer.address,
          price: offer.basicPrice,
        }),
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
          <Link href={`/mission/${id}`} className="text-sm font-semibold text-gray-600 hover:text-black">
            ← Mission
          </Link>
          <span className="hidden text-sm font-medium text-gray-400 sm:inline">Basic price</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pt-10">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#30a985]/20 bg-[#30a985]/10 px-3 py-1.5 text-xs font-bold text-[#25866b]">
            <span className="h-2 w-2 rounded-full bg-[#30a985]" />
            {quoted.length} of {offers.length} locksmiths returned a basic price
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Basic price</p>
              <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">Compare every basic quote.</h1>
              <p className="mt-3 max-w-2xl text-gray-600">
                Locksmiths near {mission.jobSpec.locationCity}, {mission.jobSpec.locationZip} returned a basic price. Sorted lowest first.
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-gray-500">Hard maximum</p>
              <p className="font-serif text-3xl font-bold">${mission.jobSpec.maxPrice}</p>
            </div>
          </div>
        </header>

        {loadError && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

        <section className="space-y-3" aria-label="Basic price offers">
          {quoted.map((offer, index) => (
            <div
              key={offer.id}
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
                  <p className="text-xs text-gray-400">{offer.phone}</p>
                  <p className="mt-1 text-sm text-gray-500">{offer.address}</p>
                </div>
                <div className="sm:text-right">
                  <p className={`font-serif text-2xl font-bold ${index === 0 ? "text-[#25866b]" : "text-black"}`}>
                    ${offer.basicPrice}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-black/5 pt-4">
                <button
                  type="button"
                  onClick={() => setPendingId(offer.id)}
                  className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800"
                >
                  Select Locksmith
                </button>
              </div>
            </div>
          ))}

          {unquoted.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">No price returned</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              {unquoted.map((offer) => (
                <div key={offer.id} className="rounded-3xl border border-black/5 bg-white p-5 opacity-60 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">✕</span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-500">{offer.name}</h2>
                      <p className="text-xs text-gray-400">{offer.phone}</p>
                      <p className="mt-1 text-sm text-gray-400">{offer.address}</p>
                    </div>
                    <div className="sm:text-right">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${offer.status === "refused" ? "bg-pink-50 text-pink-600" : "bg-gray-100 text-gray-500"}`}>
                        {offer.status === "refused" ? "Declined" : "No answer"}
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
              Are you sure you want to select <span className="font-semibold text-black">{pending.name}</span> at ${pending.basicPrice}?
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
                onClick={() => router.push(`/mission/${id}`)}
                className="w-full rounded-full border border-black/10 px-5 py-3 font-semibold text-black transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Wait for negotiation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
