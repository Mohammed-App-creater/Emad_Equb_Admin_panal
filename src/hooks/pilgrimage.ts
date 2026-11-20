"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { pilgrimageApi, type PaymentOutcome } from "@/services/pilgrimage-api";
import type {
  ContributeInput,
  NonWinnerOption,
  PilgrimageListParams,
  PilgrimageProductInput,
  ReviewDecisionInput,
  CycleDatesInput,
} from "@/types/pilgrimage";

/** Query keys of the Hajj & Umrah module; every mutation invalidates the whole module prefix. */
export const pk = {
  all: ["pilgrimage"] as const,
  products: () => ["pilgrimage", "products"] as const,
  product: (id: string) => ["pilgrimage", "products", id] as const,
  cycles: (p?: PilgrimageListParams) => ["pilgrimage", "cycles", p ?? {}] as const,
  cycle: (id: string) => ["pilgrimage", "cycle", id] as const,
  result: (id: string) => ["pilgrimage", "result", id] as const,
  participations: (p?: PilgrimageListParams) => ["pilgrimage", "participations", p ?? {}] as const,
  participation: (id: string) => ["pilgrimage", "participation", id] as const,
  participationContributions: (id: string, page: number) => ["pilgrimage", "participation-contributions", id, page] as const,
  ledger: (p?: PilgrimageListParams) => ["pilgrimage", "ledger", p ?? {}] as const,
  proofs: (contributionId: string) => ["pilgrimage", "proofs", contributionId] as const,
  groups: (p?: PilgrimageListParams) => ["pilgrimage", "groups", p ?? {}] as const,
  group: (id: string) => ["pilgrimage", "group", id] as const,
  winners: (p?: PilgrimageListParams) => ["pilgrimage", "winners", p ?? {}] as const,
  decisions: (p?: PilgrimageListParams) => ["pilgrimage", "decisions", p ?? {}] as const,
};

/** Any change can move several screens at once (a confirmed contribution moves a balance, the ledger and eligibility), so refresh the module. */
const useModuleMutation = <V, R>(fn: (v: V) => Promise<R>) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: pk.all }) });
};

// ---- Products ----
export const usePilgrimageProducts = (activeOnly = false) =>
  useQuery({ queryKey: [...pk.products(), activeOnly], queryFn: () => pilgrimageApi.listProducts(activeOnly) });
export const usePilgrimageProduct = (id: string) =>
  useQuery({ queryKey: pk.product(id), queryFn: () => pilgrimageApi.getProduct(id), enabled: !!id });
export const useCreatePilgrimageProduct = () => useModuleMutation((b: PilgrimageProductInput) => pilgrimageApi.createProduct(b));
export const useUpdatePilgrimageProduct = () =>
  useModuleMutation((v: { id: string; body: Partial<PilgrimageProductInput> }) => pilgrimageApi.updateProduct(v.id, v.body));

// ---- Cycles and draws ----
export const usePilgrimageCycles = (params?: PilgrimageListParams) =>
  useQuery({ queryKey: pk.cycles(params), queryFn: () => pilgrimageApi.listCycles(params), placeholderData: keepPreviousData });
/** Every cycle of every product; the Hajj/Umrah lists narrow it by product kind. */
export const useAllPilgrimageCycles = () =>
  useQuery({ queryKey: [...pk.cycles(), "all"], queryFn: () => pilgrimageApi.listAllCycles() });
export const usePilgrimageCycle = (id: string) =>
  useQuery({ queryKey: pk.cycle(id), queryFn: () => pilgrimageApi.getCycle(id), enabled: !!id });
export const useDrawResult = (id: string) =>
  useQuery({ queryKey: pk.result(id), queryFn: () => pilgrimageApi.drawResult(id), enabled: !!id });
export const useOpenCycle = () =>
  useModuleMutation((v: { productId: string; name?: string; dates: CycleDatesInput }) =>
    pilgrimageApi.openCycle(v.productId, { name: v.name, ...v.dates }),
  );
export const useUpdateCycleDates = () =>
  useModuleMutation((v: { id: string; dates: CycleDatesInput }) => pilgrimageApi.updateCycleDates(v.id, v.dates));
export const useLockCycle = () => useModuleMutation((id: string) => pilgrimageApi.lockCycle(id));
export const useRunDraw = () => useModuleMutation((id: string) => pilgrimageApi.draw(id));
export const useApproveDraw = () =>
  useModuleMutation((v: { id: string; acknowledge_overflow: boolean; note?: string }) =>
    pilgrimageApi.approveDraw(v.id, { acknowledge_overflow: v.acknowledge_overflow, note: v.note }),
  );
export const useCancelCycle = () => useModuleMutation((v: { id: string; reason: string }) => pilgrimageApi.cancelCycle(v.id, v.reason));

// ---- Registrations ----
export const useParticipations = (params?: PilgrimageListParams) =>
  useQuery({ queryKey: pk.participations(params), queryFn: () => pilgrimageApi.listParticipations(params), placeholderData: keepPreviousData });
/** Every registration of one product (the backend cannot filter by cycle). */
export const useProductParticipations = (productId: string | undefined) =>
  useQuery({ queryKey: [...pk.participations({ product_id: productId }), "all"], queryFn: () => pilgrimageApi.listAllParticipations({ product_id: productId }), enabled: !!productId });
/** The same for several products at once, keyed so they share the cache with the hook above. */
export const useProductsParticipations = (productIds: string[]) =>
  useQueries({
    queries: productIds.map((id) => ({
      queryKey: [...pk.participations({ product_id: id }), "all"],
      queryFn: () => pilgrimageApi.listAllParticipations({ product_id: id }),
    })),
  });
export const useParticipation = (id: string) =>
  useQuery({ queryKey: pk.participation(id), queryFn: () => pilgrimageApi.getParticipation(id), enabled: !!id });
export const useContributions = (id: string, page = 1, limit = 10) =>
  useQuery({ queryKey: [...pk.participationContributions(id, page), limit], queryFn: () => pilgrimageApi.participationContributions(id, { page, limit }), enabled: !!id });
export const useRegisterParticipant = () =>
  useModuleMutation((b: { product_id: string; member_id: string; agent_user_id?: string }) => pilgrimageApi.register(b));
export const useSetParticipationAgent = () => useModuleMutation((v: { id: string; agentUserId: string }) => pilgrimageApi.setAgent(v.id, v.agentUserId));
export const useCancelParticipation = () => useModuleMutation((id: string) => pilgrimageApi.cancelParticipation(id));

// ---- Contributions (the Equb ledger) ----
export const useContributionLedger = (params?: PilgrimageListParams) =>
  useQuery({ queryKey: pk.ledger(params), queryFn: () => pilgrimageApi.contributionLedger(params), placeholderData: keepPreviousData });
export const useContribute = () => useModuleMutation((v: { id: string; body: ContributeInput }) => pilgrimageApi.contribute(v.id, v.body));
export const useContributionProofs = (id: string, contributionId: string, enabled = true) =>
  useQuery({ queryKey: pk.proofs(contributionId), queryFn: () => pilgrimageApi.contributionProofs(id, contributionId), enabled: enabled && !!id && !!contributionId });
export const useUploadContributionProof = () =>
  useModuleMutation((v: { id: string; contributionId: string; file: File; description?: string }) =>
    pilgrimageApi.uploadContributionProof(v.id, v.contributionId, v.file, v.description));
export const useSetPaymentOutcome = () =>
  useModuleMutation((v: { paymentId: string; status: PaymentOutcome; reason?: string }) => pilgrimageApi.setPaymentOutcome(v.paymentId, v.status, v.reason));

// ---- Groups ----
export const usePilgrimageGroups = (params?: PilgrimageListParams) =>
  useQuery({ queryKey: pk.groups(params), queryFn: () => pilgrimageApi.listGroups(params), placeholderData: keepPreviousData });
export const useAllPilgrimageGroups = (productId: string | undefined) =>
  useQuery({ queryKey: [...pk.groups({ product_id: productId }), "all"], queryFn: () => pilgrimageApi.listAllGroups({ product_id: productId }), enabled: !!productId });
export const usePilgrimageGroup = (id: string | null) =>
  useQuery({ queryKey: pk.group(id ?? ""), queryFn: () => pilgrimageApi.getGroup(id!), enabled: !!id });

// ---- Winners ----
export const usePilgrimageWinners = (params?: PilgrimageListParams) =>
  useQuery({ queryKey: pk.winners(params), queryFn: () => pilgrimageApi.listWinners(params), placeholderData: keepPreviousData });
export const useRetryWinner = () => useModuleMutation((id: string) => pilgrimageApi.retryWinner(id));

// ---- Decisions ----
export const usePilgrimageDecisions = (params?: PilgrimageListParams) =>
  useQuery({ queryKey: pk.decisions(params), queryFn: () => pilgrimageApi.listDecisions(params), placeholderData: keepPreviousData });
export const useChooseOnBehalf = () => useModuleMutation((v: { id: string; option: NonWinnerOption }) => pilgrimageApi.chooseOnBehalf(v.id, v.option));
export const useReviewDecision = () => useModuleMutation((v: { id: string; body: ReviewDecisionInput }) => pilgrimageApi.reviewDecision(v.id, v.body));

// ---- Lookups ----
export const useSavingTypeOptions = () =>
  useQuery({ queryKey: ["pilgrimage", "saving-types"], queryFn: () => pilgrimageApi.savingTypes(), staleTime: 5 * 60_000 });
export const usePaymentAccounts = (paymentMethod?: string, enabled = true) =>
  useQuery({ queryKey: ["pilgrimage", "payment-accounts", paymentMethod ?? "all"], queryFn: () => pilgrimageApi.paymentAccounts(paymentMethod), enabled, staleTime: 5 * 60_000 });
