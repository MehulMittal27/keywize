import type { VoiceTrustInput, VoiceTrustSignal, TrustLevel } from "./types";
import { v4 as uuid } from "uuid";

/**
 * Analyze vendor vocal response for hesitation and evasion signals.
 *
 * Scoring starts at 100 and deductions are applied:
 *   Pause > 1500ms on price/hidden_fees   -25
 *   Pause > 800ms on price/hidden_fees    -10
 *   Each filler word (uh/um/well/maybe)   -8  (max -24)
 *   Each evasive phrase                   -12 (max -36)
 *   "starts at" language                  -15
 *   "technician decides/will confirm"     -15
 *   Speech rate change > 20%              -10
 *   Pitch variance > 0.3                  -5
 *   Volume variance > 0.3                 -5
 *
 * Score is clamped to [0, 100].
 * High ≥ 70, Medium ≥ 40, Low < 40
 */

const FILLER_WORDS = ["uh", "um", "well", "maybe", "hmm", "er"];

const EVASIVE_PHRASES = [
  "starts at",
  "technician will confirm",
  "depends on",
  "plus labor",
  "plus parts",
  "could be more",
  "we'll see",
  "approximately",
  "technician decides",
  "technician will assess",
];

export function analyzeVoiceTrust(input: VoiceTrustInput): VoiceTrustSignal {
  let score = 100;
  const signals: string[] = [];
  const detectedFillers: string[] = [];
  const detectedEvasive: string[] = [];

  const text = input.vendorText.toLowerCase();
  const moneyQuestion =
    input.questionType === "price" || input.questionType === "hidden_fees";

  // ─── Pause analysis ────────────────────────────────────────────────────────
  if (moneyQuestion) {
    if (input.pauseMs > 1500) {
      score -= 25;
      signals.push(`Long pause (${input.pauseMs}ms) before answering price question`);
    } else if (input.pauseMs > 800) {
      score -= 10;
      signals.push(`Noticeable pause (${input.pauseMs}ms) before answering price question`);
    }
  }

  // ─── Filler words ──────────────────────────────────────────────────────────
  let fillerDeduction = 0;
  for (const filler of FILLER_WORDS) {
    // match whole word only
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      detectedFillers.push(filler);
      fillerDeduction = Math.min(fillerDeduction + 8, 24);
      signals.push(`Filler word "${filler}" detected`);
    }
  }
  score -= fillerDeduction;

  // ─── Evasive phrases ───────────────────────────────────────────────────────
  let evasiveDeduction = 0;
  for (const phrase of EVASIVE_PHRASES) {
    if (text.includes(phrase)) {
      detectedEvasive.push(phrase);
      evasiveDeduction = Math.min(evasiveDeduction + 12, 36);
      signals.push(`Evasive phrase detected: "${phrase}"`);
    }
  }
  score -= evasiveDeduction;

  // ─── starts_at pricing ─────────────────────────────────────────────────────
  if (text.includes("starts at") || text.includes("starting at")) {
    if (!detectedEvasive.includes("starts at")) {
      score -= 15;
      signals.push("Vendor used 'starts at' pricing language");
    }
  }

  // ─── technician decides ────────────────────────────────────────────────────
  if (
    text.includes("technician will confirm") ||
    text.includes("technician decides") ||
    text.includes("technician will assess")
  ) {
    if (
      !detectedEvasive.includes("technician will confirm") &&
      !detectedEvasive.includes("technician decides") &&
      !detectedEvasive.includes("technician will assess")
    ) {
      score -= 15;
      signals.push("Technician-decides language — price deferred to arrival");
    }
  }

  // ─── Audio signal deductions (optional fields) ─────────────────────────────
  if (
    input.speechRateChangePct !== undefined &&
    Math.abs(input.speechRateChangePct) > 20
  ) {
    score -= 10;
    signals.push(
      `Speech rate changed by ${input.speechRateChangePct.toFixed(0)}% — possible stress`
    );
  }

  if (input.pitchVariance !== undefined && input.pitchVariance > 0.3) {
    score -= 5;
    signals.push("Elevated pitch variance detected");
  }

  if (input.volumeVariance !== undefined && input.volumeVariance > 0.3) {
    score -= 5;
    signals.push("Elevated volume variance detected");
  }

  // ─── Clamp and classify ────────────────────────────────────────────────────
  const finalScore = Math.max(0, Math.min(100, score));

  let trustLevel: TrustLevel;
  if (finalScore >= 70) trustLevel = "High";
  else if (finalScore >= 40) trustLevel = "Medium";
  else trustLevel = "Low";

  // ─── Recommended push ──────────────────────────────────────────────────────
  let recommendedPush = "";
  if (trustLevel === "Low") {
    if (input.questionType === "hidden_fees") {
      recommendedPush =
        "You paused there, so I want to make sure we are not missing anything. Is there any dispatch, drilling, after-hours, or parts fee not included in the total?";
    } else if (input.questionType === "price") {
      recommendedPush =
        "I need a firm all-in number before we proceed — including every fee that will appear on the invoice.";
    } else if (input.questionType === "drilling") {
      recommendedPush =
        "Can you confirm in writing that you will attempt non-destructive entry before any drilling?";
    } else {
      recommendedPush =
        "I need a clear, direct answer before we can move forward.";
    }
  } else if (trustLevel === "Medium") {
    recommendedPush =
      "Let's confirm that total one more time — is that truly all-in with no additional fees on arrival?";
  } else {
    recommendedPush = "Response looks clear and direct. No further push needed.";
  }

  return {
    id: uuid(),
    quoteId: input.quoteId,
    questionType: input.questionType,
    vendorText: input.vendorText,
    pauseMs: input.pauseMs,
    fillerWords: detectedFillers,
    evasivePhrases: detectedEvasive,
    speechRateChangePct: input.speechRateChangePct,
    pitchVariance: input.pitchVariance,
    volumeVariance: input.volumeVariance,
    confidenceScore: finalScore,
    trustLevel,
    signals,
    recommendedPush,
  };
}
