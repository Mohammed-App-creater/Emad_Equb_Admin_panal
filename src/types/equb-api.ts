// ============================================================================
// Real Equb backend DTOs — mirror the OpenAPI definitions exactly (snake_case),
// so the service layer maps them into the camelCase view types in types/ekub.ts.
// Source: swagger.json (github_com_emad_internal_usecase_dto.*).
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
  gender: string;
  status: boolean;
  totp_enabled: boolean;
  job_title?: string;
  department?: string;
  profile_picture?: string;
  permissions?: string[];
  roles?: { id: string; name: string; description?: string }[];
}
export interface LoginResponse {
  token: string;
  refresh_token: string;
  requires_totp: boolean;
  user: UserResponse;
}
export interface LoginRequest {
  identifier: string;
  password: string;
}

// ---- Scheme (our "Tier") ----
export interface EqubSchemeResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string; // draft | active | completed | cancelled
  frequency: string; // daily | weekly | monthly
  contribution_amount: number;
  admin_fee: number;
  takaful_fee: number;
  payout_amount: number;
  members_per_group: number;
  winners_per_round: number;
  total_rounds: number;
  created_at: string;
  updated_at: string;
}
export interface CreateEqubSchemeRequest {
  code: string;
  name: string;
  description?: string;
  frequency: string;
  contribution_amount: number;
  admin_fee?: number;
  takaful_fee?: number;
  payout_amount: number;
  members_per_group: number;
  winners_per_round: number;
  total_rounds: number;
}
export type UpdateEqubSchemeRequest = Omit<CreateEqubSchemeRequest, "code"> & {
  status?: string;
};

// ---- Group (our "cycle") ----
export interface EqubGroupResponse {
  id: string;
  code: string;
  name: string;
  status: string;
  equb_scheme_id: string;
  equb_scheme?: EqubSchemeResponse;
  current_members: number;
  max_members: number;
  start_date: string;
  expected_end_date: string;
  created_at: string;
  updated_at: string;
}
export interface CreateEqubGroupRequest {
  code: string;
  name: string;
  equb_scheme_id: string;
  max_members: number;
  start_date?: string;
  expected_end_date?: string;
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
  next_due_date: string;
  total_collected: number;
  total_payouts: number;
  total_admin_fees: number;
  total_takaful_fees: number;
  takaful_balance: number;
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
export interface EqubDrawEligibleMember {
  member_id: string;
  member_name: string;
  phone: string;
  position: number;
  contribution_paid: boolean;
  previously_won: boolean;
  eligible: boolean;
}
export interface EqubRoundResponse {
  id: string;
  equb_group_id: string;
  round_number: number;
  status: string;
  scheduled_at: string;
  drawn_at: string;
  contribution_due_date: string;
  can_execute_draw: boolean;
  eligible_count: number;
  excluded_count: number;
  paid_count: number;
  unpaid_count: number;
  total_members: number;
  payment_percentage: number;
  payout_amount: number;
  winners: EqubRoundWinner[];
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
}

// ---- Winners / guarantee / payout ----
export interface MemberInfo {
  id: string;
  full_name: string;
  display_name: string;
  membership_number: string;
  phone_number: string;
  photo: string;
}
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
}
export interface CreateEqubGuaranteeRequest {
  guarantee_type: string;
  guarantor_name: string;
  guarantor_member_id?: string;
  collateral_type?: string;
  collateral_reference?: string;
  collateral_value?: number;
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
