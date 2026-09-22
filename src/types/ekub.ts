// ============================================================================
// Core Equb domain types (SRS §4). Field names are camelCase on the client;
// the service layer maps to/from the backend's shape once the real API lands.
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  success: boolean;
}

export interface PaginatedMetaResponse<T> {
  meta: { page: number; per_page: number; total: number; total_pages: number };
  data: T[];
}

export type Cadence = "daily" | "weekly" | "monthly";

// ---- Application / Member --------------------------------------------------
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected";

export type MemberStatus =
  | "active"
  | "at_risk"
  | "suspended"
  | "terminated"
  | "completed";

export interface EligibilityDeclarations {
  shariaAccept: boolean;
  income: boolean;
  capacity: boolean;
  commitment: boolean;
  mutualBenefit: boolean;
}

export interface KycDoc {
  id: string;
  label: string;
  url: string;
  kind: "fayda" | "selfie" | "license" | "other";
}

export interface Application {
  id: string;
  fullName: string;
  displayHandle: string;
  gender: "male" | "female";
  age: number;
  faydaId: string;
  phone: string;
  occupation: string;
  estimatedMonthlyIncome: number;
  tierId: string;
  status: ApplicationStatus;
  submittedAt: string;
  // FR-1.6 peer vote (read-only here; voting happens in the customer app)
  peerVotesFor: number;
  peerVotesAgainst: number;
  peerVoteQuorum: number;
  // FR-1.6a cooperative Share precondition
  sharePurchased: boolean;
  characterAttested: boolean; // FR-1.5
  declarations: EligibilityDeclarations; // FR-1.5a
  kycDocs: KycDoc[];
  // FR-1.8 single-Ekub rule flag
  duplicateActiveMembership: boolean;
  rejectionReason?: string;
}

export interface Member {
  id: string;
  memberId: string; // FR-1.7
  ekubNumber: string; // FR-4.8 (distinct from memberId)
  displayHandle: string; // FR-1.5b (real name never shown publicly)
  fullName: string;
  tierId: string;
  status: MemberStatus;
  consecutiveMisses: number;
  hasWonThisCycle: boolean;
}

// ---- Group / Cycle (a running instance of a Scheme/Tier) -------------------
export interface Group {
  id: string;
  code: string;
  name: string;
  status: string; // draft | active | completed | cancelled
  schemeId: string;
  currentMembers: number;
  maxMembers: number;
  startDate: string;
  expectedEndDate: string;
}

// ---- Tier / Cycle ----------------------------------------------------------
export interface Tier {
  id: string;
  name: string;
  contribution: number;
  serviceFee: number; // Ujrah
  participationFee: number;
  groupSize: number; // FR-2.1a (200)
  winnersPerDraw: number; // FR-2.1a (7)
  fixedPayout: number; // FR-2.1a
  contributionCadence: Cadence; // FR-4.1a
  drawCadence: Cadence; // FR-4.1a (independent)
  tabarruPercent: number; // FR-T1
  requiresProperty: boolean; // FR-5.5 (tiers 2/3)
}

// ---- Group members (per-cycle roster) --------------------------------------
export interface GroupMember {
  id: string; // equb member record id
  memberId: string; // underlying member id
  handle: string;
  ekubNumber: string;
  position: number;
  status: string; // active | suspended | at_risk | ...
}

// ---- Draw eligibility preview ----------------------------------------------
export interface EligibilityMember {
  memberId: string;
  handle: string;
  position: number;
  contributionPaid: boolean;
  previouslyWon: boolean;
  eligible: boolean;
  reason?: string;
}
export interface EligibilityPreview {
  canExecute: boolean;
  reason: string;
  eligibleCount: number;
  excludedCount: number;
  totalMembers: number;
  winnersPerRound: number;
  members: EligibilityMember[];
}

// ---- Takaful ---------------------------------------------------------------
export interface TakafulTxn {
  id: string;
  memberHandle: string;
  type: string; // contribution | claim | surplus | refund
  amount: number;
  reference: string;
  createdAt: string;
}

// ---- Payments --------------------------------------------------------------
export type PaymentMethod = "mobile_money" | "bank_transfer" | "gateway" | "cash";
export type PaymentTiming = "on_time" | "late" | "outage_grace";

export interface Payment {
  id: string;
  memberHandle: string;
  ekubNumber: string;
  tierId: string;
  round: number;
  amount: number;
  method: PaymentMethod;
  timing: PaymentTiming;
  receiptNo: string;
  collectedBy?: string; // agent name if cash
  timestamp: string;
}

export interface ReconciliationRow {
  id: string;
  agentName: string;
  cashCollected: number;
  bankDeposit: number;
  reconciled: boolean;
  date: string;
}

// ---- Draws -----------------------------------------------------------------
export type DrawStatus = "scheduled" | "live" | "completed" | "postponed";

export interface DrawWinner {
  ekubNumber: string;
  displayHandle: string;
}

export interface Draw {
  id: string;
  tierId: string;
  round: number;
  scheduledAt: string; // ISO, canonical Africa/Addis_Ababa (FR-4.18)
  status: DrawStatus;
  locked: boolean; // FR-4.9
  eligibleCount: number;
  winnersPerDraw: number;
  winners: DrawWinner[];
  rngSeed?: string; // FR-4.3 / 4.16
  rngAlgorithm?: string;
  postponeReason?: string;
  rescheduleReason?: string;
}

// ---- Payout / Guarantor / Collateral ---------------------------------------
export type PayoutStatus = "pending" | "approved" | "released";
export type CollateralType = "check" | "vehicle" | "house_title";

export interface Guarantor {
  fullName: string;
  faydaId: string;
  phone: string;
  relationship: string;
  collateralType: CollateralType;
  consentSigned: boolean;
}

export interface Payout {
  id: string;
  winnerHandle: string;
  ekubNumber: string;
  tierId: string;
  amount: number;
  status: PayoutStatus;
  primaryGuarantor?: Guarantor;
  backupGuarantor?: Guarantor;
  propertyTitleUrl?: string; // FR-5.5
  requiresProperty: boolean;
  approvedAt?: string;
  drawCompletedAt: string;
}

export interface HardshipRequest {
  id: string;
  memberHandle: string;
  ekubNumber: string;
  tierId: string;
  reason: "illness" | "family_death" | "business_need";
  evidenceUrl?: string;
  consentReceived: number;
  consentRequired: number; // unanimous of eligible members (FR-4.6a)
  status: "requested" | "proposed" | "released" | "declined";
}

// ---- Penalties -------------------------------------------------------------
export type PenaltyTrigger = "missed" | "turn_sale";
export type PenaltyStatus = "at_risk" | "suspended" | "terminated";

export interface Penalty {
  id: string;
  memberHandle: string;
  ekubNumber: string;
  tierId: string;
  trigger: PenaltyTrigger;
  consecutiveMisses: number;
  drawsAffected: number;
  status: PenaltyStatus;
  createdAt: string;
}

// ---- Disputes --------------------------------------------------------------
export type DisputeStatus = "open" | "escalated" | "resolved";

export interface Dispute {
  id: string;
  memberHandle: string;
  subject: string;
  openedAt: string;
  status: DisputeStatus;
  resolution?: string;
  boardDecision?: string;
}

// ---- Staff / Roles ---------------------------------------------------------
export interface StaffMember {
  id: string;
  name: string;
  role: "agent" | "manager" | "board_chair" | "admin";
  branch: string;
  email: string;
  phone: string;
}

export interface RoleDef {
  id: string;
  name: string;
  permissions: string[];
}

// ---- Overview --------------------------------------------------------------
export interface OverviewStats {
  activeMembers: number;
  collectionRate: number;
  upcomingDraws: number;
  flaggedDisputes: number;
  guarantorExposure: number;
  pendingApprovals: number;
  takafulBalance: number;
  collectionsTrend: { label: string; value: number }[];
  membersByTier: { tier: string; count: number }[];
}
