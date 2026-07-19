"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfidenceWaveform } from "@/components/ConfidenceWaveform";
import { VendorCallProgress } from "@/components/VendorCallProgress";
import { VoiceTrustBadge } from "@/components/VoiceTrustBadge";
import type { Mission, Quote, VendorCallStatus } from "@/lib/types";

const STATUS_LABELS: Record<VendorCallStatus, string> = {
  queued: "Queued",
  ringing: "Ringing",
  connected: "Connected",
  quote_saved: "Quote saved",
  complete: "Complete",
  failed: "Failed",
  replay_fallback: "Replay fallback",
};

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Vendor A is the deliberately risky bait-and-switch persona. While a call to
// it is still in flight we show a generic "searching" label and give it no
// clickable quote window — its real identity and risk flag still surface on
// the final report once quotes are in.
const HIDDEN_VENDOR_ID = "vendor_a";
const SEARCHING_LABEL = "Searching locksmiths nearby";

function displayVendorName(vendorId: string, vendorName: string): string {
  return vendorId === HIDDEN_VENDOR_ID ? SEARCHING_LABEL : vendorName;
}

function modeLabel(mission: Mission): string {
  if (mission.mode === "reliable_demo") return "Reliable Demo - simulated vendors";
  if (mission.fallbackReason) return "Live Sandbox - reliable replay fallback";
  return "Live Sandbox - controlled calls";
}

function QuoteCard({
  quote,
  isFastest,
  titleOverride,
  href,
  linkLabel = "View full comparison →",
}: {
  quote: Quote;
  isFastest: boolean;
  titleOverride?: string;
  href?: string;
  linkLabel?: string;
}) {
  const signal = quote.voiceTrustSignals[0];
  const isHighRisk = quote.riskLevel === "High";
  const price = quote.totalEstimate === null
    ? `Starts at $${quote.dispatchFee ?? "?"}`
    : `$${quote.totalEstimate}`;

  const className = `relative block overflow-hidden rounded-[28px] border bg-white p-6 shadow-sm transition-all ${
    isHighRisk
      ? "border-2 border-pink-200"
      : isFastest
        ? "border-2 border-black shadow-lg shadow-black/5"
        : "border-black/5"
  } ${href ? "cursor-pointer hover:shadow-md hover:border-[#30a985]/30" : ""}`;

  const content = (
    <>
      {isFastest && (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          Fastest ETA
        </span>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{titleOverride ?? quote.vendorName}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                quote.riskLevel === "High"
                  ? "bg-pink-100 text-pink-700"
                  : quote.riskLevel === "Low"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {quote.riskLevel} risk
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {quote.isTotalAllIn ? "All-in quote confirmed" : "No firm all-in total"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl font-bold">{price}</p>
          <p className="text-sm text-gray-500">
            {quote.etaMinutes === null ? "ETA unknown" : `${quote.etaMinutes} min ETA`}
          </p>
        </div>
      </div>

      {signal && (
        <div
          className={`mt-5 rounded-2xl border p-4 ${
            signal.trustLevel === "Low"
              ? "border-pink-100 bg-pink-50"
              : "border-black/5 bg-[#f8f7f3]"
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <VoiceTrustBadge level={signal.trustLevel} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Uncertainty signal, not lie detection
            </span>
          </div>
          <p className="text-sm italic text-gray-700">&ldquo;{signal.vendorText}&rdquo;</p>
          <div className="mt-3">
            <ConfidenceWaveform score={quote.voiceTrustScore} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {quote.drillingPolicy}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {quote.idRequired === true ? "Proof required" : quote.idRequired === false ? "No proof required" : "Proof policy unknown"}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          Risk {quote.riskScore}/100
        </span>
      </div>

      {quote.transcriptEvidence[0] && (
        <blockquote className="mt-4 border-l-2 border-black/15 pl-3 text-xs leading-relaxed text-gray-600">
          &ldquo;{quote.transcriptEvidence[0]}&rdquo;
        </blockquote>
      )}

      {href && (
        <p className="mt-4 text-xs font-semibold text-[#25866b]">{linkLabel}</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/missions/${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Mission unavailable");
        const nextMission = (await response.json()) as Mission;
        if (!active) return;
        setMission(nextMission);
        setLoadError("");
        if (nextMission.status !== "negotiating") setIsNegotiating(false);
      } catch {
        if (active) setLoadError("Mission updates paused. Retrying automatically...");
      } finally {
        if (active) timer = setTimeout(poll, 700);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const quoteByVendor = useMemo(
    () => new Map(mission?.quotes.map((quote) => [quote.vendorId, quote]) ?? []),
    [mission]
  );
  const fastestEta = mission?.quotes.reduce<number | null>(
    (fastest, quote) =>
      quote.etaMinutes !== null && (fastest === null || quote.etaMinutes < fastest)
        ? quote.etaMinutes
        : fastest,
    null
  );
  const quoteCalls = mission?.vendorCalls.filter((call) => call.role === "caller") ?? [];
  const visibleQuoteCalls = quoteCalls.filter((call) => call.vendorId !== HIDDEN_VENDOR_ID);
  const callProgressCalls = quoteCalls.map((call) => ({
    ...call,
    vendorName: displayVendorName(call.vendorId, call.vendorName),
  }));
  const reportReady = Boolean(
    mission && ["terms_secured", "awaiting_approval", "approved"].includes(mission.status)
  );
  const quotesReady = Boolean(
    mission && ["quotes_ready", "awaiting_vendor_selection"].includes(mission.status)
  );

  const negotiateFastest = async () => {
    if (!mission) return;
    setIsNegotiating(true);
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
      setIsNegotiating(false);
      setLoadError(error instanceof Error ? error.message : "Negotiation could not start");
    }
  };

  if (!mission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6 text-center">
        <div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="font-medium">Loading the stored mission state...</p>
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24 text-[#111111]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between border-b border-black/5 px-6 py-5">
        <button className="flex items-center gap-2" onClick={() => router.push("/")}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm text-white">⌁</span>
          <span className="font-bold tracking-tight">Keywize</span>
        </button>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-400">Mission {id.slice(0, 8)}</p>
          <p className="text-sm font-semibold">{humanize(mission.status)}</p>
        </div>
      </nav>

      <header className="mx-auto max-w-6xl px-6 pb-8 pt-10">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              mission.mode === "live_sandbox"
                ? "border-pink-200 bg-pink-50 text-pink-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {modeLabel(mission)}
          </span>
          <span className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white">
            {humanize(mission.status)}
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              Evidence-backed vendor mission
            </p>
            <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Three clear quotes. One safe decision under pressure.
            </h1>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-500">Hard maximum</p>
            <p className="font-serif text-3xl font-bold">${mission.jobSpec.maxPrice}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          {mission.fallbackReason && (
            <div className="rounded-3xl border border-pink-200 bg-pink-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-pink-700">Visible fallback</p>
              <p className="mt-2 text-sm leading-relaxed text-pink-900">{mission.fallbackReason}</p>
              <p className="mt-2 text-xs text-pink-700">No arbitrary business or phone number was dialed.</p>
            </div>
          )}

          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold">Job spec</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Issue</dt><dd className="text-right font-semibold">{humanize(mission.jobSpec.caseType)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Door</dt><dd className="text-right font-semibold">{humanize(mission.jobSpec.doorType)} · {humanize(mission.jobSpec.lockType)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Area</dt><dd className="text-right font-semibold">{mission.jobSpec.locationCity}, {mission.jobSpec.locationZip}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Urgency</dt><dd className="text-right font-semibold">{humanize(mission.jobSpec.urgency)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-black/5 pt-3"><dt className="text-gray-500">Ideal / maximum</dt><dd className="font-semibold">${mission.jobSpec.idealPrice} / ${mission.jobSpec.maxPrice}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Authorization</dt><dd className="font-semibold text-emerald-700">Confirmed</dd></div>
            </dl>
            <p className="mt-4 rounded-xl bg-[#f8f7f3] p-3 text-xs leading-relaxed text-gray-600">
              Proof of residence or authorization must be shown before entry. No dispatch is authorized by this mission.
            </p>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold">Call state</h2>
            <div className="mt-4">
              <VendorCallProgress calls={callProgressCalls} />
            </div>
            <div className="mt-5 space-y-4">
              {mission.vendorCalls.map((call) => (
                <div key={call.id} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      call.status === "complete"
                        ? "bg-emerald-500"
                        : call.status === "failed" || call.status === "replay_fallback"
                          ? "bg-pink-400"
                          : call.status === "queued"
                            ? "bg-gray-200"
                            : "animate-pulse bg-amber-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{call.role === "closer" ? "Closer · " : ""}{displayVendorName(call.vendorId, call.vendorName)}</p>
                    <p className="text-xs text-gray-500">
                      {STATUS_LABELS[call.status]}{call.fallbackUsed ? " · simulated fallback" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {loadError && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

          {(quotesReady || mission.status === "negotiating" || reportReady) && (
            <div className="space-y-3">
              <Link
                href={`/mission/${mission.id}/prices`}
                className="block w-full rounded-full border border-black bg-white px-5 py-4 text-center font-semibold"
              >
                Compare stored quotes →
              </Link>
              <button
                onClick={negotiateFastest}
                disabled={!quotesReady || isNegotiating}
                className="w-full rounded-full bg-black px-5 py-4 font-semibold text-white shadow-lg shadow-black/10 transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {mission.status === "negotiating" || isNegotiating
                  ? "Negotiating fastest option..."
                  : reportReady
                    ? "Terms secured"
                    : "Negotiate fastest option"}
              </button>
              {reportReady && (
                <button
                  onClick={() => router.push(`/report/${mission.id}`)}
                  className="w-full rounded-full border border-black bg-white px-5 py-4 font-semibold"
                >
                  View stored final report →
                </button>
              )}
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Structured results</p>
                <h2 className="font-serif text-2xl font-semibold">Vendor quotes</h2>
              </div>
              <div className="text-right">
                <span className="block text-sm font-semibold text-gray-500">
                  {mission.quotes.filter((quote) => quote.vendorId !== HIDDEN_VENDOR_ID).length}/2 stored
                </span>
                {mission.quotes.length > 0 && (
                  <Link href={`/mission/${mission.id}/prices`} className="mt-1 block text-xs font-bold text-[#25866b] hover:text-black">
                    Full comparison →
                  </Link>
                )}
              </div>
            </div>
            <div className="space-y-5">
              {visibleQuoteCalls.map((call) => {
                const quote = quoteByVendor.get(call.vendorId);
                if (!quote) {
                  return (
                    <div key={call.id} className="rounded-[28px] border border-dashed border-black/10 bg-white/60 p-6">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-gray-300" />
                        <div>
                          <p className="font-semibold">{call.vendorName}</p>
                          <p className="text-sm text-gray-500">Waiting for a persisted quote...</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                const href =
                  call.vendorId === "vendor_b"
                    ? `/mission/${mission.id}/prices`
                    : call.vendorId === "vendor_c"
                      ? `/mission/${mission.id}/negotiate`
                      : undefined;
                return (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    isFastest={quote.etaMinutes === fastestEta}
                    titleOverride={call.vendorId === "vendor_b" ? "Basic price" : undefined}
                    href={href}
                    linkLabel={call.vendorId === "vendor_c" ? "View negotiated offers →" : undefined}
                  />
                );
              })}
            </div>
          </section>

          {mission.negotiation && (
            <section className="rounded-[28px] border border-purple-100 bg-purple-50 p-6">
              <div className="mb-4 flex justify-end">
                <Link href={`/mission/${mission.id}/negotiate`} className="text-xs font-bold text-purple-700 hover:text-black">
                  Open negotiation window →
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Stored leverage</p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold">Vendor B → Vendor C</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-purple-900">
                    {mission.negotiation.leverage.vendorName} confirmed ${mission.negotiation.leverage.total} all-in with no-drill-first. That stored quote is the only competitor claim used.
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-5 py-3 text-right shadow-sm">
                  <p className="text-xs text-gray-500">Fast option</p>
                  <p className="font-serif text-2xl font-bold">
                    <span className="text-gray-400 line-through">${mission.negotiation.beforePrice}</span>
                    <span className="ml-2 text-emerald-600">{mission.negotiation.afterPrice ? `$${mission.negotiation.afterPrice}` : "In progress"}</span>
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold">Ordered mission events</h2>
              <span className="text-xs text-gray-400">Persisted state</span>
            </div>
            <div className="mt-5 space-y-4">
              {mission.callLog.slice().reverse().map((event) => (
                <div key={event.id} className="flex gap-3 border-b border-black/5 pb-4 last:border-0 last:pb-0">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${event.category === "fallback" ? "bg-pink-400" : event.category === "tool" ? "bg-purple-400" : "bg-emerald-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{humanize(event.event)}</p>
                      {event.toolName && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                          {humanize(event.toolName)}
                        </span>
                      )}
                      {event.source === "fallback" && (
                        <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pink-700">Replay fallback</span>
                      )}
                    </div>
                    {event.details && <p className="mt-1 text-xs leading-relaxed text-gray-500">{event.details}</p>}
                  </div>
                  <time className="shrink-0 text-[10px] text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
