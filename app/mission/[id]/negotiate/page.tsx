"use client";

import { use, useState } from "react";
import Link from "next/link";
import { VendorCallProgress } from "@/components/VendorCallProgress";
import { VoiceTrustBadge } from "@/components/VoiceTrustBadge";
import { useMissionState } from "@/components/useMissionState";
import type { Mission, Quote } from "@/lib/types";

const NEGOTIATION_STEPS = ["Quotes stored", "Validate leverage", "Closer call", "Terms persisted"];

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eligibleTarget(mission: Mission): Quote | null {
  return (
    mission.quotes
      .filter(
        (quote) =>
          quote.vendorId &&
          quote.totalEstimate !== null &&
          quote.totalEstimate > mission.jobSpec.maxPrice &&
          quote.isTotalAllIn &&
          quote.riskLevel !== "High"
      )
      .sort((a, b) => (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity))[0] ?? null
  );
}

function NegotiationProgress({ mission }: { mission: Mission }) {
  const closer = mission.vendorCalls.find((call) => call.role === "closer");
  const progress = mission.negotiation?.afterPrice
    ? 4
    : closer?.status === "connected" || closer?.status === "complete"
      ? 3
      : mission.negotiation
        ? 2
        : mission.quotes.length > 0
          ? 1
          : 0;

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Negotiation progress">
      {NEGOTIATION_STEPS.map((label, index) => {
        const complete = index < progress;
        const active = index === progress;
        return (
          <li key={label} className="min-w-0">
            <div
              className={`mb-2 h-1.5 rounded-full ${
                complete ? "bg-[#30a985]" : active ? "animate-pulse bg-[#30a985]" : "bg-black/10"
              }`}
            />
            <p className={`text-xs font-semibold ${complete || active ? "text-black" : "text-gray-400"}`}>
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function NegotiatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { mission, setMission, loadError, setLoadError } = useMissionState(id);
  const [isStarting, setIsStarting] = useState(false);

  const startNegotiation = async () => {
    if (!mission) return;
    setIsStarting(true);
    setLoadError("");

    try {
      const response = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Negotiation could not start");
      setMission(data.mission as Mission);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Negotiation could not start");
    } finally {
      setIsStarting(false);
    }
  };

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

  const canStart = ["quotes_ready", "awaiting_vendor_selection"].includes(mission.status);
  const target = mission.negotiation
    ? mission.quotes.find((quote) => quote.id === mission.negotiation?.targetQuoteId) ?? null
    : eligibleTarget(mission);
  const closerCalls = mission.vendorCalls.filter((call) => call.role === "closer");
  const negotiation = mission.negotiation;
  const reportReady = ["terms_secured", "awaiting_approval", "approved"].includes(mission.status);
  const latestSignal = target?.voiceTrustSignals.at(-1);

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24 text-[#111111]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between border-b border-black/5 px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm text-white">⌁</span>
          <span className="font-bold tracking-tight">Keywize</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/mission/${id}/prices`} className="text-sm font-semibold text-gray-600 hover:text-black">
            ← Stored quotes
          </Link>
          <span className="hidden text-sm font-medium text-gray-400 sm:inline">Negotiation</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pt-10">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
            <span className={`h-2 w-2 rounded-full bg-purple-500 ${mission.status === "negotiating" ? "animate-pulse" : ""}`} />
            {humanize(mission.status)}
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Negotiated offers</p>
          <h1 className="mt-1 max-w-3xl font-serif text-4xl tracking-tight sm:text-5xl">
            Improve the fastest safe option with evidence.
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Keywize uses only a persisted competitor quote as leverage, then stores the exact confirmed response before recommending anything.
          </p>
        </header>

        <section className="mb-8 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <NegotiationProgress mission={mission} />
          {closerCalls.length > 0 && (
            <div className="mt-6 border-t border-black/5 pt-5">
              <VendorCallProgress calls={closerCalls} />
            </div>
          )}
        </section>

        {loadError && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

        {!negotiation && (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <article className="relative overflow-hidden rounded-[32px] border-2 border-black bg-white p-7 shadow-xl shadow-black/5">
              <span className="absolute right-0 top-0 rounded-bl-xl bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                Fastest eligible
              </span>
              {target ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Negotiation candidate</p>
                  <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="font-serif text-3xl font-semibold">{target.vendorName}</h2>
                      <p className="mt-2 text-sm text-gray-500">
                        {target.etaMinutes ?? "Unknown"} minute ETA - {target.riskLevel.toLowerCase()} risk - all-in confirmed
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-serif text-4xl font-bold">${target.totalEstimate}</p>
                      <p className="text-xs font-semibold text-pink-600">
                        ${Math.max(0, (target.totalEstimate ?? 0) - mission.jobSpec.maxPrice)} above max
                      </p>
                    </div>
                  </div>
                  <blockquote className="mt-6 rounded-2xl bg-[#f8f7f3] p-4 text-sm italic leading-relaxed text-gray-700">
                    &ldquo;{target.transcriptEvidence[0]}&rdquo;
                  </blockquote>
                  <button
                    onClick={startNegotiation}
                    disabled={!canStart || isStarting}
                    className="mt-6 w-full rounded-full bg-black px-6 py-4 font-semibold text-white shadow-lg shadow-black/10 enabled:hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {isStarting
                      ? "Validating stored leverage..."
                      : canStart
                        ? "Negotiate fastest option →"
                        : "Waiting for all stored quotes"}
                  </button>
                </>
              ) : (
                <div className="py-10 text-center">
                  <h2 className="font-serif text-2xl">No safe target is ready.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Keywize will not negotiate a high-risk, incomplete, or unsupported quote.
                  </p>
                </div>
              )}
            </article>

            <aside className="space-y-5">
              <div className="rounded-3xl bg-[#e8faf3] p-6 text-sm leading-relaxed text-emerald-950">
                <p className="font-bold">Stored leverage only</p>
                <p className="mt-2">
                  The negotiation API validates that the competitor price, all-in status, material terms, and transcript still match mission state.
                </p>
              </div>
              <div className="rounded-3xl border border-black/5 bg-white p-6 text-sm leading-relaxed text-gray-600">
                <p className="font-bold text-black">No dispatch authorization</p>
                <p className="mt-2">
                  Negotiation changes a stored quote only. The user must separately approve secured terms, show proof at the door, and reject unexplained changes.
                </p>
              </div>
            </aside>
          </section>
        )}

        {negotiation && (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <article className="overflow-hidden rounded-[32px] border-2 border-black bg-white shadow-xl shadow-black/5">
              <div className="flex flex-col justify-between gap-5 border-b border-black/5 p-7 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Target offer</p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold">{target?.vendorName ?? "Stored vendor"}</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {target?.etaMinutes ?? "Unknown"} minute ETA retained in mission state
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="flex items-baseline gap-2 sm:justify-end">
                    <span className="font-serif text-xl text-gray-400 line-through">${negotiation.beforePrice}</span>
                    <span className="font-serif text-5xl font-bold text-[#25866b]">
                      {negotiation.afterPrice ? `$${negotiation.afterPrice}` : "..."}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {negotiation.status === "in_progress" ? "Closer call in progress" : humanize(negotiation.status)}
                  </p>
                </div>
              </div>

              <div className="p-7">
                <div className="rounded-3xl bg-purple-50 p-5 text-purple-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Validated leverage</p>
                  <p className="mt-2 font-semibold">
                    {negotiation.leverage.vendorName} - ${negotiation.leverage.total} all-in
                  </p>
                  <blockquote className="mt-3 text-sm italic leading-relaxed">
                    &ldquo;{negotiation.leverage.evidence[0]}&rdquo;
                  </blockquote>
                </div>

                {negotiation.afterPrice ? (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {negotiation.changedTerms.map((term) => (
                        <div key={term} className="rounded-2xl bg-[#f8f7f3] p-4 text-sm font-medium">
                          <span className="mr-2 text-[#30a985]">✓</span>{term}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-3xl border border-[#30a985]/20 bg-[#e8faf3] p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-serif text-xl font-semibold">Final transcript confirmation</p>
                        {latestSignal && <VoiceTrustBadge level={latestSignal.trustLevel} />}
                      </div>
                      <blockquote className="mt-3 text-sm leading-relaxed text-emerald-950">
                        &ldquo;{negotiation.transcriptEvidence[0]}&rdquo;
                      </blockquote>
                      <p className="mt-3 text-xs text-emerald-800">
                        VoiceTrust is an uncertainty signal, not a lie detector. The exact stored confirmation is the evidence.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-8 flex items-center gap-4 rounded-3xl border border-dashed border-black/10 p-6">
                    <div className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-black/10 border-t-black" />
                    <div>
                      <p className="font-semibold">Waiting for an exact confirmation...</p>
                      <p className="mt-1 text-sm text-gray-500">No improvement is shown until it is persisted.</p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <aside className="space-y-5">
              <div className="rounded-3xl bg-black p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-[#85dfc3]">
                  {reportReady ? "Ready for review" : "Negotiation running"}
                </p>
                <h3 className="mt-2 font-serif text-2xl">
                  {reportReady ? "Stored terms are ready." : "The closer is confirming every term."}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  {reportReady
                    ? "The final report includes ranking, transcript evidence, safety reminders, and separate approval."
                    : "This page updates from mission state automatically."}
                </p>
                {reportReady && (
                  <Link href={`/report/${id}`} className="mt-5 block rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-black">
                    View final report →
                  </Link>
                )}
              </div>
              <Link
                href={`/mission/${id}`}
                className="block rounded-full border border-black bg-white px-5 py-3 text-center text-sm font-semibold"
              >
                View all mission events
              </Link>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}
