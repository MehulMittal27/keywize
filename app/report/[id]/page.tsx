import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteApproval } from "@/components/QuoteApproval";
import { VoiceTrustBadge } from "@/components/VoiceTrustBadge";
import { getMission } from "@/lib/store";

function money(value: number | null): string {
  return value === null ? "No firm total" : `$${value}`;
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = getMission(id);
  if (!mission) notFound();

  const recommendation = mission.recommendation;
  const winner = recommendation?.recommended;
  const negotiation = mission.negotiation;
  const reportReady = ["terms_secured", "awaiting_approval", "approved"].includes(
    mission.status
  );

  if (!reportReady || !winner || !negotiation?.afterPrice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6 text-center text-[#111111]">
        <div className="max-w-md rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Report pending</p>
          <h1 className="mt-3 font-serif text-3xl">Terms are not secured yet.</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            The report appears only after a negotiation result is stored in the mission state.
          </p>
          <Link href={`/mission/${id}`} className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">
            Return to mission
          </Link>
        </div>
      </main>
    );
  }

  const fallbackQuote = mission.quotes.find(
    (quote) => quote.id === negotiation.leverage.sourceQuoteId
  );
  const highRiskQuote = mission.quotes.find((quote) => quote.riskLevel === "High");
  const alternatives = recommendation.ranked.filter((quote) => quote.id !== winner.id);
  const savings = Math.max(0, negotiation.beforePrice - negotiation.afterPrice);
  const latestSignal = winner.voiceTrustSignals.at(-1);

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24 text-[#111111]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between border-b border-black/5 px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm text-white">⌁</span>
          <span className="font-bold">Keywize</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/mission/${id}`} className="text-sm font-semibold text-gray-600 hover:text-black">
            Mission events
          </Link>
          <span className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white">Terms secured</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 pt-12">
        <header className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              {mission.mode === "reliable_demo"
                ? "Reliable Demo - simulated vendors"
                : mission.fallbackReason
                  ? "Live Sandbox - reliable replay fallback"
                  : "Live Sandbox - controlled calls"}
            </span>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold">
              Awaiting quote approval
            </span>
          </div>
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">
            The fastest safe option is now under your ${mission.jobSpec.maxPrice} maximum.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
            {mission.quotes.length} structured quotes stored. Vendor C improved by ${savings}. Vendor B remains the transparent fallback, and Vendor A is flagged from stored evidence.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[34px] border-2 border-black bg-white p-7 shadow-xl shadow-black/5 sm:p-9">
            <div className="flex flex-col justify-between gap-5 border-b border-black/5 pb-7 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Recommended from stored ranking</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold">{winner.vendorName}</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Fastest eligible all-in quote within the hard budget.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-baseline gap-2 sm:justify-end">
                  <span className="font-serif text-xl text-gray-400 line-through">${negotiation.beforePrice}</span>
                  <span className="font-serif text-5xl font-bold text-emerald-600">${negotiation.afterPrice}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{winner.etaMinutes} minute ETA retained</p>
              </div>
            </div>

            <div className="my-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#f8f7f3] p-4">
                <p className="text-xs text-gray-500">All-in</p>
                <p className="mt-1 font-semibold text-emerald-700">{winner.isTotalAllIn ? "Confirmed" : "Not confirmed"}</p>
              </div>
              <div className="rounded-2xl bg-[#f8f7f3] p-4">
                <p className="text-xs text-gray-500">Risk</p>
                <p className="mt-1 font-semibold">{winner.riskLevel} · {winner.riskScore}/100</p>
              </div>
              <div className="rounded-2xl bg-[#f8f7f3] p-4">
                <p className="text-xs text-gray-500">Entry policy</p>
                <p className="mt-1 font-semibold">Non-destructive first</p>
              </div>
              <div className="rounded-2xl bg-[#f8f7f3] p-4">
                <p className="text-xs text-gray-500">Proof</p>
                <p className="mt-1 font-semibold">Required</p>
              </div>
            </div>

            <div className="rounded-3xl bg-black p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Negotiation persisted</p>
                  <h3 className="mt-1 font-serif text-2xl">${negotiation.beforePrice} → ${negotiation.afterPrice} all-in</h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">No extra keys claimed</span>
              </div>
              <ul className="mt-5 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                {negotiation.changedTerms.map((term) => (
                  <li key={term} className="flex gap-2"><span className="text-emerald-300">✓</span>{term}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-xl font-semibold">Transcript evidence</h3>
                {latestSignal && <VoiceTrustBadge level={latestSignal.trustLevel} />}
              </div>
              <div className="mt-4 space-y-4 rounded-3xl border border-black/5 bg-[#fbfaf7] p-5 text-sm leading-relaxed">
                <p><strong>Initial quote:</strong> &ldquo;{winner.transcriptEvidence[0]}&rdquo;</p>
                <p><strong>Stored leverage:</strong> &ldquo;{negotiation.leverage.evidence[0]}&rdquo;</p>
                <p className="rounded-xl bg-emerald-100/70 p-3"><strong>Final confirmation:</strong> &ldquo;{negotiation.transcriptEvidence[0]}&rdquo;</p>
                <p className="text-xs text-gray-500">
                  VoiceTrust treats the moderate pause and filler as uncertainty only. The exact confirmation and structured terms are the evidence.
                </p>
              </div>
            </div>

            <QuoteApproval
              missionId={mission.id}
              vendorName={winner.vendorName}
              total={negotiation.afterPrice}
              initiallyApproved={mission.approval?.status === "approved"}
            />
          </section>

          <aside className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Ranked alternatives</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">Why this ranking</h2>
            </div>

            {fallbackQuote && (
              <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Leverage and fallback</p>
                    <h3 className="mt-1 font-bold">{fallbackQuote.vendorName}</h3>
                  </div>
                  <p className="font-serif text-2xl font-bold">{money(fallbackQuote.totalEstimate)}</p>
                </div>
                <p className="mt-3 text-sm text-gray-600">{fallbackQuote.etaMinutes} min ETA · {fallbackQuote.drillingPolicy}</p>
                <blockquote className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
                  &ldquo;{fallbackQuote.transcriptEvidence[0]}&rdquo;
                </blockquote>
              </article>
            )}

            {highRiskQuote && (
              <article className="rounded-3xl border-2 border-pink-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600">High-risk evidence</p>
                    <h3 className="mt-1 font-bold">{highRiskQuote.vendorName}</h3>
                  </div>
                  <p className="font-serif text-xl font-bold text-gray-400">Starts at ${highRiskQuote.dispatchFee}</p>
                </div>
                <p className="mt-3 text-sm text-gray-600">No firm total · risk {highRiskQuote.riskScore}/100</p>
                <blockquote className="mt-3 rounded-xl bg-pink-50 p-3 text-xs text-pink-900">
                  &ldquo;{highRiskQuote.transcriptEvidence[0]}&rdquo;
                </blockquote>
              </article>
            )}

            <div className="rounded-3xl border border-black/5 bg-white p-5">
              <h3 className="font-semibold">Stored ranking</h3>
              <ol className="mt-3 space-y-3">
                {recommendation.ranked.map((quote, index) => (
                  <li key={quote.id} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{quote.vendorName}</span>
                    <span className="font-semibold">{money(quote.totalEstimate)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl bg-[#e8faf3] p-5 text-sm leading-relaxed text-emerald-950">
              <p className="font-bold">Safety reminder</p>
              <p className="mt-2">Approval is not dispatch. Show proof at the door and reject any drilling, changed scope, or price change that was not explained and approved first.</p>
            </div>

            {alternatives.length === 0 && (
              <p className="text-sm text-gray-500">No other eligible quotes were stored.</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
