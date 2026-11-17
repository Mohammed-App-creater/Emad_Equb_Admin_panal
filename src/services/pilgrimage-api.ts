import { api } from "@/lib/api/client";
import type { ApiEnvelope, PaginationMeta } from "@/types/equb-api";
import type {
  ContributeInput,
  DrawResult,
  MudarabahContract,
  NonWinnerOption,
  Participation,
  PaymentAccount,
  PilgrimageCycle,
  PilgrimageDecision,
  PilgrimageGroup,
  PilgrimageListParams,
  PilgrimageProduct,
  PilgrimageProductInput,
  PilgrimageWinner,
  ReviewDecisionInput,
  SavingTypeOption,
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
  CYCLE_ACTION: (id: string, action: "lock" | "draw" | "approve" | "cancel") => `/pilgrimage/cycles/${id}/${action}`,
  PARTICIPATIONS: "/pilgrimage/participations",
  PARTICIPATION: (id: string) => `/pilgrimage/participations/${id}`,
  CONTRIBUTIONS: (id: string) => `/pilgrimage/participations/${id}/contributions`,
  CANCEL_PARTICIPATION: (id: string) => `/pilgrimage/participations/${id}/cancel`,
  GROUPS: "/pilgrimage/groups",
  GROUP: (id: string) => `/pilgrimage/groups/${id}`,
  WINNERS: "/pilgrimage/winners",
  RETRY_FINANCE: (id: string) => `/pilgrimage/winners/${id}/retry-finance`,
  DECISIONS: "/pilgrimage/decisions",
  CHOOSE: (id: string) => `/pilgrimage/decisions/${id}/choose`,
  REVIEW: (id: string) => `/pilgrimage/decisions/${id}/review`,
  MUDARABAH: "/pilgrimage/mudarabah",
  MUDARABAH_PROFIT: (id: string) => `/pilgrimage/mudarabah/${id}/profit`,
  // SACCO-wide lookups the forms need.
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

export const pilgrimageApi = {
  // Products
  listProducts: (activeOnly = false) =>
    unwrap<PilgrimageProduct[] | null>(api.get(E.PRODUCTS, { params: activeOnly ? { active: true } : undefined })).then((r) => r ?? []),
  getProduct: (id: string) => unwrap<PilgrimageProduct>(api.get(E.PRODUCT(id))),
  createProduct: (body: PilgrimageProductInput) => unwrap<PilgrimageProduct>(api.post(E.PRODUCTS, body)),
  updateProduct: (id: string, body: Partial<PilgrimageProductInput>) => unwrap<PilgrimageProduct>(api.put(E.PRODUCT(id), body)),

  // Cycles and draws
  openCycle: (productId: string, body: { name?: string; opens_at?: string; draw_at?: string }) =>
    unwrap<PilgrimageCycle>(api.post(E.OPEN_CYCLE(productId), body)),
  listCycles: (params?: PilgrimageListParams) => page<PilgrimageCycle>(api.get(E.CYCLES, { params }), params),
  getCycle: (id: string) => unwrap<PilgrimageCycle>(api.get(E.CYCLE(id))),
  drawResult: (id: string) => unwrap<DrawResult>(api.get(E.CYCLE_RESULT(id))),
  lockCycle: (id: string) => unwrap<PilgrimageCycle>(api.post(E.CYCLE_ACTION(id, "lock"))),
  draw: (id: string) => unwrap<DrawResult>(api.post(E.CYCLE_ACTION(id, "draw"))),
  approveDraw: (id: string, body: { acknowledge_overflow: boolean; note?: string }) =>
    unwrap<DrawResult>(api.post(E.CYCLE_ACTION(id, "approve"), body)),
  cancelCycle: (id: string, reason: string) => unwrap<PilgrimageCycle>(api.post(E.CYCLE_ACTION(id, "cancel"), { reason })),

  // Registrations
  listParticipations: (params?: PilgrimageListParams) => page<Participation>(api.get(E.PARTICIPATIONS, { params }), params),
  getParticipation: (id: string) => unwrap<Participation>(api.get(E.PARTICIPATION(id))),
  register: (body: { product_id: string; member_id: string }) => unwrap<Participation>(api.post(E.PARTICIPATIONS, body)),
  contribute: (id: string, body: ContributeInput) => unwrap<{ id: string; amount: number; status: string }>(api.post(E.CONTRIBUTIONS(id), body)),
  contributions: (id: string, params?: { page?: number; limit?: number }) =>
    page<{ id: string; amount: number; status: string; payment_type: string; payment_method: string; reference_number?: string; created_at: string }>(
      api.get(E.CONTRIBUTIONS(id), { params }),
      params,
    ),
  cancelParticipation: (id: string) => unwrap<Participation>(api.post(E.CANCEL_PARTICIPATION(id))),

  // Groups
  listGroups: (params?: PilgrimageListParams) => page<PilgrimageGroup>(api.get(E.GROUPS, { params }), params),
  getGroup: (id: string) => unwrap<PilgrimageGroup>(api.get(E.GROUP(id))),

  // Winners
  listWinners: (params?: PilgrimageListParams) => page<PilgrimageWinner>(api.get(E.WINNERS, { params }), params),
  retryWinnerFinance: (id: string) => unwrap<PilgrimageWinner>(api.post(E.RETRY_FINANCE(id))),

  // Non-winner decisions
  listDecisions: (params?: PilgrimageListParams) => page<PilgrimageDecision>(api.get(E.DECISIONS, { params }), params),
  chooseOnBehalf: (id: string, body: { option: NonWinnerOption; mudarabah_duration_months?: number }) =>
    unwrap<PilgrimageDecision>(api.post(E.CHOOSE(id), body)),
  reviewDecision: (id: string, body: ReviewDecisionInput) => unwrap<PilgrimageDecision>(api.post(E.REVIEW(id), body)),

  // Mudarabah
  listMudarabah: (params?: PilgrimageListParams) => page<MudarabahContract>(api.get(E.MUDARABAH, { params }), params),
  recordProfit: (id: string, body: { amount: number; reference: string }) => unwrap<MudarabahContract>(api.post(E.MUDARABAH_PROFIT(id), body)),

  // Lookups
  savingTypes: () => unwrap<SavingTypeOption[] | null>(api.get(E.SAVING_TYPES, { params: { per_page: 100, limit: 100 } })).then((r) => r ?? []),
  paymentAccounts: (paymentMethod?: string) =>
    unwrap<PaymentAccount[] | null>(api.get(E.PAYMENT_ACCOUNTS, { params: paymentMethod ? { payment_method: paymentMethod } : undefined })).then((r) => r ?? []),
};
