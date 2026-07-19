import type { LeverageSnapshot, Mission, Quote } from "./types";

function evidenceSupportsTotal(quote: Quote): boolean {
  if (quote.totalEstimate === null) return false;
  const amount = String(quote.totalEstimate);
  return quote.transcriptEvidence.some((line) =>
    line.replaceAll(",", "").includes(`$${amount}`)
  );
}

function isSafeLeverageQuote(quote: Quote): boolean {
  return Boolean(
    quote.vendorId &&
      quote.totalEstimate !== null &&
      quote.isTotalAllIn &&
      quote.quoteConfidence === "firm_before_arrival" &&
      quote.riskLevel !== "High" &&
      evidenceSupportsTotal(quote)
  );
}

export function selectStoredLeverage(
  mission: Mission,
  targetQuoteId: string
): LeverageSnapshot | null {
  const candidates = mission.quotes
    .filter((quote) => quote.id !== targetQuoteId && isSafeLeverageQuote(quote))
    .sort((a, b) => {
      const priceDifference = (a.totalEstimate ?? Infinity) - (b.totalEstimate ?? Infinity);
      if (priceDifference !== 0) return priceDifference;
      return (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity);
    });

  const source = candidates[0];
  if (!source?.vendorId || source.totalEstimate === null) return null;

  const materialTerms = ["Firm all-in total"];
  if (
    source.drillingPolicy.toLowerCase().includes("no-drill") ||
    source.drillingPolicy.toLowerCase().includes("non-destructive") ||
    source.drillingPolicy.toLowerCase().includes("without drilling")
  ) {
    materialTerms.push("No-drill first");
  }

  return {
    sourceQuoteId: source.id,
    sourceVendorId: source.vendorId,
    vendorName: source.vendorName,
    total: source.totalEstimate,
    isTotalAllIn: true,
    etaMinutes: source.etaMinutes,
    materialTerms,
    evidence: source.transcriptEvidence.filter((line) =>
      line.replaceAll(",", "").includes(`$${source.totalEstimate}`) ||
      line.toLowerCase().includes("drill")
    ),
    capturedAt: new Date().toISOString(),
  };
}

export function leverageStillMatchesMission(
  mission: Mission,
  leverage: LeverageSnapshot
): boolean {
  const quote = mission.quotes.find((candidate) => candidate.id === leverage.sourceQuoteId);
  return Boolean(
    quote &&
      isSafeLeverageQuote(quote) &&
      quote.vendorId === leverage.sourceVendorId &&
      quote.totalEstimate === leverage.total &&
      quote.isTotalAllIn === leverage.isTotalAllIn
  );
}
