import { api } from "@/lib/api/client";
import { EQUB_ENDPOINTS } from "@/lib/api/equb-endpoints";
import { mockEqubApi } from "@/lib/mock/mock-equb-api";
import type {
  ApiEnvelope,
  CreateEqubGroupRequest,
  CreateEqubGuaranteeRequest,
  CreateEqubSchemeRequest,
  EqubAdminDashboardResponse,
  CloneEqubGroupRequest,
  CloneEqubGroupResponse,
  EqubContributionAttachmentListResponse,
  EqubContributionAttachmentResponse,
  EqubFeesLedgerResponse,
  FeeLedgerParams,
  EqubAdminFeeGroupResponse,
  EqubAdminFeeMemberResponse,
  EqubAdminFeeRoundResponse,
  EqubDrawCandidateResponse,
  EqubDrawPreviewResponse,
  EqubEmergencyDrawResponse,
  EqubGroupManagerResponse,
  EqubGroupResponse,
  EqubGuaranteeResponse,
  EqubMemberResponse,
  EqubMemberStandingResponse,
  EqubPayInitiatedResponse,
  EqubPayRoundsRequest,
  EqubPayoutResponse,
  AgentSummaryResponse,
  BranchResponse,
  UserRoleResponse,
  ListStaffParams,
  ListTakafulParams,
  CollectProof,
  PaymentUpdateStatusRequest,
  EqubCatchUpPaymentResponse,
  EqubCollectionsSummaryResponse,
  MyCollectionsParams,
  AdminCollectionsParams,
  EqubRoundResponse,
  EqubSchemeResponse,
  EqubTakafulClaimResponse,
  EqubTakafulSettlementResponse,
  EqubTakafulTransactionResponse,
  EqubWinnerResponse,
  ListEqubGroupsParams,
  ListEqubMembersParams,
  ListEqubRoundsParams,
  PaginationMeta,
  LoginRequest,
  LoginResponse,
  MemberRegistrationRequestResponse,
  MemberSummaryResponse,
  SaccoMemberResponse,
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

/** One page of a list plus the envelope's pagination meta. */
export interface PagedResult<T> { items: T[]; meta: PaginationMeta }
const paged = async <T>(p: Promise<{ data: ApiEnvelope<T[] | null> }>, page: number, perPage: number): Promise<PagedResult<T>> => {
  const env = (await p).data;
  const items = env.data ?? [];
  const meta = env.meta ?? { page, per_page: perPage, total: items.length, total_pages: 1 };
  return { items, meta };
};

const realEqubApi = {
  // ---- Auth ----
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return unwrap<LoginResponse>(api.post(EQUB_ENDPOINTS.AUTH.LOGIN, payload));
  },

  // ---- Schemes (Equb Categories) ----
  async listSchemes(params?: { status?: string; search?: string; page?: number; per_page?: number }): Promise<EqubSchemeResponse[]> {
    return list<EqubSchemeResponse>(api.get(EQUB_ENDPOINTS.SCHEMES.LIST, { params }));
  },
  async listSchemesPage(params: { status?: string; search?: string; page: number; per_page: number }): Promise<PagedResult<EqubSchemeResponse>> {
    return paged<EqubSchemeResponse>(api.get(EQUB_ENDPOINTS.SCHEMES.LIST, { params }), params.page, params.per_page);
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
  async listGroupsPage(params: ListEqubGroupsParams & { page: number; per_page: number }): Promise<PagedResult<EqubGroupResponse>> {
    return paged<EqubGroupResponse>(api.get(EQUB_ENDPOINTS.GROUPS.LIST, { params }), params.page, params.per_page);
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
  async assignManager(id: string, managerUserId: string): Promise<EqubGroupManagerResponse> {
    return unwrap<EqubGroupManagerResponse>(api.put(EQUB_ENDPOINTS.GROUPS.MANAGER(id), { manager_user_id: managerUserId }));
  },
  async cloneGroup(id: string, body: CloneEqubGroupRequest): Promise<CloneEqubGroupResponse> {
    return unwrap<CloneEqubGroupResponse>(api.post(EQUB_ENDPOINTS.GROUPS.CLONE(id), body));
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
  async listGroupMembersPage(groupId: string, params: ListEqubMembersParams & { page: number; per_page: number }): Promise<PagedResult<EqubMemberResponse>> {
    return paged<EqubMemberResponse>(api.get(EQUB_ENDPOINTS.GROUPS.MEMBERS(groupId), { params }), params.page, params.per_page);
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

  async getMember(id: string): Promise<SaccoMemberResponse> {
    return unwrap<SaccoMemberResponse>(api.get(EQUB_ENDPOINTS.MEMBERS.DETAIL(id)));
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
  async refreshReadiness(): Promise<unknown> {
    return unwrap(api.post(EQUB_ENDPOINTS.ROUNDS.REFRESH_READINESS, {}));
  },

  // ---- SACCO-wide fee ledger ----
  async feeLedger(params: FeeLedgerParams): Promise<EqubFeesLedgerResponse> {
    return unwrap<EqubFeesLedgerResponse>(api.get(EQUB_ENDPOINTS.FEES, { params }));
  },

  // ---- Contribution attachments ----
  async listRoundAttachments(roundId: string): Promise<EqubContributionAttachmentListResponse> {
    return unwrap<EqubContributionAttachmentListResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.ATTACHMENTS(roundId)));
  },
  async listContributionAttachments(contributionId: string): Promise<EqubContributionAttachmentListResponse> {
    return unwrap<EqubContributionAttachmentListResponse>(api.get(EQUB_ENDPOINTS.CONTRIBUTION_ATTACHMENTS.LIST(contributionId)));
  },
  async uploadContributionAttachment(contributionId: string, file: File, description?: string): Promise<EqubContributionAttachmentResponse> {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return unwrap<EqubContributionAttachmentResponse>(api.post(EQUB_ENDPOINTS.CONTRIBUTION_ATTACHMENTS.UPLOAD(contributionId), form, { headers: { "Content-Type": "multipart/form-data" } }));
  },
  async deleteContributionAttachment(contributionId: string, attachmentId: string): Promise<unknown> {
    return unwrap(api.delete(EQUB_ENDPOINTS.CONTRIBUTION_ATTACHMENTS.DELETE(contributionId, attachmentId)));
  },
  /** Fetches the file as a blob (the list's file_url is short-lived). */
  async downloadContributionAttachment(contributionId: string, attachmentId: string): Promise<Blob> {
    const res = await api.get(EQUB_ENDPOINTS.CONTRIBUTION_ATTACHMENTS.DOWNLOAD(contributionId, attachmentId), { responseType: "blob" });
    return res.data as Blob;
  },

  // ---- Admin fee ledgers ----
  async groupAdminFees(groupId: string): Promise<EqubAdminFeeGroupResponse> {
    return unwrap<EqubAdminFeeGroupResponse>(api.get(EQUB_ENDPOINTS.GROUPS.ADMIN_FEES(groupId)));
  },
  async roundAdminFees(roundId: string): Promise<EqubAdminFeeRoundResponse> {
    return unwrap<EqubAdminFeeRoundResponse>(api.get(EQUB_ENDPOINTS.ROUNDS.ADMIN_FEES(roundId)));
  },
  async memberAdminFees(groupId: string, memberId: string): Promise<EqubAdminFeeMemberResponse> {
    return unwrap<EqubAdminFeeMemberResponse>(api.get(EQUB_ENDPOINTS.GROUPS.MEMBER_ADMIN_FEES(groupId, memberId)));
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
  async approveWinner(winnerId: string): Promise<EqubWinnerResponse> {
    return unwrap<EqubWinnerResponse>(api.post(EQUB_ENDPOINTS.APPROVE_WINNER(winnerId), {}));
  },
  async processPayout(winnerId: string): Promise<EqubPayoutResponse> {
    return unwrap<EqubPayoutResponse>(api.post(EQUB_ENDPOINTS.PAYOUT(winnerId), {}));
  },

  // ---- Hardship / emergency draws ----
  async listEmergencyDraws(groupId: string, params?: { status?: string }): Promise<EqubEmergencyDrawResponse[]> {
    return list<EqubEmergencyDrawResponse>(api.get(EQUB_ENDPOINTS.EMERGENCY_DRAWS.LIST(groupId), { params: { ...params, page: 1, per_page: 200 } }));
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
  async listTakaful(groupId: string, params?: ListTakafulParams): Promise<EqubTakafulTransactionResponse[]> {
    // Round and type filter on the server; the rest is filtered and paged in the browser, so ask for all of it.
    return list<EqubTakafulTransactionResponse>(api.get(EQUB_ENDPOINTS.TAKAFUL.LIST(groupId), { params: { ...params, page: 1, per_page: 1000 } }));
  },
  async listTakafulPage(groupId: string, page: number, perPage: number): Promise<PagedResult<EqubTakafulTransactionResponse>> {
    return paged<EqubTakafulTransactionResponse>(api.get(EQUB_ENDPOINTS.TAKAFUL.LIST(groupId), { params: { page, per_page: perPage } }), page, perPage);
  },
  async takafulBalance(groupId: string): Promise<{ balance: string }> {
    return unwrap<{ balance: string }>(api.get(EQUB_ENDPOINTS.TAKAFUL.BALANCE(groupId)));
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
  /** GET /agents — staff agents (the manager app's users). */
  async listAgents(params: { search?: string; status?: string; page?: number; per_page?: number }): Promise<AgentSummaryResponse[]> {
    return list<AgentSummaryResponse>(api.get(EQUB_ENDPOINTS.AGENTS.LIST, { params }));
  },
  async listAgentsPage(params: ListStaffParams): Promise<PagedResult<AgentSummaryResponse>> {
    return paged<AgentSummaryResponse>(api.get(EQUB_ENDPOINTS.AGENTS.LIST, { params: { ...params, sort: "created_at", order: "desc" } }), params.page, params.per_page);
  },
  /** GET /agents/{id} — the only agent endpoint that includes roles. */
  async getAgent(id: string): Promise<AgentSummaryResponse> {
    return unwrap<AgentSummaryResponse>(api.get(EQUB_ENDPOINTS.AGENTS.DETAIL(id)));
  },
  async listUsersPage(params: ListStaffParams): Promise<PagedResult<UserResponse>> {
    return paged<UserResponse>(api.get(EQUB_ENDPOINTS.USERS.LIST, { params: { ...params, sort: "created_at", order: "desc" } }), params.page, params.per_page);
  },
  /** GET /branches — for the branch filters. */
  async listBranches(): Promise<BranchResponse[]> {
    return list<BranchResponse>(api.get(EQUB_ENDPOINTS.BRANCHES, { params: { page: 1, limit: 200 } }));
  },
  /** GET /user-roles — for the staff role filter. */
  async listUserRoles(): Promise<UserRoleResponse[]> {
    return list<UserRoleResponse>(api.get(EQUB_ENDPOINTS.USER_ROLES.LIST, { params: { page: 1, limit: 200 } }));
  },

  // ---- Recording a contribution for a member ----
  /**
   * Record a collection. With `proof` the request goes as multipart/form-data
   * (round_ids repeated, method, reference, file, description) so the slip is
   * filed against every contribution it covers in the same call.
   */
  async collectContribution(groupId: string, memberId: string, body: EqubPayRoundsRequest, proof?: CollectProof): Promise<EqubPayInitiatedResponse> {
    if (!proof) return unwrap<EqubPayInitiatedResponse>(api.post(EQUB_ENDPOINTS.MANAGER.COLLECT(groupId, memberId), body));
    const form = new FormData();
    // Per the backend: round_ids as one JSON array field; the file's
    // description doubles as the collection's description.
    form.append("round_ids", JSON.stringify(body.round_ids));
    if (body.is_catch_up) form.append("is_catch_up", "true");
    if (body.method) form.append("method", body.method);
    if (body.reference) form.append("reference", body.reference);
    form.append("file", proof.file);
    const description = proof.description || body.description;
    if (description) form.append("description", description);
    return unwrap<EqubPayInitiatedResponse>(api.post(EQUB_ENDPOINTS.MANAGER.COLLECT(groupId, memberId), form, { headers: { "Content-Type": "multipart/form-data" } }));
  },
  async updatePaymentStatus(paymentId: string, body: PaymentUpdateStatusRequest): Promise<unknown> {
    return unwrap(api.patch(EQUB_ENDPOINTS.PAYMENTS.STATUS(paymentId), body));
  },
  async memberStanding(groupId: string, memberId: string): Promise<EqubMemberStandingResponse> {
    return unwrap<EqubMemberStandingResponse>(api.get(EQUB_ENDPOINTS.MANAGER.STANDING(groupId, memberId)));
  },

  // ---- Manager (portfolio role) ----
  async managerGroups(): Promise<EqubGroupResponse[]> {
    return list<EqubGroupResponse>(api.get(EQUB_ENDPOINTS.MANAGER.MY_GROUPS));
  },
  async managerSchemes(): Promise<EqubSchemeResponse[]> {
    return list<EqubSchemeResponse>(api.get(EQUB_ENDPOINTS.MANAGER.MY_SCHEMES));
  },
  async catchUpAmount(groupId: string, memberId: string): Promise<EqubCatchUpPaymentResponse> {
    return unwrap<EqubCatchUpPaymentResponse>(api.get(EQUB_ENDPOINTS.MANAGER.CATCH_UP(groupId, memberId)));
  },
  async myCollections(params?: MyCollectionsParams): Promise<EqubCollectionsSummaryResponse> {
    return unwrap<EqubCollectionsSummaryResponse>(api.get(EQUB_ENDPOINTS.MANAGER.MY_COLLECTIONS, { params }));
  },
  /** Admin: collections across every agent, with paging. */
  async adminCollections(params?: AdminCollectionsParams): Promise<EqubCollectionsSummaryResponse> {
    return unwrap<EqubCollectionsSummaryResponse>(api.get(EQUB_ENDPOINTS.COLLECTIONS, { params }));
  },
};

export type EqubApi = typeof realEqubApi;

// NEXT_PUBLIC_USE_MOCK=true swaps in a seeded in-memory backend with the same
// surface and DTOs, so every page runs the identical code path offline.
export const equbApi: EqubApi = process.env.NEXT_PUBLIC_USE_MOCK === "true" ? mockEqubApi : realEqubApi;
