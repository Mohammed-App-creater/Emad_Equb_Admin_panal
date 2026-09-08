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
