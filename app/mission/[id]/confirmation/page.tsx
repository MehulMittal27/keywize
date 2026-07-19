"use client";

import { use } from "react";
import Link from "next/link";
import { useMissionState } from "@/components/useMissionState";

export default function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { mission, loadError } = useMissionState(id);

  if (!mission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6 text-center text-[#111111]">
        <div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="font-medium">Loading the booking state...</p>
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        </div>
      </main>
    );
  }

  const offer = mission.selectedMockOffer;

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24 text-[#111111]">
      <nav className="mx-auto flex max-w-3xl items-center justify-between border-b border-black/5 px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm text-white">⌁</span>
          <span className="font-bold tracking-tight">Keywize</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/mission/${id}`} className="text-sm font-semibold text-gray-600 hover:text-black">
            ← Mission
          </Link>
          <span className="hidden text-sm font-medium text-gray-400 sm:inline">Confirmation</span>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pt-12">
        {!offer && (
          <section className="rounded-3xl border border-dashed border-black/10 bg-white/60 px-6 py-16 text-center">
            <h1 className="font-serif text-2xl">No locksmith selected yet.</h1>
            <p className="mt-2 text-sm text-gray-500">Select a locksmith first to see the booking status here.</p>
            <Link
              href={`/mission/${id}/prices`}
              className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
            >
              ← Back to basic price
            </Link>
          </section>
        )}

        {offer && offer.status === "pending" && (
          <section className="rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Confirming</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight">
              Waiting for the agent to confirm with {offer.name}...
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              Keywize is calling {offer.name} to confirm the ${offer.price} booking. This page updates automatically.
            </p>
          </section>
        )}

        {offer && offer.status === "ready" && (
          <section className="overflow-hidden rounded-3xl border-2 border-[#30a985] bg-white shadow-xl shadow-black/5">
            <div className="bg-[#30a985] p-8 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">Confirmed</p>
              <h1 className="mt-2 font-serif text-3xl">{offer.name} is booked.</h1>
              <p className="mt-2 text-sm text-white/85">
                ${offer.price} - {offer.address}
              </p>
            </div>
            <div className="p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Call recording</p>
              <p className="mt-1 text-sm text-gray-500">A mock recording of the confirmation call.</p>
              {mission.recordingUrl && (
                <div className="mt-4 space-y-3">
                  <audio controls className="w-full" src={mission.recordingUrl}>
                    Your browser does not support the audio element.
                  </audio>
                  <a
                    href={mission.recordingUrl}
                    download
                    className="inline-block rounded-full border border-black/10 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    Download .m4a →
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {loadError && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
      </main>
    </div>
  );
}
