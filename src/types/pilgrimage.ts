/**
 * Hajj & Umrah Equb ("pilgrimage" in the backend) wire types. Unlike the
 * rotating Equb, these are rendered as the API sends them (snake_case): the
 * module is new, so there is no legacy view model to map into.
 *
 * Money never sits in the module. Each registration has its own SACCO saving
 * contract; groups only link lottery wins.
 */

export type PilgrimageKind = "hajj" | "umrah";
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "semi_annual" | "annual";
export type ChargeBasis = "fixed_total" | "percent_of_financed" | "fixed_per_installment" | "percent_of_installment";
export type NonWinnerOption = "withdraw" | "mudarabah" | "carry_forward";

export const CHARGE_BASES: ChargeBasis[] = ["fixed_total", "percent_of_financed", "fixed_per_installment", "percent_of_installment"];
export const NON_WINNER_OPTIONS: NonWinnerOption[] = ["carry_forward", "withdraw", "mudarabah"];

export interface MudarabahTerms {
  durations_months: number[];
  member_profit_share_percent: number;
  profit_distribution?: string;
}

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
  decision_window_days: number;
  default_decision: NonWinnerOption;
  mudarabah_terms: MudarabahTerms | null;
  finance_duration_months: number;
  repayment_interval_months: number;
  service_charge_basis?: ChargeBasis | "";
  service_charge_value: number;
  equb_service_charge_share: number;
  takaful_basis?: ChargeBasis | "";
  takaful_value: number;
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
  decision_window_days?: number;
  default_decision?: NonWinnerOption;
  mudarabah_terms?: MudarabahTerms;
  finance_duration_months?: number;
  repayment_interval_months?: number;
  service_charge_basis?: ChargeBasis;
  service_charge_value?: number;
  equb_service_charge_share?: number;
  takaful_basis?: ChargeBasis;
  takaful_value?: number;
  status?: "active" | "inactive";
}

export type CycleStatus = "open" | "locked" | "drawn" | "approved" | "closed" | "cancelled";

export interface PilgrimageCycle {
  id: string;
  product_id: string;
  product?: PilgrimageProduct | null;
  number: number;
  name: string;
  opens_at: string;
  registration_closes_at: string;
  draw_at: string;
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
  entries: DrawEntry[];
}

export type ParticipationStatus = "active" | "deciding" | "won" | "withdrawn" | "invested" | "cancelled";

export interface ContributionStanding {
  package_cost: number;
  eligibility_percent: number;
  required_contribution: number;
  balance: number;
  remaining_to_eligibility: number;
  contribution_percent: number;
  eligible: boolean;
}

export interface Participation {
  id: string;
  number: string;
  member_id: string;
  member_name?: string;
  membership_number?: string;
  product?: { id: string; code: string; kind: PilgrimageKind; name: string } | null;
  status: ParticipationStatus;
  channel: "member_app" | "staff" | "agent";
  saving_contract_id: string;
  contract_number?: string;
  contract_status?: string;
  accepts_contributions: boolean;
  standing: ContributionStanding;
  current_cycle?: { id: string; number: number; name: string; status: CycleStatus; registration_closes_at: string; draw_at: string } | null;
  group?: { id: string; number: string; name: string; role?: "admin" | "member" } | null;
  cycles_entered: number;
  carried_forward: number;
  created_at: string;
}

export interface ContributeInput {
  amount: number;
  payment_method: string;
  bank_id?: string;
  payment_account_id?: string;
  transaction_id?: string;
  payment_date?: string;
  description?: string;
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

export type WinnerStatus = "confirmed" | "finance_opened" | "finance_failed";

export interface PilgrimageWinner {
  id: string;
  cycle_id: string;
  participation_id: string;
  participation?: Participation | null;
  member_id: string;
  member?: { id: string; full_name: string; membership_number: string } | null;
  outcome: EntryOutcome;
  group_id?: string | null;
  recognised_savings: number;
  package_cost: number;
  saving_contract_id: string;
  loan_application_id?: string | null;
  loan_application?: { id: string; finance_number: string; financed_amount: number; status: string; charges_amount?: number } | null;
  status: WinnerStatus;
  failure_reason?: string;
  created_at: string;
}

export type DecisionStatus = "awaiting_choice" | "pending_approval" | "processing" | "completed";

export interface PilgrimageDecision {
  id: string;
  cycle_id: string;
  participation_id: string;
  participation?: { id: string; number: string; member?: { full_name: string; membership_number: string } | null } | null;
  member_id: string;
  status: DecisionStatus;
  deadline: string;
  option?: NonWinnerOption | "";
  defaulted: boolean;
  chosen_at?: string | null;
  mudarabah_duration_months?: number;
  review_note?: string;
  amount: number;
  payment_id?: string | null;
  mudarabah_contract_id?: string | null;
  failure_reason?: string;
  completed_at?: string | null;
  created_at: string;
}

export interface ReviewDecisionInput {
  approve: boolean;
  note?: string;
  payment_method?: string;
  bank_id?: string;
  payment_account_id?: string;
  transaction_id?: string;
}

export type MudarabahStatus = "pending_funding" | "active" | "matured" | "cancelled";

export interface MudarabahContract {
  id: string;
  number: string;
  member_id: string;
  member?: { full_name: string; membership_number: string } | null;
  amount: number;
  duration_months: number;
  member_profit_share_percent: number;
  profit_distribution?: string;
  status: MudarabahStatus;
  start_date?: string | null;
  maturity_date?: string | null;
  distributed_profit: number;
  created_at: string;
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
  status?: string;
  page?: number;
  limit?: number;
}
