// ============================================================================
// Real Equb backend DTOs (snake_case), mapped into the camelCase view types in
// types/ekub.ts by services/ekub.ts.
// Checked against live dev responses on 2026-09-28 (docs/api-audit/), which
// differ from swagger.json: money is a decimal string everywhere, and several
// fields swagger lists are never sent. Trust the live shape, not swagger.
//
// Naming in the admin UI:  Scheme → "Equb Category",  Group → "Equb",
//                          Round  → "Round" (one draw period inside an Equb).
// ============================================================================

export interface ApiEnvelope<T> {
  code: string;
  data: T;
  message: string;
  success: boolean;
  meta?: PaginationMeta;
}
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ---- Auth ----
export interface UserResponse {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  branch_id: string;
  /** Not sent by /users, /auth/login or /auth/profile. */
  gender?: string;
  status: boolean;
  totp_enabled: boolean;
  login_count?: number;
  failed_login_attempts?: number;
  created_at?: string;
  updated_at?: string;
  job_title?: string;
  department?: string;
  profile_picture?: string;
  permissions?: string[];
  roles?: { id: string; name: string; description?: string }[];
}
/** Subset of GET /agents used by the staff pickers. `id` is the user id. The live API sends no roles or job_title. */
export interface AgentSummaryResponse {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title?: string;
  status: boolean;
  is_agent?: boolean;
  roles?: { id: string; name: string }[];
  branch_id?: string;
  login_count?: number;
  created_at?: string;
}
export interface LoginResponse {
  token: string;
  refresh_token: string;
  /** Not sent on a normal login; kept for the TOTP flow. */
  requires_totp?: boolean;
  user: UserResponse;
}
export interface LoginRequest {
  identifier: string;
  password: string;
}

// ---- Shared ----
export interface MemberInfo {
  id: string;
  full_name: string;
  display_name: string;
  membership_number: string;
  phone_number: string;
  /** Not sent on group members. */
  photo?: string;
}

/** Subset of the Sacco `MemberResponse` we need for the member picker. */
export interface MemberSummaryResponse {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  membership_number: string;
  phone_number: string;
  photo: string;
  status: string;
  member_category: string;
}

/** Subset of GET /members/{id} shown on the member profile. */
export interface SaccoMemberResponse {
  id: string;
  full_name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  gender?: string;
  age?: number;
  birth_date?: string;
  marriage_status?: string;
  membership_number?: string;
  member_category?: string;
  photo?: string;
  status?: string;
  created_at?: string;
  branch?: { id: string; name: string; code?: string } | null;
  current_address?: { region?: string; zone?: string; subcity?: string; district?: string; kebele?: string; neighborhood?: string; house_number?: string } | null;
  emergency_contacts?: { full_name: string; phone_number?: string; relationship?: string }[] | null;
}

// ---- Scheme (= Equb Category) ----
export const EQUB_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
] as const;
export type EqubFrequency = (typeof EQUB_FREQUENCIES)[number];

export const EQUB_SCHEME_STATUSES = ["draft", "active", "completed", "cancelled"] as const;
export type EqubSchemeStatus = (typeof EQUB_SCHEME_STATUSES)[number];

/**
 * New schemes come back `active` straight away; `draft` is never assigned on create.
 * Nested inside a group (`equb_scheme`) the object is partial: no `created_by`,
 * `description` is blank and the timestamps are "0001-01-01T00:00:00Z".
 */
export interface EqubSchemeResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string; // active | completed | cancelled (draft only if set explicitly)
  frequency: string; // EqubFrequency
  /** Decimal string, e.g. "1000". */
  contribution_amount: string;
  admin_fee: string;
  takaful_fee: string;
  payout_amount: string;
  members_per_group: number;
  winners_per_round: number;
  total_rounds: number;
  /** Winners must put up a guarantee before payout (default true). */
  guarantee_required?: boolean;
  accepted_guarantee_types?: string[];
  /** Absent on the scheme nested in a group. */
  created_by?: string;
  created_at: string;
  updated_at: string;
}
export interface CreateEqubSchemeRequest {
  /** Optional: blank -> server allocates EQS00001-style. Letters and digits only. */
  code?: string;
  name: string;
  description?: string;
  frequency: EqubFrequency;
  contribution_amount: number;
  admin_fee?: number;
  takaful_fee?: number;
  payout_amount: number;
  members_per_group: number;
  winners_per_round: number;
  total_rounds: number;
  guarantee_required?: boolean;
  accepted_guarantee_types?: string[];
}
export type UpdateEqubSchemeRequest = CreateEqubSchemeRequest & {
  status?: EqubSchemeStatus;
};

// ---- Group (= Equb) ----
/** The user who runs the group (every /equb/manager/** ownership check). */
export interface EqubGroupManagerInfo {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
}
export interface AssignEqubGroupManagerRequest {
  manager_user_id: string;
}
export interface EqubGroupManagerResponse {
  group_id: string;
  group_code: string;
  group_name: string;
  manager_user_id: string;
  /** Absent when the group had no manager before. */
  previous_manager_user_id?: string;
  /** False when the user already managed the group (idempotent, nothing written). */
  changed: boolean;
}
/** Resolved terms a group actually runs on (scheme + overrides). Money is decimal-as-string. */
export interface EqubTermsResponse {
  contribution_amount: string;
  admin_fee: string;
  takaful_fee: string;
  payout_amount: string;
  total_per_round: string;
  frequency: string;
  members_per_group: number;
  winners_per_round: number;
  total_rounds: number;
  guarantee_required?: boolean;
  accepted_guarantee_types?: string[];
}
/** Per-group overrides of the scheme's terms. Omitted/null = inherit. */
export interface EqubTermOverrides {
  contribution_amount_override?: string | null;
  admin_fee_override?: string | null;
  takaful_fee_override?: string | null;
  payout_amount_override?: string | null;
  frequency_override?: EqubFrequency | null;
  total_rounds_override?: number | null;
  winners_per_round_override?: number | null;
  guarantee_required_override?: boolean | null;
  accepted_guarantee_types_override?: string[] | null;
}
/** How the admin fee divides, in percent. All three are sent together and total 100. */
export interface EqubAdminFeeShares {
  sacco_admin_fee_share?: string;
  agent_admin_fee_share?: string;
  broker_admin_fee_share?: string;
  /** Required whenever broker_admin_fee_share > 0. */
  broker_user_id?: string | null;
}
export interface EqubGroupResponse extends EqubTermOverrides, EqubAdminFeeShares {
  id: string;
  code: string;
  name: string;
  status: string; // draft | active | completed | cancelled
  equb_scheme_id: string;
  equb_scheme?: EqubSchemeResponse;
  manager?: EqubGroupManagerInfo | null;
  /** Read this, not equb_scheme.*, for what the group charges and pays. */
  effective_terms?: EqubTermsResponse;
  /** 1 for a first run; a cloned "next cycle" carries previous_group_id. */
  cycle_number?: number;
  previous_group_id?: string | null;
  current_members: number;
  max_members: number;
  start_date: string;
  expected_end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface EqubGroupDetailResponse extends EqubGroupResponse {
  current_round?: EqubRoundResponse;
  recent_winners?: EqubWinnerResponse[];
  my_member_info?: EqubMemberResponse;
}
export interface CreateEqubGroupRequest extends EqubTermOverrides, EqubAdminFeeShares {
  /** Optional: blank -> server allocates EQG00001-style. */
  code?: string;
  name: string;
  equb_scheme_id: string;
  max_members: number;
  start_date?: string;
  expected_end_date?: string;
}
/** Only draft groups can be updated. Omitted overrides are kept, never cleared. */
export interface UpdateEqubGroupRequest extends EqubTermOverrides, EqubAdminFeeShares {
  code?: string;
  name?: string;
  max_members?: number;
  start_date?: string;
  expected_end_date?: string;
  /** Drops every override first (applied before the fields above). */
  clear_term_overrides?: boolean;
}
export interface ListEqubGroupsParams {
  equb_scheme_id?: string;
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface EqubAdminDashboardResponse {
  group_id: string;
  group_code: string;
  group_name: string;
  status: string;
  cycle_number: number;
  cycle_progress: number;
  current_round: number;
  total_rounds: number;
  draw_status: string;
  total_members: number;
  active_members: number;
  suspended_members: number;
  eligible_for_draw: number;
  paid_this_round: number;
  unpaid_this_round: number;
  /** Not sent by the live API yet. */
  next_due_date?: string;
  /** Money is a decimal string. */
  total_collected: string;
  total_payouts: string;
  total_admin_fees: string;
  total_takaful_fees: string;
  takaful_balance: string;
  wins_distributed: number;
}

// ---- Rounds / draws ----
export interface EqubRoundWinner {
  member_id: string;
  member_name: string;
  phone: string;
  payout_amount: number;
  status: string;
  winner_position: number;
  paid_at: string;
}
export interface EqubRoundMemberPayment {
  member_id: string;
  member_name: string;
  phone: string;
  amount: number;
  status: string; // paid | pending | overdue | ...
  paid_at: string;
  isCatchUp: boolean;
}
export interface EqubDrawEligibleMember {
  member_id: string;
  member_name: string;
  phone: string;
  position: number;
  contribution_paid: boolean;
  previously_won: boolean;
  eligible: boolean;
}
export interface EqubDrawExcludedMember {
  member_id: string;
  member_name: string;
  phone: string;
  contribution_paid: boolean;
  previously_won: boolean;
  has_unpaid_catch_up: boolean;
  is_banned: boolean;
  eligible: boolean;
  reason: string;
}
export interface EqubRoundResponse {
  id: string;
  equb_group_id: string;
  round_number: number;
  status: string;
  scheduled_at: string;
  drawn_at: string;
  contribution_due_date: string;
  created_at: string;
  /** Empty when the round can be drawn; otherwise the one unmet condition. */
  not_ready_reason?: string;
  // Payment summary
  total_members: number;
  paid_count: number;
  unpaid_count: number;
  payment_percentage: number;
  total_contribution: number;
  total_admin_fee: number;
  total_takaful_fee: number;
  payout_amount: number;
  member_payments?: EqubRoundMemberPayment[];
  // Draw preview (if the round is ready for a draw)
  can_execute_draw: boolean;
  eligible_count: number;
  excluded_count: number;
  eligible_members?: EqubDrawEligibleMember[];
  excluded_members?: EqubDrawExcludedMember[];
  // Winner info (if the round is drawn)
  winners?: EqubRoundWinner[];
}
export interface ListEqubRoundsParams {
  status?: string;
  page?: number;
  per_page?: number;
}
export interface EqubDrawPreviewResponse {
  group_id: string;
  group_name: string;
  round_id: string;
  round_number: number;
  can_execute_draw: boolean;
  reason: string;
  eligible_count: number;
  excluded_count: number;
  total_members: number;
  winners_per_round: number;
  eligible_members: EqubDrawEligibleMember[];
  excluded_members: EqubDrawExcludedMember[];
}
export interface EqubDrawCandidateResponse {
  id: string;
  equb_member_id: string;
  member_id: string;
  contribution_paid: boolean;
  eligible: boolean;
  overdue: boolean;
  previously_won: boolean;
  suspended: boolean;
  reason: string;
  created_at: string;
}

// ---- Winners / guarantee / payout ----
export interface EqubWinnerResponse {
  id: string;
  equb_round_id: string;
  equb_draw_id: string;
  member_id: string;
  member?: MemberInfo;
  winner_position: number;
  payout_amount: number;
  status: string;
  guarantee_status: string;
  paid_at: string;
  created_at: string;
}
export interface EqubGuaranteeResponse {
  id: string;
  equb_winner_id: string;
  guarantee_type: string;
  guarantor_member_id: string;
  guarantor_name: string;
  collateral_type: string;
  collateral_reference: string;
  collateral_value: number;
  status: string;
  approved_at: string;
  created_at: string;
}
export const EQUB_GUARANTEE_TYPES = ["member", "cheque", "collateral"] as const;
export type EqubGuaranteeType = (typeof EQUB_GUARANTEE_TYPES)[number];
export interface CreateEqubGuaranteeRequest {
  guarantee_type: EqubGuaranteeType;
  guarantor_name: string;
  guarantor_member_id?: string;
  collateral_type?: string;
  collateral_reference?: string;
  collateral_value?: number;
}
export interface EqubPayoutResponse {
  id: string;
  equb_winner_id: string;
  member_id: string;
  member?: MemberInfo;
  amount: number;
  status: string;
  payment_id: string;
  paid_at: string;
  created_at: string;
}

// ---- Members ----
export interface EqubMemberResponse {
  id: string;
  equb_group_id: string;
  member_id: string;
  member?: MemberInfo;
  position: number;
  status: string;
  joined_at: string;
}
export interface ListEqubMembersParams {
  status?: string;
  page?: number;
  per_page?: number;
}

// ---- Takaful ----
export interface EqubTakafulTransactionResponse {
  id: string;
  equb_group_id: string;
  equb_round_id: string;
  member_id: string;
  type: string;
  amount: number;
  reference: string;
  created_at: string;
}
export interface EqubTakafulClaimResponse {
  id: string;
  equb_group_id: string;
  member_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}
export interface EqubTakafulSettlementItem {
  member_id: string;
  type: string;
  amount: number;
}
export interface EqubTakafulSettlementResponse {
  equb_group_id: string;
  type: string;
  total_amount: number;
  remaining_balance: number;
  items: EqubTakafulSettlementItem[];
  created_at: string;
}

// ---- Next cycle (clone) ----
export interface CloneEqubGroupRequest {
  name?: string;
  code?: string;
  max_members?: number;
  start_date?: string;
  copy_members?: boolean;
  carry_over_missed_payments?: boolean;
}
export interface CloneEqubGroupResponse {
  group: EqubGroupResponse;
  previous_group_id: string;
  previous_group_code: string;
  members_copied: number;
  bans_carried_over: number;
  next_step: string;
}

// ---- SACCO-wide fee ledger (GET /equb/admin/fees) ----
export interface FeeLedgerParams {
  scheme_id?: string;
  group_id?: string;
  round_id?: string;
  contribution_id?: string;
  member_id?: string;
  status?: string; // paid | pending | overdue | waived
  page?: number;
  per_page?: number;
}
export interface EqubFeeLine {
  contribution_id: string;
  member_id: string;
  member_name: string;
  membership_number: string;
  group_id: string;
  group_code: string;
  group_name: string;
  scheme_id: string;
  scheme_code: string;
  scheme_name: string;
  round_id: string;
  round_number: number;
  scheduled_at: string;
  contribution_amount: string;
  admin_fee: string;
  takaful_fee: string;
  total_amount: string;
  status: string;
  collected: boolean;
  is_catch_up: boolean;
  paid_at: string;
  payment_id: string;
  created_at: string;
}
export interface EqubFeesTotals {
  contributions: number;
  members: number;
  rounds: number;
  contribution_charged: string;
  contribution_collected: string;
  admin_fee_charged: string;
  admin_fee_collected: string;
  takaful_fee_charged: string;
  takaful_fee_collected: string;
  total_charged: string;
  total_collected: string;
}
export interface EqubFeesLedgerResponse {
  page: number;
  per_page: number;
  total: number;
  totals: EqubFeesTotals;
  records: EqubFeeLine[];
}

// ---- Contribution attachments (evidence, never state) ----
export interface EqubContributionAttachmentResponse {
  id: string;
  equb_contribution_id: string;
  member_id: string;
  member_name: string;
  round_id: string;
  round_number: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  /** Short-lived URL minted for this response — do not cache. */
  file_url: string;
  is_image: boolean;
  description: string;
  uploaded_by: string;
  created_at: string;
}
export interface EqubContributionAttachmentListResponse {
  records: EqubContributionAttachmentResponse[];
  total: number;
}

// ---- Admin fee ledgers ----
export interface EqubAdminFeeTotals {
  charged: string;
  collected: string;
  outstanding: string;
}
export interface EqubAdminFeeSplit {
  sacco_share_percent: string;
  sacco_amount: string;
  agent_share_percent: string;
  agent_amount: string;
  broker_share_percent: string;
  broker_amount: string;
}
export interface EqubAdminFeeLine {
  contribution_id: string;
  member_id: string;
  member_name: string;
  membership_number: string;
  round_id: string;
  round_number: number;
  scheduled_at: string;
  amount: string;
  collected: boolean;
  is_catch_up: boolean;
  paid_at: string;
  payment_id: string;
  status: string;
}
export interface EqubAdminFeeRoundSummary {
  round_id: string;
  round_number: number;
  scheduled_at: string;
  status: string;
  members: number;
  paid_count: number;
  totals: EqubAdminFeeTotals;
}
export interface EqubAdminFeeMemberSummary {
  member_id: string;
  member_name: string;
  membership_number: string;
  rounds: number;
  paid_count: number;
  totals: EqubAdminFeeTotals;
}
export interface EqubAdminFeeGroupResponse {
  group_id: string;
  group_code: string;
  group_name: string;
  /** The flat fee charged now; historic rounds report what they were charged. */
  fee_per_member_per_round: string;
  totals: EqubAdminFeeTotals;
  split: EqubAdminFeeSplit;
  rounds: EqubAdminFeeRoundSummary[];
  members: EqubAdminFeeMemberSummary[];
}
export interface EqubAdminFeeRoundResponse {
  group_id: string;
  group_name: string;
  round_id: string;
  round_number: number;
  scheduled_at: string;
  contribution_due_date: string;
  status: string;
  totals: EqubAdminFeeTotals;
  split: EqubAdminFeeSplit;
  lines: EqubAdminFeeLine[];
}
export interface EqubAdminFeeMemberResponse {
  group_id: string;
  group_name: string;
  member_id: string;
  /** Not sent by the live API. */
  member_name?: string;
  membership_number?: string;
  totals: EqubAdminFeeTotals;
  lines: EqubAdminFeeLine[];
}

// ---- Recording a contribution (staff collection) ----
export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "mobile_money",
  "cheque",
  "card",
  "online",
  "wallet",
  "direct_debit",
  "internal_transfer",
  "automatic_deduction",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** POST /equb/manager/my-groups/{group_id}/members/{member_id}/collect — the server works out the amount. */
export interface EqubPayRoundsRequest {
  round_ids: string[];
  /** Required when collecting missed rounds, so the server books it as back-pay. */
  is_catch_up?: boolean;
  method?: PaymentMethod;
  reference?: string;
  description?: string;
}
export interface EqubPayInitiatedResponse {
  group_id: string;
  payment_id: string;
  status: string; // settles once the payment is confirmed
  total_amount?: number;
  /** Newer responses name the total `amount`. */
  amount?: number;
  rounds: unknown[];
  /** The proof sent with the collection (multipart), filed against every contribution collected. */
  attachments?: { id: string; file_name: string; contribution_ids?: string[] }[];
  /** Set when a file was sent but could not be filed; the collection still stands. */
  attachment_warning?: string;
}
/** Optional proof sent in the same collect request (multipart/form-data). */
export interface CollectProof {
  file: File;
  description?: string;
}
export const PAYMENT_STATUSES = ["pending", "processing", "completed", "failed", "cancelled", "refunded", "held", "reversed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
/** PATCH /payments/{id}/status */
export interface PaymentUpdateStatusRequest {
  status: PaymentStatus;
  notes?: string;
  internal_notes?: string;
  approved_by?: string;
  processed_by?: string;
  failure_reason?: string;
}
export interface EqubMemberStandingResponse {
  group_id: string;
  group_name: string;
  member_id: string;
  /** good | warning | banned | owing */
  status: string;
  good: boolean;
  banned: boolean;
  banned_until_round: number;
  warning_issued: boolean;
  missed_count: number;
  current_round: number;
  eligible_next_draw: boolean;
  unpaid_rounds: number;
  unpaid_amount: number;
  catch_up_rounds: number;
  catch_up_amount: number;
  /** Plain-language guidance, safe to show verbatim. */
  what_to_do: string[];
}

// ---- Manager: what I collected / catch-up ----
export interface MyCollectionsParams {
  from?: string; // YYYY-MM-DD, default today
  to?: string; // YYYY-MM-DD inclusive, default today
  group_id?: string;
  scheme_id?: string;
  member_id?: string;
}
export interface EqubCollectionListItem {
  payment_id: string;
  member_id: string;
  member_name: string;
  group_id: string;
  group_name: string;
  scheme_id: string;
  scheme_name: string;
  amount: number;
  reference_number: string;
  status: string; // pending | confirmed | ...
  collected_at: string;
}
export interface EqubCollectionsSummaryResponse {
  from: string;
  to: string;
  count: number;
  /** Everything recorded; total_confirmed is what approval has settled. Decimal strings. */
  total_collected: string;
  total_confirmed: string;
  total_pending: string;
  collections: EqubCollectionListItem[];
}
export interface EqubCatchUpPaymentResponse {
  group_id: string;
  member_id: string;
  rounds_missed: number;
  per_round_amount: number;
  total_catch_up: number;
  next_round_number: number;
}

// ---- Emergency (hardship early-turn) ----
export interface EqubEmergencyDrawResponse {
  id: string;
  equb_group_id: string;
  member_id: string;
  reason: string;
  status: string;
  review_note: string;
  reviewed_by: string;
  created_at: string;
}

// ---- Membership registration requests (approvals) ----
export interface MemberRegistrationRequestResponse {
  id: string;
  full_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  branch_id: string;
  status: string; // pending | approved | rejected | ...
  registration_data: string; // JSON blob
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}
