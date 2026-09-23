// ============================================================================
// Core Equb domain types (SRS §4) as the admin pages render them. Field names
// are camelCase on the client; services/ekub.ts maps the backend DTOs
// (types/equb-api.ts, snake_case) into these.
//
// Vocabulary:  Equb Category = backend "scheme" (reusable template)
//              Equb          = backend "group"  (a running instance)
//              Round         = one draw period inside an Equb
// ============================================================================

import type { EqubFrequency, EqubSchemeStatus } from "./equb-api";

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

export type Frequency = EqubFrequency;
export type LifecycleStatus = EqubSchemeStatus; // draft | active | completed | cancelled

// ---- Application / Member --------------------------------------------------
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected";

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
  categoryId: string;
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

/** A Sacco member as shown in the "add to Equb" picker. */
export interface MemberSummary {
  id: string;
  fullName: string;
  membershipNumber: string;
  phone: string;
  photo?: string;
  status: string;
}

// ---- Equb Category (backend scheme) ----------------------------------------
export interface EqubCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string; // LifecycleStatus
  frequency: Frequency;
  contribution: number; // per round
  adminFee: number; // Ujrah service fee, per round
  takafulFee: number; // tabarru' donation, per round
  payout: number; // fixed payout per winner
  membersPerEqub: number;
  winnersPerRound: number;
  totalRounds: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EqubCategoryInput {
  code?: string; // required on create, immutable afterwards
  name: string;
  description: string;
  frequency: Frequency;
  contribution: number;
  adminFee: number;
  takafulFee: number;
  payout: number;
  membersPerEqub: number;
  winnersPerRound: number;
  totalRounds: number;
  status?: LifecycleStatus; // update only
}

// ---- Equb (backend group: a running instance of a category) ----------------
export interface Equb {
  id: string;
  code: string;
  name: string;
  status: string; // LifecycleStatus
  categoryId: string;
  category?: EqubCategory;
  currentMembers: number;
  maxMembers: number;
  startDate: string;
  expectedEndDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EqubInput {
  code: string;
  name: string;
  categoryId: string;
  maxMembers: number;
  startDate?: string;
  expectedEndDate?: string;
}
export type EqubUpdateInput = Partial<Omit<EqubInput, "categoryId">>;

export interface EqubListFilters {
  categoryId?: string;
  status?: string;
  search?: string;
}

/** Per-Equb admin dashboard (GET /equb/admin/groups/{id}/admin-dashboard). */
export interface EqubDashboard {
  equbId: string;
  equbCode: string;
  equbName: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  progressPercent: number;
  drawStatus: string;
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  eligibleForDraw: number;
  paidThisRound: number;
  unpaidThisRound: number;
  nextDueDate: string;
  totalCollected: number;
  totalPayouts: number;
  totalAdminFees: number;
  totalTakafulFees: number;
  takafulBalance: number;
  winsDistributed: number;
}

// ---- Equb members (per-Equb roster) ----------------------------------------
export interface EqubMember {
  id: string; // equb member record id
  memberId: string; // underlying Sacco member id
  name: string;
  membershipNumber: string;
  phone: string;
  photo?: string;
  position: number;
  status: string; // active | suspended | at_risk | ...
  joinedAt: string;
}

// ---- Rounds ----------------------------------------------------------------
export type RoundStatus = "scheduled" | "open" | "drawn" | "completed" | "cancelled" | "postponed";

export interface RoundWinner {
  memberId: string;
  name: string;
  phone: string;
  payoutAmount: number;
  status: string;
  position: number;
  paidAt: string;
}
export interface RoundMemberPayment {
  memberId: string;
  name: string;
  phone: string;
  amount: number;
  status: string; // paid | pending | overdue
  paidAt: string;
  isCatchUp: boolean;
}
export interface EligibleMember {
  memberId: string;
  name: string;
  phone: string;
  position: number;
  contributionPaid: boolean;
  previouslyWon: boolean;
  eligible: boolean;
}
export interface ExcludedMember {
  memberId: string;
  name: string;
  phone: string;
  contributionPaid: boolean;
  previouslyWon: boolean;
  hasUnpaidCatchUp: boolean;
  isBanned: boolean;
  reason: string;
}

export interface Round {
  id: string;
  equbId: string;
  roundNumber: number;
  status: RoundStatus;
  rawStatus: string;
  scheduledAt: string;
  drawnAt: string;
  contributionDueDate: string;
  createdAt: string;
  // payment summary
  totalMembers: number;
  paidCount: number;
  unpaidCount: number;
  paymentPercentage: number;
  totalContribution: number;
  totalAdminFee: number;
  totalTakafulFee: number;
  payoutAmount: number;
  memberPayments: RoundMemberPayment[];
  // draw
  canExecuteDraw: boolean;
  eligibleCount: number;
  excludedCount: number;
  eligibleMembers: EligibleMember[];
  excludedMembers: ExcludedMember[];
  winners: RoundWinner[];
}

export interface DrawPreview {
  roundId: string;
  roundNumber: number;
  canExecute: boolean;
  reason: string;
  eligibleCount: number;
  excludedCount: number;
  totalMembers: number;
  winnersPerRound: number;
  eligible: EligibleMember[];
  excluded: ExcludedMember[];
}

// ---- Winners / payouts / guarantees ----------------------------------------
export type WinnerStatus = "pending" | "approved" | "paid";

export interface Winner {
  id: string;
  roundId: string;
  roundNumber?: number;
  memberId: string;
  name: string;
  membershipNumber: string;
  phone: string;
  position: number;
  payoutAmount: number;
  status: WinnerStatus;
  rawStatus: string;
  guaranteeStatus: string;
  paidAt: string;
  createdAt: string;
}

export interface GuaranteeInput {
  guaranteeType: "member" | "cheque" | "collateral";
  guarantorName: string;
  guarantorMemberId?: string;
  collateralType?: string;
  collateralReference?: string;
  collateralValue?: number;
}

export interface Guarantee {
  id: string;
  winnerId: string;
  guaranteeType: string;
  guarantorName: string;
  guarantorMemberId: string;
  collateralType: string;
  collateralReference: string;
  collateralValue: number;
  status: string;
  approvedAt: string;
}

// ---- Hardship early-turn (emergency draws) ---------------------------------
export interface EmergencyDrawRequest {
  id: string;
  equbId: string;
  memberId: string;
  reason: string;
  status: string; // pending | approved | rejected
  reviewNote: string;
  reviewedBy: string;
  createdAt: string;
}

// ---- Takaful ---------------------------------------------------------------
export interface TakafulTxn {
  id: string;
  equbId: string;
  roundId: string;
  memberId: string;
  type: string; // contribution | claim | surplus | refund
  amount: number;
  reference: string;
  createdAt: string;
}
export interface TakafulSettlement {
  type: string;
  totalAmount: number;
  remainingBalance: number;
  items: { memberId: string; type: string; amount: number }[];
}

// ---- Payments (still mock-backed: no global admin ledger endpoint yet) -----
export type PaymentMethod = "mobile_money" | "bank_transfer" | "gateway" | "cash";
export type PaymentTiming = "on_time" | "late" | "outage_grace";

export interface Payment {
  id: string;
  memberHandle: string;
  ekubNumber: string;
  categoryId: string;
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
