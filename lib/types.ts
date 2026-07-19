// Shared types for Keywize - single source of truth for all lib, API, and UI code

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

export type MissionMode = "reliable_demo" | "live_sandbox";

export type MissionStatus =
  | "intake_complete"
  | "calling_vendors"
  | "quotes_collected"
  | "quotes_ready"
  | "awaiting_vendor_selection"
  | "negotiating"
  | "terms_secured"
  | "awaiting_approval"
  | "approved"
  | "failed"
  | "session_2_complete";

export type VendorId = "vendor_a" | "vendor_b" | "vendor_c";

export type CallRole = "caller" | "closer";

export type VendorCallStatus =
  | "queued"
  | "ringing"
  | "connected"
  | "quote_saved"
  | "complete"
  | "failed"
  | "replay_fallback";

export type LiveSandboxToolWebhookStatus =
  | "not_called"
  | "received"
  | "rejected"
  | "quote_saved";

export type LiveSandboxDestinationKind =
  | "human_tester"
  | "twilio_vendor_persona"
  | "unspecified";

export type LiveSandboxTelephonyDiagnostics = {
  outboundInitiator: "elevenlabs";
  telephonyIntegration: "twilio";
  keywizeUsesTwilioRestApi: false;
  destinationKind: LiveSandboxDestinationKind;
  destinationPersonaReady: boolean | null;
  setupIssue?:
    | "destination_kind_not_declared"
    | "twilio_vendor_persona_not_confirmed";
};

export type LiveSandboxCallDiagnostics = {
  callStartedAt?: string;
  phoneAnsweredAt?: string;
  answerEvidence?: "elevenlabs_conversation_activity" | "correlated_tool_webhook";
  phoneSessionEndedAt?: string;
  toolWebhook: LiveSandboxToolWebhookStatus;
  toolRejectionReason?: string;
  timedOut: boolean;
  fallbackReplayUsed: boolean;
};

export type LiveSandboxFallbackCode =
  | "missing_configuration"
  | "configuration_unresolved"
  | "destination_persona_not_ready"
  | "provider_auth_rejected"
  | "provider_billing_rejected"
  | "provider_destination_rejected"
  | "provider_phone_number_id_rejected"
  | "provider_agent_id_rejected"
  | "provider_permission_rejected"
  | "provider_request_rejected"
  | "provider_start_unconfirmed"
  | "provider_unreachable"
  | "quote_webhook_rejected"
  | "quote_not_saved"
  | "quote_webhook_missing"
  | "answer_or_webhook_not_confirmed"
  | "quote_wait_expired"
  | "closer_unavailable"
  | "negotiation_timeout";

export type LiveSandboxFallbackStage =
  | "configuration"
  | "pre_dial"
  | "provider_request"
  | "quote_webhook"
  | "negotiation";

export type LiveSandboxFallbackDiagnostic = {
  code: LiveSandboxFallbackCode;
  stage: LiveSandboxFallbackStage;
  title: string;
  detail: string;
  action: string;
};

export type MissionEventCategory =
  | "status"
  | "call"
  | "tool"
  | "negotiation"
  | "fallback"
  | "approval";

export type MissionEventSource = "reliable_demo" | "live_sandbox" | "fallback";

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
  vendorId?: VendorId;
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
  id: string;
  sequence: number;
  timestamp: string;
  event: string;
  details?: string;
  vendorId?: VendorId;
  category: MissionEventCategory;
  source: MissionEventSource;
  toolName?:
    | "save_quote"
    | "update_negotiation"
    | "quote_saved"
    | "uncertainty_analyzed"
    | "risk_recalculated"
    | "negotiation_persisted";
};

export type VendorCall = {
  id: string;
  vendorId: VendorId;
  vendorName: string;
  role: CallRole;
  status: VendorCallStatus;
  mode: MissionMode;
  quoteId?: string;
  startedAt?: string;
  completedAt?: string;
  fallbackUsed: boolean;
  liveDiagnostics?: LiveSandboxCallDiagnostics;
};

export type LeverageSnapshot = {
  sourceQuoteId: string;
  sourceVendorId: VendorId;
  vendorName: string;
  total: number;
  isTotalAllIn: true;
  etaMinutes: number | null;
  materialTerms: string[];
  evidence: string[];
  capturedAt: string;
};

export type NegotiationResult = {
  targetQuoteId: string;
  targetVendorId: VendorId;
  status: "in_progress" | "secured" | "no_improvement" | "failed";
  beforePrice: number;
  afterPrice?: number;
  isTotalAllIn?: boolean;
  changedTerms: string[];
  leverage: LeverageSnapshot;
  transcriptEvidence: string[];
  startedAt: string;
  completedAt?: string;
  fallbackUsed: boolean;
};

export type MissionApproval = {
  status: "pending" | "approved";
  quoteId: string;
  total: number;
  dispatchAuthorized: false;
  approvedAt?: string;
};

export type MissionOrchestration = {
  replayActive: boolean;
  quoteCursor: number;
  negotiationCursor: number;
  nextActionAt: string;
  liveFallbackAt?: string;
};

export type RankingResult = {
  ranked: Quote[];
  recommended: Quote | null;
  reasons: string[];
  disqualified: Quote[];
};

export type MockOfferSelectionStatus = "pending" | "ready";

export type MockOfferSelection = {
  offerId: string;
  name: string;
  phone: string;
  address: string;
  price: number;
  status: MockOfferSelectionStatus;
  selectedAt: string;
  readyAt: string;
};

export type Mission = {
  id: string;
  mode: MissionMode;
  jobSpec: JobSpec;
  quotes: Quote[];
  status: MissionStatus;
  callLog: CallLogEntry[];
  vendorCalls: VendorCall[];
  recommendation: RankingResult | null;
  negotiation: NegotiationResult | null;
  approval: MissionApproval | null;
  orchestration: MissionOrchestration;
  liveSandboxTelephony?: LiveSandboxTelephonyDiagnostics;
  liveSandboxFallback?: LiveSandboxFallbackDiagnostic;
  fallbackReason?: string;
  selectedVendorId?: string;
  recordingUrl?: string;
  selectedMockOffer?: MockOfferSelection;
  createdAt: string;
  updatedAt: string;
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
  vendorId: VendorId;
  role: CallRole;
};
