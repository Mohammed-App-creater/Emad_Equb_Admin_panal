"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ekubService } from "@/services/ekub";
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

export const useEqub = (id: string) =>
  useQuery({ queryKey: qk.equb(id), queryFn: () => ekubService.getEqub(id), enabled: !!id });

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

export const useAutoCancel = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => ekubService.autoCancel(), onSuccess: () => invEqub(qc) });
};

// ---- Equb members ----
export const useEqubMembers = (equbId: string, status?: string) =>
  useQuery({ queryKey: qk.members(equbId, status), queryFn: () => ekubService.listEqubMembers(equbId, status), enabled: !!equbId });

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

export const useRound = (roundId: string) =>
  useQuery({ queryKey: qk.round(roundId), queryFn: () => ekubService.getRound(roundId), enabled: !!roundId });

export const useDrawPreview = (roundId: string, enabled = true) =>
  useQuery({ queryKey: qk.drawPreview(roundId), queryFn: () => ekubService.getDrawPreview(roundId), enabled: enabled && !!roundId });

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

// ---- Staff / Roles ----
export const useStaff = () =>
  useQuery({ queryKey: ["staff"], queryFn: () => ekubService.listStaff() });

export const useRoles = () =>
  useQuery({ queryKey: ["roles"], queryFn: () => ekubService.listRoles() });
