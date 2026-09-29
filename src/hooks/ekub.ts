"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ekubService } from "@/services/ekub";
import { useAuthStore } from "@/lib/auth/auth-store";
import type {
  ApplicationStatus,
  EqubCategoryInput,
  EqubInput,
  EqubListFilters,
  EqubUpdateInput,
  GuaranteeInput,
} from "@/types/ekub";

type QC = ReturnType<typeof useQueryClient>;

// Query keys, centralised so invalidations stay consistent.
export const qk = {
  categories: ["categories"] as const,
  equbs: (filters?: EqubListFilters) => ["equbs", filters ?? {}] as const,
  equb: (id: string) => ["equb", id] as const,
  dashboard: (id: string) => ["equb-dashboard", id] as const,
  members: (id: string, status?: string) => ["equb-members", id, status ?? "all"] as const,
  memberSearch: (q: string) => ["member-search", q] as const,
  rounds: (id: string, status?: string) => ["equb-rounds", id, status ?? "all"] as const,
  round: (roundId: string) => ["round", roundId] as const,
  drawPreview: (roundId: string) => ["draw-preview", roundId] as const,
  roundWinners: (roundId: string) => ["round-winners", roundId] as const,
  equbWinners: (id: string) => ["equb-winners", id] as const,
  emergency: (id: string) => ["equb-emergency", id] as const,
  takaful: (id: string) => ["equb-takaful", id] as const,
  takafulBalance: (id: string) => ["equb-takaful-balance", id] as const,
  adminFees: (id: string) => ["equb-admin-fees", id] as const,
  roundAdminFees: (roundId: string) => ["round-admin-fees", roundId] as const,
  memberAdminFees: (id: string, memberId: string) => ["member-admin-fees", id, memberId] as const,
};

// ---- Equb Categories ----
export const useCategories = (params?: { status?: string; search?: string }) =>
  useQuery({ queryKey: [...qk.categories, params ?? {}], queryFn: () => ekubService.listCategories(params) });

const invCategories = (qc: QC) => {
  qc.invalidateQueries({ queryKey: qk.categories });
  qc.invalidateQueries({ queryKey: ["equbs"] });
};
export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: EqubCategoryInput) => ekubService.createCategory(input), onSuccess: () => invCategories(qc) });
};
export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; input: EqubCategoryInput }) => ekubService.updateCategory(v.id, v.input), onSuccess: () => invCategories(qc) });
};
export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => ekubService.deleteCategory(id), onSuccess: () => invCategories(qc) });
};

// ---- Equbs ----
export const useEqubs = (filters?: EqubListFilters) =>
  useQuery({ queryKey: qk.equbs(filters), queryFn: () => ekubService.listEqubs(filters) });

// Server-paged lists: keys extend the unpaged ones so the same invalidations apply.
export const useEqubsPage = (filters: EqubListFilters, page: number, perPage: number) =>
  useQuery({ queryKey: [...qk.equbs(filters), "page", page, perPage], queryFn: () => ekubService.listEqubsPage(filters, page, perPage), placeholderData: keepPreviousData });
export const useCategoriesPage = (params: { status?: string; search?: string }, page: number, perPage: number) =>
  useQuery({ queryKey: [...qk.categories, params, "page", page, perPage], queryFn: () => ekubService.listCategoriesPage(params, page, perPage), placeholderData: keepPreviousData });
export const useEqubMembersPage = (equbId: string, status: string | undefined, page: number, perPage: number) =>
  useQuery({ queryKey: [...qk.members(equbId, status), "page", page, perPage], queryFn: () => ekubService.listEqubMembersPage(equbId, status, page, perPage), enabled: !!equbId, placeholderData: keepPreviousData });
export const useTakafulPage = (equbId: string, page: number, perPage: number) =>
  useQuery({ queryKey: [...qk.takaful(equbId), "page", page, perPage], queryFn: () => ekubService.listTakafulPage(equbId, page, perPage), enabled: !!equbId, placeholderData: keepPreviousData });
export const useAgentsPage = (search: string | undefined, page: number, perPage: number) =>
  useQuery({ queryKey: ["agents", "page", search ?? "", page, perPage], queryFn: () => ekubService.listAgentsPage(search, page, perPage), placeholderData: keepPreviousData });
export const useAgent = (id: string) =>
  useQuery({ queryKey: ["agent", id], queryFn: () => ekubService.getAgent(id), enabled: !!id });
/** Fee-ledger lines for several Equbs at once (one request per Equb). */
export const useFeeLedgersMany = (equbIds: string[]) =>
  useQueries({ queries: equbIds.map((id) => ({ queryKey: ["fee-ledger", { equbId: id }, 1, 1000], queryFn: () => ekubService.getFeeLedger({ equbId: id }, 1, 1000) })) });

export const useStaffPage = (search: string | undefined, page: number, perPage: number) =>
  useQuery({ queryKey: ["staff", "page", search ?? "", page, perPage], queryFn: () => ekubService.listStaffPage(search, page, perPage), placeholderData: keepPreviousData });

export const useEqub = (id: string) =>
  useQuery({ queryKey: qk.equb(id), queryFn: () => ekubService.getEqub(id), enabled: !!id });

/** Admin dashboards of several Equbs at once (portfolio Dashboard page). */
export const useEqubDashboards = (ids: string[]) =>
  useQueries({
    queries: ids.map((id) => ({ queryKey: qk.dashboard(id), queryFn: () => ekubService.getEqubDashboard(id), retry: false })),
  });

export const useEqubDashboard = (id: string | null | undefined) =>
  useQuery({ queryKey: qk.dashboard(id ?? ""), queryFn: () => ekubService.getEqubDashboard(id!), enabled: !!id });

const invEqub = (qc: QC, id?: string) => {
  qc.invalidateQueries({ queryKey: ["equbs"] });
  if (id) {
    qc.invalidateQueries({ queryKey: qk.equb(id) });
    qc.invalidateQueries({ queryKey: qk.dashboard(id) });
    qc.invalidateQueries({ queryKey: ["equb-rounds", id] });
  }
};
export const useCreateEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: EqubInput) => ekubService.createEqub(v), onSuccess: () => invEqub(qc) });
};
export const useUpdateEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; input: EqubUpdateInput }) => ekubService.updateEqub(v.id, v.input), onSuccess: (_d, v) => invEqub(qc, v.id) });
};
export const useActivateEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; startDate: string }) => ekubService.activateEqub(v.id, v.startDate), onSuccess: (_d, v) => invEqub(qc, v.id) });
};
export const useCancelEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; reason: string }) => ekubService.cancelEqub(v.id, v.reason), onSuccess: (_d, v) => invEqub(qc, v.id) });
};
export const useExtendEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; additionalRounds: number; reason: string }) => ekubService.extendEqub(v.id, v.additionalRounds, v.reason), onSuccess: (_d, v) => invEqub(qc, v.id) });
};
export const useDeleteEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => ekubService.deleteEqub(id), onSuccess: () => invEqub(qc) });
};
export const useAssignManager = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; managerUserId: string }) => ekubService.assignManager(v.id, v.managerUserId), onSuccess: (_d, v) => invEqub(qc, v.id) });
};
export const useStaffUserSearch = (query: string, enabled = true) =>
  useQuery({ queryKey: ["staff-user-search", query], queryFn: () => ekubService.searchStaffUsers(query), enabled });

export const useCloneEqub = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; input: import("@/types/ekub").CloneEqubInput }) => ekubService.cloneEqub(v.id, v.input), onSuccess: () => invEqub(qc) });
};
export const useAutoCancel = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => ekubService.autoCancel(), onSuccess: () => invEqub(qc) });
};

// ---- Equb members ----
export const useEqubMembers = (equbId: string, status?: string) =>
  useQuery({ queryKey: qk.members(equbId, status), queryFn: () => ekubService.listEqubMembers(equbId, status), enabled: !!equbId });

/** Rosters for several Equbs at once (names for cross-Equb lists). */
export const useEqubMembersMany = (equbIds: string[]) =>
  useQueries({ queries: equbIds.map((id) => ({ queryKey: qk.members(id, undefined), queryFn: () => ekubService.listEqubMembers(id, undefined) })) });

export const useMemberProfile = (memberId: string) =>
  useQuery({ queryKey: ["member-profile", memberId], queryFn: () => ekubService.getMemberProfile(memberId), enabled: !!memberId, retry: false });

export const useMemberSearch = (query: string) =>
  useQuery({ queryKey: qk.memberSearch(query), queryFn: () => ekubService.searchMembers(query), enabled: query.trim().length >= 2 });

const invMembers = (qc: QC, equbId: string) => {
  qc.invalidateQueries({ queryKey: ["equb-members", equbId] });
  qc.invalidateQueries({ queryKey: qk.equb(equbId) });
  qc.invalidateQueries({ queryKey: qk.dashboard(equbId) });
  qc.invalidateQueries({ queryKey: ["equbs"] });
};
export const useAddMember = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { equbId: string; memberId: string }) => ekubService.addMember(v.equbId, v.memberId), onSuccess: (_d, v) => invMembers(qc, v.equbId) });
};
export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { equbId: string; memberId: string }) => ekubService.removeMember(v.equbId, v.memberId), onSuccess: (_d, v) => invMembers(qc, v.equbId) });
};
export const useSetSuspended = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; memberId: string; suspend: boolean; reason?: string }) => ekubService.setMemberSuspended(v.equbId, v.memberId, v.suspend, v.reason),
    onSuccess: (_d, v) => invMembers(qc, v.equbId),
  });
};
export const useSwapPositions = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { equbId: string; a: string; b: string }) => ekubService.swapPositions(v.equbId, v.a, v.b), onSuccess: (_d, v) => invMembers(qc, v.equbId) });
};

// ---- Rounds / draws ----
export const useRounds = (equbId: string, status?: string) =>
  useQuery({ queryKey: qk.rounds(equbId, status), queryFn: () => ekubService.listRounds(equbId, status), enabled: !!equbId });

/** Full detail (member payments, totals) of several rounds; the list endpoint only carries counts. */
export const useRoundDetails = (roundIds: string[]) =>
  useQueries({
    queries: roundIds.map((id) => ({ queryKey: qk.round(id), queryFn: () => ekubService.getRound(id) })),
  });

export const useRound = (roundId: string) =>
  useQuery({ queryKey: qk.round(roundId), queryFn: () => ekubService.getRound(roundId), enabled: !!roundId });

export const useDrawPreview = (roundId: string, enabled = true) =>
  useQuery({ queryKey: qk.drawPreview(roundId), queryFn: () => ekubService.getDrawPreview(roundId), enabled: enabled && !!roundId });

export const useRefreshReadiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ekubService.refreshReadiness(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equb-rounds"] });
      qc.invalidateQueries({ queryKey: ["round"] });
      qc.invalidateQueries({ queryKey: ["draw-preview"] });
      qc.invalidateQueries({ queryKey: ["equb-dashboard"] });
    },
  });
};

// ---- Recording a contribution ----
/**
 * Whether the signed-in user runs this Equb. Standing, catch-up and collect
 * live under /equb/manager/my-groups/** and the backend answers 403 for
 * anyone else, admins included. `isManager` is undefined until the Equb loads.
 */
export const useIsEqubManager = (equbId: string) => {
  const userId = useAuthStore((s) => s.user?.id);
  // A super admin may record for any Equb; the backend still has the final say
  // and its error is shown if it refuses.
  const isSuperAdmin = useAuthStore((s) =>
    (s.user?.roles ?? []).some((r) => /super\s*admin/i.test(r.name)) || s.permissions.includes("equb:admin")
  );
  const { data: equb } = useEqub(equbId);
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return { isManager: true as boolean | undefined, isSuperAdmin, managerName: equb?.manager?.fullName };
  const isManager = isSuperAdmin ? true : equb ? !!userId && equb.manager?.userId === userId : undefined;
  return { isManager, isSuperAdmin, managerName: equb?.manager?.fullName };
};

export const useMemberStanding = (equbId: string, memberId: string | null, enabled = true) =>
  useQuery({ queryKey: ["member-standing", equbId, memberId ?? ""], queryFn: () => ekubService.getMemberStanding(equbId, memberId!), enabled: enabled && !!equbId && !!memberId, retry: false });

// A payment moves round totals, readiness, fees, takaful and standing.
const invAfterPayment = (qc: QC, equbId: string) => {
  for (const key of [["equb-rounds", equbId], ["round"], ["draw-preview"], ["round-admin-fees"], ["equb-members", equbId], ["member-standing", equbId], ["member-admin-fees", equbId], qk.adminFees(equbId), qk.dashboard(equbId), qk.takaful(equbId), qk.takafulBalance(equbId), ["payments"], ["my-collections"], ["catch-up", equbId], ["round-attachments"], ["fee-ledger"]]) {
    qc.invalidateQueries({ queryKey: key as readonly unknown[] });
  }
};
export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; memberId: string; input: import("@/types/ekub").RecordPaymentInput }) => ekubService.recordPayment(v.equbId, v.memberId, v.input),
    onSuccess: (_d, v) => invAfterPayment(qc, v.equbId),
  });
};


export const useConfirmPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId?: string; paymentId: string; notes?: string }) => ekubService.confirmPayment(v.paymentId, v.notes),
    onSuccess: (_d, v) => {
      if (v.equbId) invAfterPayment(qc, v.equbId);
      else for (const key of [["equb-rounds"], ["round"], ["draw-preview"], ["round-admin-fees"], ["equb-members"], ["member-standing"], ["equb-admin-fees"], ["equb-dashboard"], ["my-collections"], ["catch-up"], ["fee-ledger"]]) qc.invalidateQueries({ queryKey: key });
    },
  });
};
export const useRejectPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { paymentId: string; reason: string }) => ekubService.rejectPayment(v.paymentId, v.reason),
    onSuccess: () => { for (const key of [["fee-ledger"], ["my-collections"], ["equb-rounds"], ["round"]]) qc.invalidateQueries({ queryKey: key }); },
  });
};

export const useCatchUp = (equbId: string, memberId: string | null, enabled = true) =>
  useQuery({ queryKey: ["catch-up", equbId, memberId ?? ""], queryFn: () => ekubService.getCatchUp(equbId, memberId!), enabled: enabled && !!equbId && !!memberId, retry: false });

export const useMyCollections = (filters: import("@/types/ekub").CollectionsFilters) =>
  useQuery({ queryKey: ["my-collections", filters], queryFn: () => ekubService.listMyCollections(filters) });

// ---- SACCO-wide fee ledger ----
export const useFeeLedger = (filters: import("@/types/ekub").FeeLedgerFilters, page: number, perPage: number) =>
  useQuery({ queryKey: ["fee-ledger", filters, page, perPage], queryFn: () => ekubService.getFeeLedger(filters, page, perPage), placeholderData: keepPreviousData });

// ---- Contribution attachments ----
export const useRoundAttachments = (roundId: string) =>
  useQuery({ queryKey: ["round-attachments", roundId], queryFn: () => ekubService.listRoundAttachments(roundId), enabled: !!roundId, staleTime: 60_000 });
export const useUploadAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { roundId: string; contributionId: string; file: File; description?: string }) => ekubService.uploadAttachment(v.contributionId, v.file, v.description),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["round-attachments", v.roundId] }),
  });
};
export const useDeleteAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { roundId: string; contributionId: string; attachmentId: string }) => ekubService.deleteAttachment(v.contributionId, v.attachmentId),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["round-attachments", v.roundId] }),
  });
};

// ---- Admin fee ledgers ----
export const useEqubAdminFees = (equbId: string) =>
  useQuery({ queryKey: qk.adminFees(equbId), queryFn: () => ekubService.getEqubAdminFees(equbId), enabled: !!equbId });
/** Admin-fee ledgers of several Equbs at once (general Admin fees page). */
export const useEqubAdminFeesMany = (equbIds: string[]) =>
  useQueries({
    queries: equbIds.map((id) => ({ queryKey: qk.adminFees(id), queryFn: () => ekubService.getEqubAdminFees(id) })),
  });
export const useRoundAdminFees = (roundId: string) =>
  useQuery({ queryKey: qk.roundAdminFees(roundId), queryFn: () => ekubService.getRoundAdminFees(roundId), enabled: !!roundId });
export const useMemberAdminFees = (equbId: string, memberId: string | null) =>
  useQuery({ queryKey: qk.memberAdminFees(equbId, memberId ?? ""), queryFn: () => ekubService.getMemberAdminFees(equbId, memberId!), enabled: !!equbId && !!memberId });

export const useExecuteDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { roundId: string; equbId: string }) => ekubService.executeDraw(v.roundId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.round(v.roundId) });
      qc.invalidateQueries({ queryKey: qk.drawPreview(v.roundId) });
      qc.invalidateQueries({ queryKey: qk.roundWinners(v.roundId) });
      qc.invalidateQueries({ queryKey: ["equb-rounds", v.equbId] });
      qc.invalidateQueries({ queryKey: qk.equbWinners(v.equbId) });
      qc.invalidateQueries({ queryKey: qk.dashboard(v.equbId) });
    },
  });
};

// ---- Winners / guarantees / payouts ----
export const useRoundWinners = (roundId: string, roundNumber?: number, enabled = true) =>
  useQuery({ queryKey: qk.roundWinners(roundId), queryFn: () => ekubService.listRoundWinners(roundId, roundNumber), enabled: enabled && !!roundId });

export const useEqubWinners = (equbId: string) =>
  useQuery({ queryKey: qk.equbWinners(equbId), queryFn: () => ekubService.listEqubWinners(equbId), enabled: !!equbId });

/** Winners for several Equbs at once (the approvals queue). */
export const useEqubWinnersMany = (equbIds: string[]) =>
  useQueries({ queries: equbIds.map((id) => ({ queryKey: qk.equbWinners(id), queryFn: () => ekubService.listEqubWinners(id) })) });

const invWinners = (qc: QC, equbId: string, roundId?: string) => {
  qc.invalidateQueries({ queryKey: qk.equbWinners(equbId) });
  qc.invalidateQueries({ queryKey: qk.dashboard(equbId) });
  if (roundId) qc.invalidateQueries({ queryKey: qk.roundWinners(roundId) });
  else qc.invalidateQueries({ queryKey: ["round-winners"] });
};
export const useCreateGuarantee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; roundId?: string; winnerId: string; input: GuaranteeInput }) => ekubService.createGuarantee(v.winnerId, v.input),
    onSuccess: (_d, v) => invWinners(qc, v.equbId, v.roundId),
  });
};
export const useApproveGuarantee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; roundId?: string; guaranteeId: string }) => ekubService.approveGuarantee(v.guaranteeId),
    onSuccess: (_d, v) => invWinners(qc, v.equbId, v.roundId),
  });
};
export const useRejectGuarantee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; roundId?: string; guaranteeId: string; note: string }) => ekubService.rejectGuarantee(v.guaranteeId, v.note),
    onSuccess: (_d, v) => invWinners(qc, v.equbId, v.roundId),
  });
};
export const useApproveWinner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; roundId?: string; winnerId: string }) => ekubService.approveWinner(v.winnerId),
    onSuccess: (_d, v) => invWinners(qc, v.equbId, v.roundId),
  });
};
export const useProcessPayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; roundId?: string; winnerId: string }) => ekubService.processPayout(v.winnerId),
    onSuccess: (_d, v) => invWinners(qc, v.equbId, v.roundId),
  });
};

// ---- Hardship early-turn (emergency draws) ----
export const useEmergencyDraws = (equbId: string) =>
  useQuery({ queryKey: qk.emergency(equbId), queryFn: () => ekubService.listEmergencyDraws(equbId), enabled: !!equbId });

/** Hardship requests for several Equbs at once (the approvals queue). */
export const useEmergencyDrawsMany = (equbIds: string[]) =>
  useQueries({ queries: equbIds.map((id) => ({ queryKey: qk.emergency(id), queryFn: () => ekubService.listEmergencyDraws(id) })) });

export const useDecideEmergencyDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; id: string; decision: "approve" | "reject"; note?: string }) => ekubService.decideEmergencyDraw(v.id, v.decision, v.note),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.emergency(v.equbId) }),
  });
};
export const useSubmitEmergencyDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; memberId: string; reason: string; evidence?: string }) => ekubService.submitEmergencyDraw(v.equbId, v.memberId, v.reason, v.evidence),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.emergency(v.equbId) }),
  });
};

// ---- Takaful ----
export const useTakaful = (equbId: string) =>
  useQuery({ queryKey: qk.takaful(equbId), queryFn: () => ekubService.listTakaful(equbId), enabled: !!equbId });
export const useTakafulBalance = (equbId: string) =>
  useQuery({ queryKey: qk.takafulBalance(equbId), queryFn: () => ekubService.getTakafulBalance(equbId), enabled: !!equbId });

/** Takaful ledgers of several Equbs at once (Dashboard fund movements). */
export const useTakafulLedgers = (equbIds: string[]) =>
  useQueries({
    queries: equbIds.map((id) => ({ queryKey: qk.takaful(id), queryFn: () => ekubService.listTakaful(id) })),
  });

/** Takaful balance of several Equbs at once (general Takaful page). */
export const useTakafulBalances = (equbIds: string[]) =>
  useQueries({
    queries: equbIds.map((id) => ({ queryKey: qk.takafulBalance(id), queryFn: () => ekubService.getTakafulBalance(id) })),
  });

const invTakaful = (qc: QC, equbId: string) => {
  qc.invalidateQueries({ queryKey: qk.takaful(equbId) });
  qc.invalidateQueries({ queryKey: qk.takafulBalance(equbId) });
  qc.invalidateQueries({ queryKey: qk.dashboard(equbId) });
};
export const useDistributeSurplus = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (equbId: string) => ekubService.distributeSurplus(equbId), onSuccess: (_d, equbId) => invTakaful(qc, equbId) });
};
export const useSubmitTakafulClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { equbId: string; memberId: string; amount: number; reason: string }) => ekubService.submitTakafulClaim(v.equbId, v.memberId, v.amount, v.reason),
    onSuccess: (_d, v) => invTakaful(qc, v.equbId),
  });
};
export const useRefundTakaful = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { equbId: string; reason: string }) => ekubService.refundTakaful(v.equbId, v.reason), onSuccess: (_d, v) => invTakaful(qc, v.equbId) });
};

// ---- Contributions (global admin op) ----
export const useMarkOverdue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ekubService.markOverdue(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equb-rounds"] });
      qc.invalidateQueries({ queryKey: ["round"] });
      qc.invalidateQueries({ queryKey: ["equb-members"] });
      qc.invalidateQueries({ queryKey: ["equb-dashboard"] });
    },
  });
};

// ---- Applications ----
export const useApplications = (params: { status?: ApplicationStatus | "all"; search?: string }) =>
  useQuery({ queryKey: ["applications", params], queryFn: () => ekubService.listApplications(params) });

export const useDecideApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; decision: "accept" | "reject"; reason?: string }) =>
      ekubService.decideApplication(v.id, v.decision, v.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
};

// ---- Payments ----
export const usePayments = (params: { timing?: string; search?: string }) =>
  useQuery({ queryKey: ["payments", params], queryFn: () => ekubService.listPayments(params) });

export const useFlagOutage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.flagOutage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
};

export const useReconciliation = () =>
  useQuery({ queryKey: ["reconciliation"], queryFn: () => ekubService.listReconciliation() });

export const useReconcile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.reconcile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliation"] }),
  });
};

// ---- Disputes ----
export const useDisputes = () =>
  useQuery({ queryKey: ["disputes"], queryFn: () => ekubService.listDisputes() });

export const useEscalateDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.escalateDispute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
};

export const useResolveDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; resolution: string; boardDecision: string }) =>
      ekubService.resolveDispute(v.id, v.resolution, v.boardDecision),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
};

// ---- Staff ----
export const useStaff = () =>
  useQuery({ queryKey: ["staff"], queryFn: () => ekubService.listStaff() });

