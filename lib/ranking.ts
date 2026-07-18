import type { Quote, JobSpec, RankingResult, RiskLevel } from "./types";

const RISK_ORDER: Record<RiskLevel, number> = { Low: 0, Medium: 1, High: 2 };

/**
 * Rank quotes by (riskLevel, totalEstimate, etaMinutes) and return a
 * recommendation with plain-English reasons.
 *
 * Rules:
 * - Declined quotes are disqualified entirely.
 * - Prefer quotes at or under maxPrice when budgetFlexibility = "strict".
 * - If all quotes exceed maxPrice, recommend the lowest-risk anyway (with a note).
 */
export function rankQuotes(
  quotes: Quote[],
  jobSpec: Pick<JobSpec, "maxPrice" | "budgetFlexibility">
): RankingResult {
  const eligible = quotes.filter((q) => q.quoteConfidence !== "declined");
  const disqualified = quotes.filter((q) => q.quoteConfidence === "declined");

  if (eligible.length === 0) {
    return { ranked: [], recommended: null, reasons: ["No eligible quotes."], disqualified };
  }

  // Sort: lower risk first, then lower price, then faster ETA
  const sorted = [...eligible].sort((a, b) => {
    const riskDiff = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;

    const aPrice = a.totalEstimate ?? Infinity;
    const bPrice = b.totalEstimate ?? Infinity;
    if (aPrice !== bPrice) return aPrice - bPrice;

    const aEta = a.etaMinutes ?? Infinity;
    const bEta = b.etaMinutes ?? Infinity;
    return aEta - bEta;
  });

  // Prefer within-budget quotes for strict budgets
  let recommended: Quote | null = null;
  const strict = jobSpec.budgetFlexibility === "strict";

  if (strict) {
    const withinBudget = sorted.filter(
      (q) => q.totalEstimate !== null && q.totalEstimate <= jobSpec.maxPrice
    );
    recommended = withinBudget[0] ?? sorted[0];
  } else {
    recommended = sorted[0];
  }

  // ─── Build plain-English reasons ──────────────────────────────────────────
  const reasons: string[] = [];

  if (recommended) {
    reasons.push(`Recommended: ${recommended.vendorName}`);

    reasons.push(`Risk level: ${recommended.riskLevel}`);

    if (recommended.isTotalAllIn && recommended.totalEstimate !== null) {
      reasons.push(`All-in confirmed total: $${recommended.totalEstimate}`);
    } else if (recommended.totalEstimate !== null) {
      reasons.push(`Estimated total: $${recommended.totalEstimate} (not confirmed all-in)`);
    }

    if (recommended.totalEstimate !== null) {
      if (recommended.totalEstimate <= jobSpec.maxPrice) {
        reasons.push(`Within your max budget of $${jobSpec.maxPrice}`);
      } else {
        reasons.push(
          `Exceeds your max budget of $${jobSpec.maxPrice} by $${
            recommended.totalEstimate - jobSpec.maxPrice
          } — approval required`
        );
      }
    }

    if (recommended.etaMinutes !== null) {
      reasons.push(`ETA: ${recommended.etaMinutes} minutes`);
    }

    if (
      recommended.drillingPolicy.toLowerCase().includes("no drill") ||
      recommended.drillingPolicy.toLowerCase().includes("non-destructive")
    ) {
      reasons.push("No-drill first policy confirmed");
    }

    if (recommended.idRequired === true) {
      reasons.push("ID / proof of residence required — anti-scam verified");
    }

    if (recommended.priceOrTermsChanged) {
      reasons.push("Price or terms improved through negotiation");
    }

    if (recommended.voiceTrustScore >= 70) {
      reasons.push(`VoiceTrust score: ${recommended.voiceTrustScore} — high confidence`);
    } else if (recommended.voiceTrustScore >= 40) {
      reasons.push(`VoiceTrust score: ${recommended.voiceTrustScore} — medium confidence`);
    } else {
      reasons.push(`VoiceTrust score: ${recommended.voiceTrustScore} — low confidence, review transcript`);
    }
  }

  return { ranked: sorted, recommended, reasons, disqualified };
}
