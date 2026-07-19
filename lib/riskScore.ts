import type { Quote, JobSpec, RiskLevel } from "./types";

/**
 * Calculate the bait-and-switch risk score for a vendor quote.
 * Returns [score 0-100, RiskLevel].
 *
 * Rules from the PRD:
 *  starts_at without total     +35
 *  refuses itemized pricing     +25
 *  dispatch fee not confirmed   +20
 *  drilling before diagnosis    +25
 *  no invoice/company name      +20
 *  no ID required               +15
 *  no ETA                       +10
 *  low VoiceTrust score (<50)   +20
 *
 * Case-specific additions (ported from backend):
 *  key_stolen + old key not disabled  +30
 *  key_inside_locked_out + drilling   +25
 *  main_apartment_key_lost + no keys  +10
 */
export function calculateRiskScore(
  quote: Quote,
  jobSpec?: Pick<JobSpec, "caseType" | "newKeysNeeded">
): [number, RiskLevel] {
  let score = 0;

  // starts_at pricing without a real total
  if (quote.quoteConfidence === "starts_at") score += 35;

  // refuses itemized — proxy: no dispatchFee AND no laborFee provided
  if (quote.dispatchFee === null && quote.laborFee === null) score += 25;

  // dispatch fee not confirmed — null means not answered
  if (quote.dispatchFee === null) score += 20;

  // drilling mentioned before diagnosis
  const normalizedDrillingPolicy = quote.drillingPolicy
    .toLowerCase()
    .replaceAll("-", " ")
    .replaceAll("_", " ");
  const drillingFirst =
    normalizedDrillingPolicy.includes("drill") &&
    !normalizedDrillingPolicy.includes("no drill") &&
    !normalizedDrillingPolicy.includes("non destructive");
  if (drillingFirst) score += 25;

  // no company/vendor name on invoice (proxy: vendor name empty or generic)
  if (!quote.vendorName || quote.vendorName.trim() === "") score += 20;

  // does not require proof of residence / ID
  if (quote.idRequired === false || quote.idRequired === null) score += 15;

  // cannot provide ETA
  if (quote.etaMinutes === null) score += 10;

  // low VoiceTrust confidence
  if (quote.voiceTrustScore < 50) score += 20;

  // ─── Case-specific rules ──────────────────────────────────────────────────
  if (jobSpec) {
    // Stolen key: critical if old key is not confirmed disabled
    if (
      jobSpec.caseType === "key_stolen" &&
      quote.oldKeyDisabled !== true
    ) {
      score += 30;
    }

    // Locked out: drilling-first policy is an extra red flag
    if (
      jobSpec.caseType === "key_inside_locked_out" &&
      drillingFirst
    ) {
      score += 25;
    }

    // Main apt key lost: no extra keys included is a risk signal
    if (
      jobSpec.caseType === "main_apartment_key_lost" &&
      (quote.keysIncluded === null || quote.keysIncluded < 1)
    ) {
      score += 10;
    }
  }

  const capped = Math.min(score, 100);

  let level: RiskLevel;
  if (capped < 25) level = "Low";
  else if (capped < 60) level = "Medium";
  else level = "High";

  return [capped, level];
}
