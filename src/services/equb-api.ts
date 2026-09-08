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
  EqubWinnerResponse,
  LoginRequest,
  LoginResponse,
  MemberRegistrationRequestResponse,
  UpdateEqubSchemeRequest,
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
  async updateScheme(id: string, body: UpdateEqubSchemeRequest): Promise<EqubSchemeResponse> {
    return unwrap<EqubSchemeResponse>(api.put(EQUB_ENDPOINTS.SCHEMES.UPDATE(id), body));
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
  async activateGroup(id: string, startDate: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.ACTIVATE(id), { start_date: startDate }));
  },
  async cancelGroup(id: string, reason: string): Promise<EqubGroupResponse> {
    return unwrap<EqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.CANCEL(id), { reason }));
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
};
