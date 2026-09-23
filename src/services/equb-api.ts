import { api } from "@/lib/api/client";
import { EQUB_ENDPOINTS } from "@/lib/api/equb-endpoints";
import { mockEqubApi } from "@/lib/mock/mock-equb-api";
import type {
  ApiEnvelope,
  CreateEqubGroupRequest,
  CreateEqubGuaranteeRequest,
  CreateEqubSchemeRequest,
  EqubAdminDashboardResponse,
  EqubDrawCandidateResponse,
  EqubDrawPreviewResponse,
  EqubEmergencyDrawResponse,
  EqubGroupResponse,
  EqubGuaranteeResponse,
  EqubMemberResponse,
  EqubPayoutResponse,
  EqubRoundResponse,
  EqubSchemeResponse,
  EqubTakafulClaimResponse,
  EqubTakafulSettlementResponse,
  EqubTakafulTransactionResponse,
  EqubWinnerResponse,
  ListEqubGroupsParams,
  ListEqubMembersParams,
  ListEqubRoundsParams,
  LoginRequest,
  LoginResponse,
  MemberRegistrationRequestResponse,
  MemberSummaryResponse,
  UpdateEqubGroupRequest,
  UpdateEqubSchemeRequest,
  UserResponse,
} from "@/types/equb-api";

// Thin, fully-typed wrappers over the real Equb admin endpoints. Every call
// unwraps the shared APIResponse envelope (`data`). Consumed by services/ekub.ts
// which maps these DTOs into the camelCase view types the pages render.
const unwrap = async <T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> =>
  (await p).data.data;

// Some list endpoints return `null` instead of `[]` when empty.
const list = async <T>(p: Promise<{ data: ApiEnvelope<T[] | null> }>): Promise<T[]> =>
  (await unwrap(p)) ?? [];

const realEqubApi = {
  // ---- Auth ----
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return unwrap<LoginResponse>(api.post(EQUB_ENDPOINTS.AUTH.LOGIN, payload));
  },

  // ---- Schemes (Equb Categories) ----
  async listSchemes(params?: { status?: string; search?: string; page?: number; per_page?: number }): Promise<EqubSchemeResponse[]> {
    return list<EqubSchemeResponse>(api.get(EQUB_ENDPOINTS.SCHEMES.LIST, { params }));
  },
  async createScheme(body: CreateEqubSchemeRequest): Promise<EqubSchemeResponse> {
    return unwrap<EqubSchemeResponse>(api.post(EQUB_ENDPOINTS.SCHEMES.CREATE, body));
  },
  async getScheme(id: string): Promise<EqubSchemeResponse> {
    return unwrap<EqubSchemeResponse>(api.get(EQUB_ENDPOINTS.SCHEMES.DETAIL(id)));
  },
  async updateScheme(id: string, body: UpdateEqubSchemeRequest): Promise<EqubSchemeResponse> {
    return unwrap<EqubSchemeResponse>(api.put(EQUB_ENDPOINTS.SCHEMES.UPDATE(id), body));
  },
  async deleteScheme(id: string): Promise<unknown> {
    return unwrap(api.delete(EQUB_ENDPOINTS.SCHEMES.DELETE(id)));
  },

  // ---- Groups (Equbs) ----
  async listGroups(params?: ListEqubGroupsParams): Promise<EqubGroupResponse[]> {
    return list<EqubGroupResponse>(api.get(EQUB_ENDPOINTS.GROUPS.LIST, { params }));
  },
  async getGroup(id: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.get(EQUB_ENDPOINTS.GROUPS.DETAIL(id)));
  },
  async createGroup(body: CreateEqubGroupRequest): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.CREATE, body));
  },
  async updateGroup(id: string, body: UpdateEqubGroupRequest): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.put(EQUB_ENDPOINTS.GROUPS.UPDATE(id), body));
  },
  async deleteGroup(id: string): Promise<unknown> {
    return unwrap(api.delete(EQUB_ENDPOINTS.GROUPS.DELETE(id)));
  },
  async activateGroup(id: string, startDate: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.ACTIVATE(id), { start_date: startDate }));
  },
  async cancelGroup(id: string, reason: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.CANCEL(id), { reason }));
  },
  async extendGroup(id: string, additionalRounds: number, reason: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.EXTEND(id), { additional_rounds: additionalRounds, reason }));
  },
  async autoCancel(): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.AUTO_CANCEL, {}));
  },
  async dashboard(groupId: string): Promise<EqubAdminDashboardResponse> {
    return unwrap<EqubAdminDashboardResponse>(api.get(EQUB_ENDPOINTS.DASHBOARD(groupId)));
  },

  // ---- Group members ----
  async listGroupMembers(groupId: string, params?: ListEqubMembersParams): Promise<EqubMemberResponse[]> {
    return list<EqubMemberResponse>(api.get(EQUB_ENDPOINTS.GROUPS.MEMBERS(groupId), { params }));
  },
  async addMember(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.MEMBERS(groupId), { member_id: memberId }));
  },
  async removeMember(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.delete(EQUB_ENDPOINTS.GROUPS.MEMBER(groupId, memberId)));
  },
  async swapPositions(groupId: string, memberId1: string, memberId2: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.SWAP_POSITIONS(groupId), { member_id_1: memberId1, member_id_2: memberId2 }));
  },
  async suspendMember(groupId: string, memberId: string, reason: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.SUSPEND_MEMBER(groupId, memberId), { reason }));
  },
  async unsuspendMember(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.UNSUSPEND_MEMBER(groupId, memberId), {}));
  },

  // ---- Sacco member directory (picker for "add member") ----
  async searchMembers(search: string, limit = 10): Promise<MemberSummaryResponse[]> {
    return list<MemberSummaryResponse>(api.get(EQUB_ENDPOINTS.MEMBERS.LIST, { params: { search, limit, page: 1 } }));
  },

  // ---- Rounds / draws ----
  async listRounds(groupId: string, params?: ListEqubRoundsParams): Promise<EqubRoundResponse[]> {
    return list<EqubRoundResponse>(api.get(EQUB_ENDPOINTS.GROUPS.ROUNDS(groupId), { params }));
  },
  async getRound(roundId: string): Promise<EqubRoundResponse> {
    return unwrap<EqubRoundResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.DETAIL(roundId)));
  },
  async drawPreview(roundId: string): Promise<EqubDrawPreviewResponse> {
    return unwrap<EqubDrawPreviewResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.DRAW_PREVIEW(roundId)));
  },
  async executeDraw(roundId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.ROUNDS.EXECUTE_DRAW(roundId), {}));
  },
  async listWinners(roundId: string): Promise<EqubWinnerResponse[]> {
    return list<EqubWinnerResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.WINNERS(roundId)));
  },
  async drawCandidates(drawId: string): Promise<EqubDrawCandidateResponse[]> {
    return list<EqubDrawCandidateResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.DRAW_CANDIDATES(drawId)));
  },

  // ---- Payout / guarantor ----
  async createGuarantee(winnerId: string, body: CreateEqubGuaranteeRequest): Promise<EqubGuaranteeResponse> {
    return unwrap<EqubGuaranteeResponse>(api.post(EQUB_ENDPOINTS.GUARANTEES.CREATE(winnerId), body));
  },
  async approveGuarantee(guaranteeId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GUARANTEES.APPROVE(guaranteeId), {}));
  },
  async rejectGuarantee(guaranteeId: string, reviewNote: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GUARANTEES.REJECT(guaranteeId), { review_note: reviewNote }));
  },
  async processPayout(winnerId: string): Promise<EqubPayoutResponse> {
    return unwrap<EqubPayoutResponse>(api.post(EQUB_ENDPOINTS.PAYOUT(winnerId), {}));
  },

  // ---- Hardship / emergency draws ----
  async listEmergencyDraws(groupId: string, params?: { status?: string }): Promise<EqubEmergencyDrawResponse[]> {
    return list<EqubEmergencyDrawResponse>(api.get(EQUB_ENDPOINTS.EMERGENCY_DRAWS.LIST(groupId), { params }));
  },
  async submitEmergencyDraw(groupId: string, memberId: string, reason: string, evidence?: string): Promise<EqubEmergencyDrawResponse> {
    return unwrap<EqubEmergencyDrawResponse>(
      api.post(EQUB_ENDPOINTS.EMERGENCY_DRAWS.SUBMIT(groupId), { equb_group_id: groupId, member_id: memberId, reason, evidence })
    );
  },
  async approveEmergencyDraw(requestId: string, reviewNote?: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.EMERGENCY_DRAWS.APPROVE(requestId), { review_note: reviewNote ?? "" }));
  },
  async rejectEmergencyDraw(requestId: string, reviewNote: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.EMERGENCY_DRAWS.REJECT(requestId), { review_note: reviewNote }));
  },

  // ---- Takaful ----
  async listTakaful(groupId: string): Promise<EqubTakafulTransactionResponse[]> {
    return list<EqubTakafulTransactionResponse>(api.get(EQUB_ENDPOINTS.TAKAFUL.LIST(groupId)));
  },
  async takafulBalance(groupId: string): Promise<{ balance: number }> {
    return unwrap<{ balance: number }>(api.get(EQUB_ENDPOINTS.TAKAFUL.BALANCE(groupId)));
  },
  async distributeSurplus(groupId: string): Promise<EqubTakafulSettlementResponse> {
    return unwrap<EqubTakafulSettlementResponse>(api.post(EQUB_ENDPOINTS.TAKAFUL.DISTRIBUTE_SURPLUS(groupId), {}));
  },
  async submitTakafulClaim(groupId: string, memberId: string, amount: number, reason: string): Promise<EqubTakafulClaimResponse> {
    return unwrap<EqubTakafulClaimResponse>(
      api.post(EQUB_ENDPOINTS.TAKAFUL.CLAIMS(groupId), { equb_group_id: groupId, member_id: memberId, amount, reason })
    );
  },
  async refundTakaful(groupId: string, reason: string): Promise<EqubTakafulSettlementResponse> {
    return unwrap<EqubTakafulSettlementResponse>(api.post(EQUB_ENDPOINTS.TAKAFUL.REFUND(groupId), { reason }));
  },

  // ---- Contributions / penalties ----
  async markOverdue(): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.CONTRIBUTIONS.MARK_OVERDUE, {}));
  },

  // ---- Membership approvals ----
  async listRegistrationRequests(params?: Record<string, unknown>): Promise<MemberRegistrationRequestResponse[]> {
    return list<MemberRegistrationRequestResponse>(api.get(EQUB_ENDPOINTS.REGISTRATION_REQUESTS.LIST, { params }));
  },
  async approveRegistration(id: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.REGISTRATION_REQUESTS.APPROVE(id), {}));
  },
  async rejectRegistration(id: string, reason: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.REGISTRATION_REQUESTS.REJECT(id), { reason }));
  },

  // ---- Staff & roles ----
  async listUsers(params?: Record<string, unknown>): Promise<UserResponse[]> {
    return list<UserResponse>(api.get(EQUB_ENDPOINTS.USERS.LIST, { params }));
  },
  async listRoles(): Promise<Array<{ id: string; name: string; permissions?: Array<{ name?: string; slug?: string }> }>> {
    return list(api.get(EQUB_ENDPOINTS.USERS.ROLES));
  },

  // ---- Manager (portfolio role) ----
  async managerGroups(): Promise<EqubGroupResponse[]> {
    return list<EqubGroupResponse>(api.get(EQUB_ENDPOINTS.MANAGER.MY_GROUPS));
  },
  async managerSchemes(): Promise<EqubSchemeResponse[]> {
    return list<EqubSchemeResponse>(api.get(EQUB_ENDPOINTS.MANAGER.MY_SCHEMES));
  },
  async catchUpAmount(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.get(EQUB_ENDPOINTS.MANAGER.CATCH_UP(groupId, memberId)));
  },
};

export type EqubApi = typeof realEqubApi;

// NEXT_PUBLIC_USE_MOCK=true swaps in a seeded in-memory backend with the same
// surface and DTOs, so every page runs the identical code path offline.
export const equbApi: EqubApi = process.env.NEXT_PUBLIC_USE_MOCK === "true" ? mockEqubApi : realEqubApi;
