"use client";

import { use } from "react";
import Link from "next/link";
import { VendorCallProgress } from "@/components/VendorCallProgress";
import { VoiceTrustBadge } from "@/components/VoiceTrustBadge";
import { useMissionState } from "@/components/useMissionState";
import type { Mission, Quote } from "@/lib/types";

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderedQuotes(mission: Mission): Quote[] {
  const ranked = mission.recommendation?.ranked ?? mission.quotes;
  const rankedIds = new Set(ranked.map((quote) => quote.id));
  return [...ranked, ...mission.quotes.filter((quote) => !rankedIds.has(quote.id))];
}

function quotePrice(quote: Quote): string {
  if (quote.totalEstimate !== null) return `$${quote.totalEstimate}`;
  if (quote.dispatchFee !== null) return `Starts at $${quote.dispatchFee}`;
  return "No firm total";
}

function QuoteRow({ quote, rank, recommended }: { quote: Quote; rank: number; recommended: boolean }) {
  const signal = quote.voiceTrustSignals[0];

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        recommended ? "border-[#30a985]/50 ring-1 ring-[#30a985]/20" : "border-black/5"
      }`}
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f3ee] font-mono text-xs font-bold text-gray-500">
          {rank}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">{quote.vendorName}</h2>
            {recommended && (
              <span className="rounded-full bg-[#30a985]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#25866b]">
                Stored recommendation
              </span>
            )}
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                quote.riskLevel === "High"
                  ? "bg-pink-50 text-pink-700"
                  : quote.riskLevel === "Low"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {quote.riskLevel} risk
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {quote.isTotalAllIn ? "All-in confirmed" : "Pricing not confirmed all-in"}
            {quote.etaMinutes === null ? " - ETA unknown" : ` - ${quote.etaMinutes} min ETA`}
          </p>
        </div>
        <div className="sm:text-right">
          <p className={`font-serif text-2xl font-bold ${recommended ? "text-[#25866b]" : "text-black"}`}>
            {quotePrice(quote)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Risk {quote.riskScore}/100</p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-black/5 bg-[#fcfbf8] p-5 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Material terms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {quote.drillingPolicy}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-black/5">
              {quote.idRequired === true
                ? "Proof required"
                : quote.idRequired === false
                  ? "No proof required"
                  : "Proof policy unknown"}
            </span>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Transcript evidence</p>
            {signal && <VoiceTrustBadge level={signal.trustLevel} />}
          </div>
          <blockquote className="mt-2 text-sm italic leading-relaxed text-gray-600">
            &ldquo;{quote.transcriptEvidence[0] ?? "No transcript evidence stored yet."}&rdquo;
          </blockquote>
        </div>
      </div>
    </article>
  );
}

export default function PricesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { mission, loadError } = useMissionState(id);

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

  const quotes = orderedQuotes(mission);
  const callerCalls = mission.vendorCalls.filter((call) => call.role === "caller");
  const recommendation = mission.recommendation?.recommended;
  const quotesReady = ["quotes_ready", "awaiting_vendor_selection"].includes(mission.status);
  const negotiationStarted = ["negotiating", "terms_secured", "awaiting_approval", "approved"].includes(
    mission.status
  );
  const reportReady = ["terms_secured", "awaiting_approval", "approved"].includes(mission.status);

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
          <span className="hidden text-sm font-medium text-gray-400 sm:inline">Stored quotes</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pt-10">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#30a985]/20 bg-[#30a985]/10 px-3 py-1.5 text-xs font-bold text-[#25866b]">
            <span className={`h-2 w-2 rounded-full bg-[#30a985] ${quotesReady || negotiationStarted ? "" : "animate-pulse"}`} />
            {humanize(mission.status)}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Price discovery</p>
              <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">Compare every stored quote.</h1>
              <p className="mt-3 max-w-2xl text-gray-600">
                Results are ranked from persisted pricing, risk, ETA, and transcript evidence. No vendor claim is invented or inferred.
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-gray-500">Hard maximum</p>
              <p className="font-serif text-3xl font-bold">${mission.jobSpec.maxPrice}</p>
            </div>
          </div>
        </header>

        <section className="mb-8 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Vendor call progress</p>
              <p className="mt-1 text-sm text-gray-600">{mission.quotes.length}/3 structured quotes stored</p>
            </div>
            <span className="rounded-full bg-[#f5f3ee] px-3 py-1 text-xs font-semibold text-gray-600">
              {mission.mode === "reliable_demo" ? "Disclosed replay" : "Controlled sandbox"}
            </span>
          </div>
          <VendorCallProgress calls={callerCalls} />
        </section>

        {loadError && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

        {quotes.length > 0 ? (
          <section className="space-y-4" aria-label="Stored vendor quotes">
            {quotes.map((quote, index) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                rank={index + 1}
                recommended={recommendation?.id === quote.id}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-black/10 bg-white/60 px-6 py-16 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
            <h2 className="font-serif text-2xl">Calls are still in progress.</h2>
            <p className="mt-2 text-sm text-gray-500">Stored quotes will appear here as each vendor call completes.</p>
          </section>
        )}

        <section className="mt-8 rounded-3xl bg-black p-6 text-white">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#85dfc3]">
                {reportReady ? "Terms secured" : negotiationStarted ? "Negotiation in progress" : "Next step"}
              </p>
              <h2 className="mt-1 font-serif text-2xl">
                {reportReady
                  ? "Review the evidence-backed final report."
                  : "Open the state-backed negotiation window."}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-300">
                Approval is not dispatch. Proof of residence is still required, and only a stored quote can be used as leverage.
              </p>
            </div>
            {reportReady ? (
              <Link href={`/report/${id}`} className="shrink-0 rounded-full bg-white px-6 py-3 text-center text-sm font-bold text-black">
                View final report →
              </Link>
            ) : quotesReady || negotiationStarted ? (
              <Link
                href={`/mission/${id}/negotiate`}
                className="shrink-0 rounded-full bg-white px-6 py-3 text-center text-sm font-bold text-black"
              >
                {quotesReady ? "Continue to negotiation →" : "View negotiation →"}
              </Link>
            ) : (
              <span className="shrink-0 rounded-full bg-white/15 px-6 py-3 text-center text-sm font-bold text-white/50">
                Waiting for quotes
              </span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
