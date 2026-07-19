export type CaseType =
  | "room_key_lost"
  | "key_inside_locked_out"
  | "main_apartment_key_lost"
  | "key_stolen"
  | "broken_key_inside_lock";

export type JobSpec = {
  id: string;
  caseType: CaseType;
  urgency: "locked_out_now" | "today" | "scheduled";
  propertyType: "apartment" | "dorm" | "house";
  doorType: "room" | "main_entry" | "building_entry" | "storage";
  lockType: "deadbolt" | "knob" | "lever" | "smart_lock" | "unknown";
  doorOpen: boolean;
  keyStolen: boolean;
  brokenKeyVisible: boolean;
  needRekey: boolean;
  newKeysNeeded: number;
  idealPrice: number;
  maxPrice: number;
  budgetFlexibility: "strict" | "flexible_for_speed" | "flexible_for_rekey";
  approvalRequiredAboveBudget: boolean;
  authorizationConfirmed: boolean;
  locationCity: string;
  locationZip: string;
  createdAt: string;
};

export type VoiceTrustSignal = {
  id: string;
  quoteId: string;
  questionType: "price" | "hidden_fees" | "drilling" | "eta" | "final_confirmation";
  vendorText: string;
  pauseMs: number;
  fillerWords: string[];
  evasivePhrases: string[];
  speechRateChangePct?: number;
  pitchVariance?: number;
  volumeVariance?: number;
  confidenceScore: number;
  trustLevel: "High" | "Medium" | "Low";
  signals: string[];
  recommendedPush: string;
};

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
  quoteConfidence: "firm_before_arrival" | "starts_at" | "callback" | "declined";
  redFlags: string[];
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  transcriptEvidence: string[];
  transcript: string;
  priceOrTermsChanged: boolean;
  voiceTrustSignals: VoiceTrustSignal[];
  voiceTrustScore: number;
};

export type MissionStatus = "intake" | "calling_vendors" | "negotiating" | "report_ready";

export type Mission = {
  id: string;
  jobSpec: JobSpec;
  quotes: Quote[];
  status: MissionStatus;
  callLog: string[];
  recommendationId: string | null;
};
