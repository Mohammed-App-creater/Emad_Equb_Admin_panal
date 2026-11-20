/**
 * Hajj & Umrah Equb ("pilgrimage" in the backend) wire types, rendered as the
 * API sends them (snake_case).
 *
 * Money rule: until a member wins, their savings stay on the Equb's own
 * ledger (participation.balance). Contributions and refunds are Equb ledger
 * payments that are never published to accounting. A saving contract is
 * opened only for a winner, for their savings plus the finance agreed with
 * them; they repay that finance through EMAD SACCO.
 */

export type PilgrimageKind = "hajj" | "umrah";
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "semi_annual" | "annual";
/** How one party's share of the admin fee is set: an ETB amount per participant, or a percentage of the fee. */
export type FeeShareBasis = "fixed" | "percent";
export type NonWinnerOption = "withdraw" | "carry_forward";

export const FEE_SHARE_BASES: FeeShareBasis[] = ["fixed", "percent"];
export const FEE_PARTIES = ["agent", "broker", "sacco"] as const;
export type FeeParty = (typeof FEE_PARTIES)[number];

export interface FeeShare {
  basis: FeeShareBasis | "";
  value: number;
}

/**
 * Who gets what of a participant's admin fee. On the product's admin fee
 * (admin_fee_weekly x fee_weeks) the three must add up to exactly the fee.
 */
export type AdminFeeSplit = Record<FeeParty, FeeShare>;

/** An admin fee divided between the parties, in ETB. */
export type AdminFeeAmounts = Record<FeeParty, number>;
export const NON_WINNER_OPTIONS: NonWinnerOption[] = ["carry_forward", "withdraw"];

export interface PilgrimageProduct {
  id: string;
  code: string;
  kind: PilgrimageKind;
  name: string;
  description?: string;
  status: "active" | "inactive";
  saving_type_id: string;
  saving_type?: { id: string; name: string } | null;
  package_cost: number;
  eligibility_percent: number;
  saving_period_months: number;
  cycle_frequency: Frequency;
  winners_per_cycle: number;
  registration_close_days: number;
  auto_open_next_cycle: boolean;
  group_min_members: number;
  group_max_members: number;
  /**
   * Participation fees: weekly rates over fee_weeks. Each participant owes
   * rate x weeks of each, paid in one go whenever they choose, before a
   * winner's contract is opened.
   */
  admin_fee_weekly: number;
  takaful_fee_weekly: number;
  fee_weeks: number;
  admin_fee_split: AdminFeeSplit;
  /** The journal the Equb's money is held in until a member wins. */
  holding_bank_id?: string;
  holding_payment_account_id?: string;
  decision_window_days: number;
  default_decision: NonWinnerOption;
  /** Default time from the draw for winners to pay their fees and have their contract opened. */
  winner_contract_days: number;
  created_at: string;
}

/** Create body; on update every field is optional (fields left out keep their value). */
export interface PilgrimageProductInput {
  code: string;
  kind: PilgrimageKind;
  name: string;
  description?: string;
  saving_type_id: string;
  package_cost: number;
  eligibility_percent?: number;
  saving_period_months?: number;
  cycle_frequency: Frequency;
  winners_per_cycle: number;
  registration_close_days?: number;
  auto_open_next_cycle?: boolean;
  group_min_members?: number;
  group_max_members?: number;
  admin_fee_weekly?: number;
  takaful_fee_weekly?: number;
  fee_weeks?: number;
  /** Only the parties sent change. */
  admin_fee_split?: Partial<Record<FeeParty, { basis: FeeShareBasis; value: number }>>;
  holding_bank_id?: string;
  holding_payment_account_id?: string;
  decision_window_days?: number;
  default_decision?: NonWinnerOption;
  winner_contract_days?: number;
  status?: "active" | "inactive";
}

export type CycleStatus = "open" | "locked" | "drawn" | "approved" | "closed" | "cancelled";

export interface PilgrimageCycle {
  id: string;
  product_id: string;
  product?: PilgrimageProduct | null;
  number: number;
  name: string;
  /** The cycle's calendar, in order (see CYCLE_DATES). */
  opens_at: string;
  registration_closes_at: string;
  draw_at: string;
  contract_deadline: string;
  closes_at: string;
  decision_deadline?: string | null;
  package_cost: number;
  eligibility_percent: number;
  winners_per_cycle: number;
  status: CycleStatus;
  draw_seed_commitment: string;
  revealed_seed?: string;
  selection_input?: string;
  algorithm?: string;
  eligible_count: number;
  winner_count: number;
  overflow: number;
  locked_at?: string | null;
  drawn_at?: string | null;
  drawn_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  closed_at?: string | null;
  note?: string;
  required_contribution: number;
  /** Once the seed is revealed: whether it matches the published commitment. */
  verified?: boolean;
}

/** A cycle's dates, in calendar order. */
export const CYCLE_DATES = ["opens_at", "registration_closes_at", "draw_at", "contract_deadline", "closes_at"] as const;
export type CycleDateKey = (typeof CYCLE_DATES)[number];
/** A cycle's dates as YYYY-MM-DD; those left out default (opening) or keep their value (editing). */
export type CycleDatesInput = Partial<Record<CycleDateKey, string>>;

export type EntryOutcome = "pending" | "ineligible" | "drawn" | "group_win" | "group_ineligible" | "not_selected";

export interface DrawEntry {
  participation_id: string;
  participation_number: string;
  member_id: string;
  member_name?: string;
  group_id?: string | null;
  balance: number;
  required: number;
  eligible: boolean;
  reason?: string;
  outcome: EntryOutcome;
  pick?: number | null;
  won_via_participation_id?: string | null;
}

export interface DrawResult {
  cycle: PilgrimageCycle;
  /** Approved: members see the outcomes. Staff always get every entry. */
  published?: boolean;
  entries: DrawEntry[];
}

export type ParticipationStatus = "active" | "deciding" | "won" | "withdrawn" | "cancelled";
export type Channel = "member_app" | "staff" | "agent";

export interface ContributionStanding {
  package_cost: number;
  eligibility_percent: number;
  required_contribution: number;
  balance: number;
  remaining_to_eligibility: number;
  contribution_percent: number;
  eligible: boolean;
}

/** A participant's admin fee and Takaful: owed, paid, and how the admin fee is split. */
export interface ParticipationFees {
  admin_fee_weekly: number;
  takaful_fee_weekly: number;
  fee_weeks: number;
  admin_fee_due: number;
  admin_fee_paid: number;
  takaful_fee_due: number;
  takaful_fee_paid: number;
  outstanding: number;
  admin_fee_split: AdminFeeAmounts;
  /** Nothing left to pay. A winner's contract is opened only then. */
  settled: boolean;
  /** The fees are owed and can be paid now. */
  accepts_payment: boolean;
}

export interface Participation {
  id: string;
  number: string;
  member_id: string;
  member_name?: string;
  membership_number?: string;
  product?: { id: string; code: string; kind: PilgrimageKind; name: string } | null;
  status: ParticipationStatus;
  channel: Channel;
  agent_user_id?: string | null;
  agent_name?: string;
  /** Savings on the Equb ledger. */
  balance: number;
  /** The SACCO contract opened when the member won (none before). */
  saving_contract_id?: string | null;
  contract_number?: string;
  contract_status?: string;
  accepts_contributions: boolean;
  /** Savings of payments still waiting to be confirmed. */
  pending_savings?: number;
  /**
   * The most the member may still save: the package cost less the balance
   * and pending_savings (set while they accept contributions). More is refused.
   */
  max_contribution?: number | null;
  fees?: ParticipationFees | null;
  standing: ContributionStanding;
  current_cycle?: {
    id: string; number: number; name: string; status: CycleStatus;
    opens_at: string; registration_closes_at: string; draw_at: string; contract_deadline: string; closes_at: string;
  } | null;
  group?: { id: string; number: string; name: string; role?: "admin" | "member" } | null;
  cycles_entered: number;
  carried_forward: number;
  created_at: string;
}

/**
 * A payment to a participation: amount is what it saves; with pay_fees it
 * also pays all of the outstanding admin fee and Takaful. amount may be 0 for
 * a fees-only payment.
 */
export interface ContributeInput {
  amount: number;
  pay_fees?: boolean;
  payment_method: string;
  transaction_id?: string;
  description?: string;
}

export type ContributionStatus = "pending" | "paid" | "failed";

/** One payment on the Equb ledger: savings and/or the fees, and the payment that collected them. */
export interface Contribution {
  id: string;
  participation_id: string;
  participation_number?: string;
  product_id: string;
  member_id: string;
  agent_user_id?: string | null;
  collected_by_user_id?: string | null;
  amount: number;
  admin_fee: number;
  takaful_fee: number;
  total_amount: number;
  payment_id?: string | null;
  payment_status?: string;
  status: ContributionStatus;
  paid_at?: string | null;
  created_at: string;
}

export interface ContributionTotals {
  count: number;
  saved_amount: number;
  admin_fee_charged: number;
  admin_fee_collected: number;
  takaful_fee_charged: number;
  takaful_fee_collected: number;
}

export interface ContributionLedger {
  contributions: Contribution[];
  totals: ContributionTotals;
}

export interface GroupMemberView {
  membership_id: string;
  participation_id: string;
  participation_number?: string;
  member_name?: string;
  role: "admin" | "member";
  status: "invited" | "active";
  eligible: boolean;
  participation_status?: ParticipationStatus;
}

export interface PilgrimageGroup {
  id: string;
  number: string;
  name: string;
  product_id: string;
  status: "active" | "dissolved";
  admin_participation_id: string;
  locked: boolean;
  min_members: number;
  max_members: number;
  members: GroupMemberView[];
  created_at: string;
}

/** A winner's way from the draw to their finance, in order. */
/**
 * A winner's way into EMAD SACCO, in order: their fees are paid, a draft
 * contract is created in the SACCO, SACCO staff complete it and send it to
 * Odoo, their savings move onto it, and from there the SACCO's own flow
 * takes over.
 */
export const WINNER_STEPS = ["awaiting_fees", "contract_draft", "contract_pending", "transferring", "completed"] as const;
export type WinnerStatus = (typeof WINNER_STEPS)[number];

/** The participation as a winner record carries it (the stored row, not the full view). */
export interface WinnerParticipation {
  id: string;
  number: string;
  balance: number;
  admin_fee_due: number;
  admin_fee_paid: number;
  takaful_fee_due: number;
  takaful_fee_paid: number;
  saving_contract_id?: string | null;
}

export interface PilgrimageWinner {
  id: string;
  cycle_id: string;
  participation_id: string;
  participation?: WinnerParticipation | null;
  member_id: string;
  member?: { id: string; full_name: string; membership_number: string } | null;
  outcome: EntryOutcome;
  group_id?: string | null;
  recognised_savings: number;
  package_cost: number;
  saving_contract_id?: string | null;
  transfer_payment_id?: string | null;
  transferred_at?: string | null;
  saving_contract?: { id: string; contract_number?: string; status: string; requested_amount: number; contribution_amount: number; financed_amount: number } | null;
  contract_drafted_at?: string | null;
  /** By when the winner must have paid their fees and had their contract opened. */
  contract_deadline?: string | null;
  /** Past the deadline and the contract is not opened yet. */
  contract_overdue?: boolean;
  status: WinnerStatus;
  failure_reason?: string;
  created_at: string;
}

export type DecisionStatus = "awaiting_choice" | "pending_approval" | "processing" | "completed";

export interface PilgrimageDecision {
  id: string;
  cycle_id: string;
  participation_id: string;
  participation?: { id: string; number: string; balance?: number; member?: { full_name: string; membership_number: string } | null } | null;
  member_id: string;
  status: DecisionStatus;
  deadline: string;
  option?: NonWinnerOption | "";
  defaulted: boolean;
  /**
   * Where the member asked a withdrawal to be paid (empty when they did not
   * say). For mobile_money the bank name is the provider and the account
   * number the wallet's phone number.
   */
  payout_method?: PayoutMethod | "";
  payout_bank_name?: string;
  payout_account_number?: string;
  payout_account_name?: string;
  chosen_at?: string | null;
  review_note?: string;
  amount: number;
  payment_id?: string | null;
  failure_reason?: string;
  completed_at?: string | null;
  created_at: string;
}

export type PayoutMethod = "cash" | "bank_transfer" | "mobile_money";

/** A receipt or screenshot filed with a contribution's payment. */
export interface PaymentProof {
  id: string;
  file_name: string;
  /** Short-lived download link. */
  file_url?: string;
  file_size: number;
  mime_type: string;
  description?: string;
  created_at: string;
}

export interface ReviewDecisionInput {
  approve: boolean;
  note?: string;
  payment_method?: string;
  transaction_id?: string;
}

/** A receiving account a SACCO payment can be booked on (GET /payment-accounts). */
export interface PaymentAccount {
  id: string;
  payment_type: string;
  account: { id: string; code?: string; name?: string };
  journal: { id?: string; code?: string; name?: string; type?: string };
  active: boolean;
}

export interface SavingTypeOption {
  id: string;
  name: string;
  category?: string;
  status: string;
  borrower_contribution_min: number;
  grace_period_days?: number;
}

export interface PilgrimageListParams {
  product_id?: string;
  cycle_id?: string;
  member_id?: string;
  participation_id?: string;
  agent_user_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}
