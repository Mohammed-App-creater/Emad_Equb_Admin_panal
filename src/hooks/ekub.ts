"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ekubService } from "@/services/ekub";
import { useEqubStore } from "@/store/equb.store";
import type { ApplicationStatus, Tier } from "@/types/ekub";

// ---- Groups / cycles ----
export const useGroups = () =>
  useQuery({ queryKey: ["groups"], queryFn: () => ekubService.listGroups() });

// ---- Overview ----
// Keyed by the active group so switching cycles refetches the dashboard.
export const useOverview = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["overview", gid], queryFn: () => ekubService.getOverview() });
};

// ---- Tiers ----
export const useTiers = () =>
  useQuery({ queryKey: ["tiers"], queryFn: () => ekubService.listTiers() });

export const useSaveTier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: Tier) => ekubService.saveTier(tier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiers"] }),
  });
};
export const useCreateTier = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (tier: Tier) => ekubService.createTier(tier), onSuccess: () => qc.invalidateQueries({ queryKey: ["tiers"] }) });
};
export const useDeleteTier = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => ekubService.deleteTier(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["tiers"] }) });
};

// ---- Cycle lifecycle ----
const invGroups = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["groups"] });
  qc.invalidateQueries({ queryKey: ["overview"] });
};
export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { name: string; code: string; schemeId: string; maxMembers: number; startDate?: string; expectedEndDate?: string }) => ekubService.createGroup(v), onSuccess: () => invGroups(qc) });
};
export const useActivateGroup = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; startDate: string }) => ekubService.activateGroup(v.id, v.startDate), onSuccess: () => invGroups(qc) });
};
export const useCancelGroup = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; reason: string }) => ekubService.cancelGroup(v.id, v.reason), onSuccess: () => invGroups(qc) });
};
export const useExtendGroup = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; additionalRounds: number; reason: string }) => ekubService.extendGroup(v.id, v.additionalRounds, v.reason), onSuccess: () => invGroups(qc) });
};
export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => ekubService.deleteGroup(id), onSuccess: () => invGroups(qc) });
};
export const useAutoCancel = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => ekubService.autoCancel(), onSuccess: () => invGroups(qc) });
};

// ---- Group members ----
export const useMembers = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["members", gid], queryFn: () => ekubService.listMembers() });
};
const invMembers = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["members"] });
  qc.invalidateQueries({ queryKey: ["penalties"] });
};
export const useAddMember = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (memberId: string) => ekubService.addMember(memberId), onSuccess: () => invMembers(qc) });
};
export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (equbMemberId: string) => ekubService.removeMember(equbMemberId), onSuccess: () => invMembers(qc) });
};
export const useSetSuspended = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { memberId: string; suspend: boolean; reason?: string }) => ekubService.setMemberSuspended(v.memberId, v.suspend, v.reason), onSuccess: () => invMembers(qc) });
};
export const useSwapPositions = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { a: string; b: string }) => ekubService.swapPositions(v.a, v.b), onSuccess: () => invMembers(qc) });
};

// ---- Applications ----
export const useApplications = (params: { status?: ApplicationStatus | "all"; search?: string }) =>
  useQuery({ queryKey: ["applications", params], queryFn: () => ekubService.listApplications(params) });

export const useDecideApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; decision: "accept" | "reject"; reason?: string }) =>
      ekubService.decideApplication(v.id, v.decision, v.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
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

// ---- Draws ----
export const useDraws = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["draws", gid], queryFn: () => ekubService.listDraws() });
};

export const useDraw = (id: string) =>
  useQuery({ queryKey: ["draw", id], queryFn: () => ekubService.getDraw(id), enabled: !!id });

export const usePublishDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.publishDraw(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["draws"] });
      qc.invalidateQueries({ queryKey: ["draw", id] });
    },
  });
};

export const useRescheduleDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; scheduledAt: string; reason: string }) =>
      ekubService.rescheduleDraw(v.id, v.scheduledAt, v.reason),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["draws"] });
      qc.invalidateQueries({ queryKey: ["draw", v.id] });
    },
  });
};

export const useRunDraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.runDraw(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["draws"] });
      qc.invalidateQueries({ queryKey: ["draw", id] });
      qc.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
};

export const useDrawPreview = (roundId: string, enabled: boolean) =>
  useQuery({ queryKey: ["draw-preview", roundId], queryFn: () => ekubService.getDrawPreview(roundId), enabled: enabled && !!roundId });

// ---- Payouts ----
export const usePayouts = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["payouts", gid], queryFn: () => ekubService.listPayouts() });
};

export const useHardship = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["hardship", gid], queryFn: () => ekubService.listHardship() });
};

export const useApprovePackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.approvePackage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }),
  });
};

export const useReleasePayout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.releasePayout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }),
  });
};

export const useAttachTitle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.attachPropertyTitle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }),
  });
};
export const useCreateGuarantee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { winnerId: string; guaranteeType: string; guarantorName: string; collateralType?: string; collateralReference?: string; collateralValue?: number }) =>
      ekubService.createGuarantee(v.winnerId, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }),
  });
};
export const useApproveGuarantee = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (guaranteeId: string) => ekubService.approveGuarantee(guaranteeId), onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
};
export const useRejectGuarantee = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { guaranteeId: string; note: string }) => ekubService.rejectGuarantee(v.guaranteeId, v.note), onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
};
export const useDecideHardship = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; decision: "approve" | "reject"; note?: string }) => ekubService.decideHardship(v.id, v.decision, v.note), onSuccess: () => qc.invalidateQueries({ queryKey: ["hardship"] }) });
};
export const useSubmitHardship = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { memberId: string; reason: string; evidence?: string }) => ekubService.submitHardship(v.memberId, v.reason, v.evidence), onSuccess: () => qc.invalidateQueries({ queryKey: ["hardship"] }) });
};

// ---- Takaful ----
export const useTakaful = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["takaful", gid], queryFn: () => ekubService.listTakaful() });
};
export const useTakafulBalance = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["takaful-balance", gid], queryFn: () => ekubService.getTakafulBalance() });
};
const invTakaful = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["takaful"] });
  qc.invalidateQueries({ queryKey: ["takaful-balance"] });
};
export const useDistributeSurplus = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => ekubService.distributeSurplus(), onSuccess: () => invTakaful(qc) });
};
export const useSubmitTakafulClaim = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { memberId: string; amount: number; reason: string }) => ekubService.submitTakafulClaim(v.memberId, v.amount, v.reason), onSuccess: () => invTakaful(qc) });
};
export const useRefundTakaful = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (reason: string) => ekubService.refundTakaful(reason), onSuccess: () => invTakaful(qc) });
};
export const useMarkOverdue = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => ekubService.markOverdue(), onSuccess: () => { qc.invalidateQueries({ queryKey: ["penalties"] }); qc.invalidateQueries({ queryKey: ["payments"] }); } });
};

// ---- Penalties ----
export const usePenalties = () => {
  const gid = useEqubStore((s) => s.activeGroupId);
  return useQuery({ queryKey: ["penalties", gid], queryFn: () => ekubService.listPenalties() });
};

export const useLiftSuspension = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ekubService.liftSuspension(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["penalties"] }),
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
