import { api } from "@/lib/api/client";
import { EQUB_ENDPOINTS } from "@/lib/api/equb-endpoints";
import type {
  ApiEnvelope,
  CreateEqubGroupRequest,
  CreateEqubGuaranteeRequest,
  CreateEqubSchemeRequest,
  EqubAdminDashboardResponse,
  EqubEmergencyDrawResponse,
  EqubGroupResponse,
  EqubGuaranteeResponse,
  EqubMemberResponse,
  EqubRoundResponse,
  EqubDrawPreviewResponse,
  EqubSchemeResponse,
  EqubTakafulTransactionResponse,
  EqubTakafulClaimResponse,
  EqubWinnerResponse,
  LoginRequest,
  LoginResponse,
  MemberRegistrationRequestResponse,
  UpdateEqubSchemeRequest,
  UserResponse,
} from "@/types/equb-api";

// Thin, fully-typed wrappers over the real Equb admin endpoints. Every call
// unwraps the shared APIResponse envelope (`data`). Consumed by services/ekub.ts
// which maps these DTOs into the camelCase view types the pages render.
const unwrap = async <T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> =>
  (await p).data.data;

export const equbApi = {
  // ---- Auth ----
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return unwrap<LoginResponse>(api.post(EQUB_ENDPOINTS.AUTH.LOGIN, payload));
  },

  // ---- Schemes (Tiers) ----
  async listSchemes(params?: Record<string, unknown>): Promise<EqubSchemeResponse[]> {
    return unwrap<EqubSchemeResponse[]>(api.get(EQUB_ENDPOINTS.SCHEMES.LIST, { params }));
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

  // ---- Groups (cycles) ----
  async listGroups(params?: Record<string, unknown>): Promise<EqubGroupResponse[]> {
    return unwrap<EqubGroupResponse[]>(api.get(EQUB_ENDPOINTS.GROUPS.LIST, { params }));
  },
  async getGroup(id: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.get(EQUB_ENDPOINTS.GROUPS.DETAIL(id)));
  },
  async createGroup(body: CreateEqubGroupRequest): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.CREATE, body));
  },
  async updateGroup(id: string, body: Partial<CreateEqubGroupRequest>): Promise<EqubGroupResponse> {
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
  async addMember(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.MEMBERS(groupId), { member_id: memberId }));
  },
  async removeMember(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.delete(EQUB_ENDPOINTS.GROUPS.MEMBER(groupId, memberId)));
  },
  async swapPositions(groupId: string, memberId1: string, memberId2: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.SWAP_POSITIONS(groupId), { member_id_1: memberId1, member_id_2: memberId2 }));
  },
  async dashboard(groupId: string): Promise<EqubAdminDashboardResponse> {
    return unwrap<EqubAdminDashboardResponse>(api.get(EQUB_ENDPOINTS.DASHBOARD(groupId)));
  },
  async listGroupMembers(groupId: string): Promise<EqubMemberResponse[]> {
    return unwrap<EqubMemberResponse[]>(api.get(EQUB_ENDPOINTS.GROUPS.MEMBERS(groupId)));
  },
  async suspendMember(groupId: string, memberId: string, reason: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.SUSPEND_MEMBER(groupId, memberId), { reason }));
  },
  async unsuspendMember(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.GROUPS.UNSUSPEND_MEMBER(groupId, memberId), {}));
  },

  // ---- Rounds / draws ----
  async listRounds(groupId: string): Promise<EqubRoundResponse[]> {
    return unwrap<EqubRoundResponse[]>(api.get(EQUB_ENDPOINTS.GROUPS.ROUNDS(groupId)));
  },
  async getRound(roundId: string): Promise<EqubRoundResponse> {
    return unwrap<EqubRoundResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.DETAIL(roundId)));
  },
  async drawPreview(roundId: string): Promise<EqubDrawPreviewResponse> {
    return unwrap<EqubDrawPreviewResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.DRAW_PREVIEW(roundId)));
  },
  async executeDraw(roundId: string): Promise<EqubRoundResponse> {
    return unwrap<EqubRoundResponse>(api.post(EQUB_ENDPOINTS.ROUNDS.EXECUTE_DRAW(roundId), {}));
  },
  async listWinners(roundId: string): Promise<EqubWinnerResponse[]> {
    return unwrap<EqubWinnerResponse[]>(api.get(EQUB_ENDPOINTS.ROUNDS.WINNERS(roundId)));
  },
  async drawCandidates(drawId: string): Promise<EqubDrawPreviewResponse> {
    return unwrap<EqubDrawPreviewResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.DRAW_CANDIDATES(drawId)));
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
  async processPayout(winnerId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.PAYOUT(winnerId), {}));
  },

  // ---- Hardship / emergency draws ----
  async listEmergencyDraws(groupId: string): Promise<EqubEmergencyDrawResponse[]> {
    return unwrap<EqubEmergencyDrawResponse[]>(api.get(EQUB_ENDPOINTS.EMERGENCY_DRAWS.LIST(groupId)));
  },
  async submitEmergencyDraw(groupId: string, memberId: string, reason: string, evidence?: string): Promise<EqubEmergencyDrawResponse> {
    return unwrap<EqubEmergencyDrawResponse>(
      api.post(EQUB_ENDPOINTS.EMERGENCY_DRAWS.SUBMIT(groupId), { equb_group_id: groupId, member_id: memberId, reason, evidence })
    );
  },
  async approveEmergencyDraw(requestId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.EMERGENCY_DRAWS.APPROVE(requestId), {}));
  },
  async rejectEmergencyDraw(requestId: string, reviewNote: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.EMERGENCY_DRAWS.REJECT(requestId), { review_note: reviewNote }));
  },

  // ---- Takaful ----
  async listTakaful(groupId: string): Promise<EqubTakafulTransactionResponse[]> {
    return unwrap<EqubTakafulTransactionResponse[]>(api.get(EQUB_ENDPOINTS.TAKAFUL.LIST(groupId)));
  },
  async takafulBalance(groupId: string): Promise<{ balance: number }> {
    return unwrap<{ balance: number }>(api.get(EQUB_ENDPOINTS.TAKAFUL.BALANCE(groupId)));
  },
  async distributeSurplus(groupId: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.TAKAFUL.DISTRIBUTE_SURPLUS(groupId), {}));
  },
  async submitTakafulClaim(groupId: string, memberId: string, amount: number, reason: string): Promise<EqubTakafulClaimResponse> {
    return unwrap<EqubTakafulClaimResponse>(
      api.post(EQUB_ENDPOINTS.TAKAFUL.CLAIMS(groupId), { equb_group_id: groupId, member_id: memberId, amount, reason })
    );
  },
  async refundTakaful(groupId: string, reason: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.TAKAFUL.REFUND(groupId), { reason }));
  },

  // ---- Contributions / penalties ----
  async markOverdue(): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.CONTRIBUTIONS.MARK_OVERDUE, {}));
  },

  // ---- Membership approvals ----
  async listRegistrationRequests(params?: Record<string, unknown>): Promise<MemberRegistrationRequestResponse[]> {
    return unwrap<MemberRegistrationRequestResponse[]>(api.get(EQUB_ENDPOINTS.REGISTRATION_REQUESTS.LIST, { params }));
  },
  async approveRegistration(id: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.REGISTRATION_REQUESTS.APPROVE(id), {}));
  },
  async rejectRegistration(id: string, reason: string): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.REGISTRATION_REQUESTS.REJECT(id), { reason }));
  },

  // ---- Staff & roles ----
  async listUsers(params?: Record<string, unknown>): Promise<UserResponse[]> {
    return unwrap<UserResponse[]>(api.get(EQUB_ENDPOINTS.USERS.LIST, { params }));
  },
  async listRoles(): Promise<Array<{ id: string; name: string; permissions?: Array<{ name?: string; slug?: string }> }>> {
    return unwrap(api.get(EQUB_ENDPOINTS.USERS.ROLES));
  },

  // ---- Manager (portfolio role) ----
  async managerGroups(): Promise<EqubGroupResponse[]> {
    return unwrap<EqubGroupResponse[]>(api.get(EQUB_ENDPOINTS.MANAGER.MY_GROUPS));
  },
  async managerSchemes(): Promise<EqubSchemeResponse[]> {
    return unwrap<EqubSchemeResponse[]>(api.get(EQUB_ENDPOINTS.MANAGER.MY_SCHEMES));
  },
  async catchUpAmount(groupId: string, memberId: string): Promise<unknown> {
    return unwrap(api.get(EQUB_ENDPOINTS.MANAGER.CATCH_UP(groupId, memberId)));
  },
};
