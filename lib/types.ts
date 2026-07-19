// Shared types for Keywize — single source of truth for all lib, API, and UI code

export type CaseType =
  | "room_key_lost"
  | "key_inside_locked_out"
  | "main_apartment_key_lost"
  | "key_stolen"
  | "broken_key_inside_lock";

export type Urgency = "locked_out_now" | "today" | "scheduled";

export type PropertyType = "apartment" | "dorm" | "house";

export type DoorType = "room" | "main_entry" | "building_entry" | "storage";

export type LockType = "deadbolt" | "knob" | "lever" | "smart_lock" | "unknown";

export type BudgetFlexibility =
  | "strict"
  | "flexible_for_speed"
  | "flexible_for_rekey";

export type QuoteConfidence =
  | "firm_before_arrival"
  | "starts_at"
  | "callback"
  | "declined";

export type RiskLevel = "Low" | "Medium" | "High";

export type TrustLevel = "High" | "Medium" | "Low";

export type QuestionType =
  | "price"
  | "hidden_fees"
  | "drilling"
  | "eta"
  | "final_confirmation";

export type MissionStatus =
  | "intake_complete"
  | "calling_vendors"
  | "quotes_collected"
  | "awaiting_vendor_selection"
  | "negotiating"
  | "session_2_complete";

// ─── Job Spec ─────────────────────────────────────────────────────────────────

export type JobSpec = {
  id: string;
  caseType: CaseType;
  urgency: Urgency;
  propertyType: PropertyType;
  doorType: DoorType;
  lockType: LockType;
  doorOpen: boolean;
  keyStolen: boolean;
  brokenKeyVisible: boolean;
  needRekey: boolean;
  newKeysNeeded: number;
  idealPrice: number;
  maxPrice: number;
  budgetFlexibility: BudgetFlexibility;
  approvalRequiredAboveBudget: boolean;
  authorizationConfirmed: boolean;
  locationCity: string;
  locationZip: string;
  createdAt: string;
};

// ─── VoiceTrust ───────────────────────────────────────────────────────────────

export type VoiceTrustSignal = {
  id: string;
  quoteId: string;
  questionType: QuestionType;
  vendorText: string;
  pauseMs: number;
  fillerWords: string[];
  evasivePhrases: string[];
  speechRateChangePct?: number;
  pitchVariance?: number;
  volumeVariance?: number;
  confidenceScore: number;
  trustLevel: TrustLevel;
  signals: string[];
  recommendedPush: string;
};

// ─── Quote ────────────────────────────────────────────────────────────────────

export type Quote = {
  id: string;
  missionId: string;
  vendorName: string;
  phone: string;
  etaMinutes: number | null;
  dispatchFee: number | null;
  laborFee: number | null;
  partsFee: number | null;
  afterHoursFee: number | null;
  taxesAndOther: number | null;
  totalEstimate: number | null;
  isTotalAllIn: boolean;
  drillingPolicy: string;
  idRequired: boolean | null;
  oldKeyDisabled: boolean | null;
  keysIncluded: number | null;
  warranty: string | null;
  quoteConfidence: QuoteConfidence;
  redFlags: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  transcriptEvidence: string[];
  transcript: string;
  priceOrTermsChanged: boolean;
  voiceTrustSignals: VoiceTrustSignal[];
  voiceTrustScore: number;
};

// ─── Mission ──────────────────────────────────────────────────────────────────

export type CallLogEntry = {
  timestamp: string;
  event: string;
  details?: string;
};

export type RankingResult = {
  ranked: Quote[];
  recommended: Quote | null;
  reasons: string[];
  disqualified: Quote[];
};

export type Mission = {
  id: string;
  jobSpec: JobSpec;
  quotes: Quote[];
  status: MissionStatus;
  callLog: CallLogEntry[];
  recommendation: RankingResult | null;
  /** Set after user picks a vendor from the ranked list (between session 1 and 2). */
  selectedVendorId?: string;
  /** Set after session 2 succeeds and the user uploads the call recording. */
  recordingUrl?: string;
};

// ─── Case Definition ──────────────────────────────────────────────────────────

export type CaseDefinition = {
  caseType: CaseType;
  label: string;
  description: string;
  quoteLineItems: string[];
  redFlags: string[];
  negotiationGoals: string[];
  vendorQuestions: string[];
  extraRequiredFields: string[];
};

// ─── API payloads ─────────────────────────────────────────────────────────────

export type IntakePayload = Omit<JobSpec, "id" | "createdAt">;

export type QuotePayload = Omit<
  Quote,
  "id" | "missionId" | "riskScore" | "riskLevel" | "voiceTrustSignals" | "voiceTrustScore"
>;

export type VoiceTrustInput = {
  quoteId: string;
  questionType: QuestionType;
  vendorText: string;
  pauseMs: number;
  fillerWords?: string[];
  evasivePhrases?: string[];
  speechRateChangePct?: number;
  pitchVariance?: number;
  volumeVariance?: number;
};

export type ElevenLabsCallPayload = {
  missionId: string;
  toNumber: string;
};
