import { api } from "@/lib/api/client";
import type { ApiEnvelope, PaginationMeta } from "@/types/equb-api";
import type {
  ContributeInput,
  Contribution,
  ContributionLedger,
  DrawResult,
  NonWinnerOption,
  Participation,
  PaymentAccount,
  PaymentProof,
  PilgrimageCycle,
  PilgrimageDecision,
  PilgrimageGroup,
  PilgrimageListParams,
  PilgrimageProduct,
  PilgrimageProductInput,
  PilgrimageWinner,
  ReviewDecisionInput,
  SavingTypeOption,
  CycleDatesInput,
} from "@/types/pilgrimage";

/**
 * Staff endpoints of the Hajj & Umrah Equb module (backend `/pilgrimage/*`).
 * Permissions: pilgrimage:read, :register, :manage, :draw, :approve.
 */
export const PILGRIMAGE_ENDPOINTS = {
  PRODUCTS: "/pilgrimage/products",
  PRODUCT: (id: string) => `/pilgrimage/products/${id}`,
  OPEN_CYCLE: (productId: string) => `/pilgrimage/products/${productId}/cycles`,
  CYCLES: "/pilgrimage/cycles",
  CYCLE: (id: string) => `/pilgrimage/cycles/${id}`,
  CYCLE_RESULT: (id: string) => `/pilgrimage/cycles/${id}/result`,
  CYCLE_DATES: (id: string) => `/pilgrimage/cycles/${id}/dates`,
  CYCLE_ACTION: (id: string, action: "lock" | "draw" | "approve" | "cancel") => `/pilgrimage/cycles/${id}/${action}`,
  PARTICIPATIONS: "/pilgrimage/participations",
  PARTICIPATION: (id: string) => `/pilgrimage/participations/${id}`,
  PARTICIPATION_CONTRIBUTIONS: (id: string) => `/pilgrimage/participations/${id}/contributions`,
  CONTRIBUTION_PROOFS: (id: string, contributionId: string) => `/pilgrimage/participations/${id}/contributions/${contributionId}/attachments`,
  PARTICIPATION_AGENT: (id: string) => `/pilgrimage/participations/${id}/agent`,
  CANCEL_PARTICIPATION: (id: string) => `/pilgrimage/participations/${id}/cancel`,
  CONTRIBUTIONS: "/pilgrimage/contributions",
  GROUPS: "/pilgrimage/groups",
  GROUP: (id: string) => `/pilgrimage/groups/${id}`,
  WINNERS: "/pilgrimage/winners",
  WINNER_RETRY: (id: string) => `/pilgrimage/winners/${id}/retry`,
  DECISIONS: "/pilgrimage/decisions",
  CHOOSE: (id: string) => `/pilgrimage/decisions/${id}/choose`,
  REVIEW: (id: string) => `/pilgrimage/decisions/${id}/review`,
  // SACCO-wide endpoints the module uses.
  PAYMENT_STATUS: (id: string) => `/payments/${id}/status`,
  SAVING_TYPES: "/saving-types",
  PAYMENT_ACCOUNTS: "/payment-accounts",
} as const;

const E = PILGRIMAGE_ENDPOINTS;

const unwrap = async <T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> => (await p).data.data;

export interface Page<T> { items: T[]; meta: PaginationMeta }
const page = async <T>(p: Promise<{ data: ApiEnvelope<T[] | null> }>, params?: PilgrimageListParams): Promise<Page<T>> => {
  const env = (await p).data;
  const items = env.data ?? [];
  return { items, meta: env.meta ?? { page: params?.page ?? 1, per_page: params?.limit ?? items.length, total: items.length, total_pages: 1 } };
};

/**
 * Every row of a paged list. The backend filters cycles by product only and
 * registrations not by cycle at all, so the Hajj/Umrah views fetch a
 * product's whole list and narrow it here. Capped so a runaway total cannot
 * fire unbounded requests.
 */
const MAX_PAGES = 50;
const all = async <T>(fetchPage: (p: PilgrimageListParams) => Promise<Page<T>>, params?: PilgrimageListParams): Promise<T[]> => {
  const limit = 100;
  const first = await fetchPage({ ...params, page: 1, limit });
  const pages = Math.min(first.meta.total_pages || 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage({ ...params, page: i + 2, limit })));
  return [first, ...rest].flatMap((p) => p.items);
};

export interface LedgerPage extends ContributionLedger { meta: PaginationMeta }
const emptyTotals = { count: 0, saved_amount: 0, admin_fee_charged: 0, admin_fee_collected: 0, takaful_fee_charged: 0, takaful_fee_collected: 0 };
const ledger = async (p: Promise<{ data: ApiEnvelope<ContributionLedger | null> }>, params?: PilgrimageListParams): Promise<LedgerPage> => {
  const env = (await p).data;
  const contributions = env.data?.contributions ?? [];
  return {
    contributions,
    totals: env.data?.totals ?? emptyTotals,
    meta: env.meta ?? { page: params?.page ?? 1, per_page: params?.limit ?? contributions.length, total: contributions.length, total_pages: 1 },
  };
};

/** The final statuses staff can give an Equb ledger payment (or a winner's transfer, locally). */
export type PaymentOutcome = "completed" | "failed";

export const pilgrimageApi = {
  // Products
  listProducts: (activeOnly = false) =>
    unwrap<PilgrimageProduct[] | null>(api.get(E.PRODUCTS, { params: activeOnly ? { active: true } : undefined })).then((r) => r ?? []),
  getProduct: (id: string) => unwrap<PilgrimageProduct>(api.get(E.PRODUCT(id))),
  createProduct: (body: PilgrimageProductInput) => unwrap<PilgrimageProduct>(api.post(E.PRODUCTS, body)),
  updateProduct: (id: string, body: Partial<PilgrimageProductInput>) => unwrap<PilgrimageProduct>(api.put(E.PRODUCT(id), body)),

  // Cycles and draws
  openCycle: (productId: string, body: { name?: string } & CycleDatesInput) =>
    unwrap<PilgrimageCycle>(api.post(E.OPEN_CYCLE(productId), body)),
  updateCycleDates: (id: string, body: CycleDatesInput) => unwrap<PilgrimageCycle>(api.put(E.CYCLE_DATES(id), body)),
  listCycles: (params?: PilgrimageListParams) => page<PilgrimageCycle>(api.get(E.CYCLES, { params }), params),
  listAllCycles: (params?: PilgrimageListParams) => all((p) => pilgrimageApi.listCycles(p), params),
  getCycle: (id: string) => unwrap<PilgrimageCycle>(api.get(E.CYCLE(id))),
  drawResult: (id: string) => unwrap<DrawResult>(api.get(E.CYCLE_RESULT(id))),
  lockCycle: (id: string) => unwrap<PilgrimageCycle>(api.post(E.CYCLE_ACTION(id, "lock"))),
  draw: (id: string) => unwrap<DrawResult>(api.post(E.CYCLE_ACTION(id, "draw"))),
  approveDraw: (id: string, body: { acknowledge_overflow: boolean; note?: string }) =>
    unwrap<DrawResult>(api.post(E.CYCLE_ACTION(id, "approve"), body)),
  cancelCycle: (id: string, reason: string) => unwrap<PilgrimageCycle>(api.post(E.CYCLE_ACTION(id, "cancel"), { reason })),

  // Registrations
  listParticipations: (params?: PilgrimageListParams) => page<Participation>(api.get(E.PARTICIPATIONS, { params }), params),
  listAllParticipations: (params?: PilgrimageListParams) => all((p) => pilgrimageApi.listParticipations(p), params),
  getParticipation: (id: string) => unwrap<Participation>(api.get(E.PARTICIPATION(id))),
  register: (body: { product_id: string; member_id: string; agent_user_id?: string }) => unwrap<Participation>(api.post(E.PARTICIPATIONS, body)),
  setAgent: (id: string, agentUserId: string) => unwrap<Participation>(api.put(E.PARTICIPATION_AGENT(id), { agent_user_id: agentUserId })),
  cancelParticipation: (id: string) => unwrap<Participation>(api.post(E.CANCEL_PARTICIPATION(id))),

  // Contributions (the Equb ledger)
  contribute: (id: string, body: ContributeInput) => unwrap<Contribution>(api.post(E.PARTICIPATION_CONTRIBUTIONS(id), body)),
  // Proof of a payment (receipt or screenshot), filed while it waits to be confirmed.
  contributionProofs: (id: string, contributionId: string) =>
    unwrap<PaymentProof[] | null>(api.get(E.CONTRIBUTION_PROOFS(id, contributionId))).then((r) => r ?? []),
  uploadContributionProof: (id: string, contributionId: string, file: File, description?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return unwrap<PaymentProof>(api.post(E.CONTRIBUTION_PROOFS(id, contributionId), form, { headers: { "Content-Type": "multipart/form-data" } }));
  },
  participationContributions: (id: string, params?: { page?: number; limit?: number }) =>
    page<Contribution>(api.get(E.PARTICIPATION_CONTRIBUTIONS(id), { params }), params),
  contributionLedger: (params?: PilgrimageListParams) => ledger(api.get(E.CONTRIBUTIONS, { params }), params),
  /** Confirms or fails a payment (an Equb ledger payment, or a winner's savings transfer). */
  setPaymentOutcome: (paymentId: string, status: PaymentOutcome, reason?: string) =>
    unwrap<unknown>(api.patch(E.PAYMENT_STATUS(paymentId), { status, failure_reason: status === "failed" ? reason || "Rejected by staff" : undefined })),

  // Groups
  listGroups: (params?: PilgrimageListParams) => page<PilgrimageGroup>(api.get(E.GROUPS, { params }), params),
  listAllGroups: (params?: PilgrimageListParams) => all((p) => pilgrimageApi.listGroups(p), params),
  getGroup: (id: string) => unwrap<PilgrimageGroup>(api.get(E.GROUP(id))),

  // Winners
  listWinners: (params?: PilgrimageListParams) => page<PilgrimageWinner>(api.get(E.WINNERS, { params }), params),
  retryWinner: (id: string) => unwrap<PilgrimageWinner>(api.post(E.WINNER_RETRY(id))),

  // Non-winner decisions
  listDecisions: (params?: PilgrimageListParams) => page<PilgrimageDecision>(api.get(E.DECISIONS, { params }), params),
  chooseOnBehalf: (id: string, option: NonWinnerOption) => unwrap<PilgrimageDecision>(api.post(E.CHOOSE(id), { option })),
  reviewDecision: (id: string, body: ReviewDecisionInput) => unwrap<PilgrimageDecision>(api.post(E.REVIEW(id), body)),

  // Lookups
  savingTypes: () => unwrap<SavingTypeOption[] | null>(api.get(E.SAVING_TYPES, { params: { per_page: 100, limit: 100 } })).then((r) => r ?? []),
  paymentAccounts: (paymentMethod?: string) =>
    unwrap<PaymentAccount[] | null>(api.get(E.PAYMENT_ACCOUNTS, { params: paymentMethod ? { payment_method: paymentMethod } : undefined })).then((r) => r ?? []),
};
