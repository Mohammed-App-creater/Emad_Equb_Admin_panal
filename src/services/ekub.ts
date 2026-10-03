import * as db from "@/lib/mock/mock-db";
import { equbApi } from "@/services/equb-api";
import type {
  AdminFeeShares,
  Application,
  ApplicationStatus,
  EqubAdminFees,
  EqubOverrides,
  EqubTerms,
  FeeLine,
  FeeSplit,
  FeeTotals,
  MemberAdminFees,
  CloneEqubInput,
  ClonedEqub,
  ContributionAttachment,
  FeeLedger,
  FeeLedgerFilters,
  PaymentDetail,
  MemberProfile,
  Page,
  CatchUp,
  CollectionsFilters,
  CollectionsSummary,
  CollectionsPage,
  MemberStanding,
  RecordPaymentInput,
  RecordedPayment,
  RoundAdminFees,
  Dispute,
  DrawPreview,
  EmergencyDrawRequest,
  Equb,
  EqubCategory,
  EqubCategoryInput,
  EqubDashboard,
  EqubInput,
  EqubListFilters,
  EqubMember,
  EqubUpdateInput,
  Frequency,
  Guarantee,
  GuaranteeInput,
  ManagerAssignment,
  MemberSummary,
  Payment,
  ReconciliationRow,
  Round,
  RoundStatus,
  StaffMember,
  Agent,
  StaffFilters,
  Bank,
  BankInput,
  Branch,
  MobileMoneyProvider,
  UserRole,
  StaffUser,
  TakafulSettlement,
  TakafulTxn,
  Winner,
} from "@/types/ekub";
import type {
  EqubContributionAttachmentResponse,
  EqubAdminFeeLine,
  EqubAdminFeeSplit,
  EqubAdminFeeTotals,
  EqubAdminFeeShares,
  EqubTermOverrides,
  EqubTermsResponse,
  EqubAdminDashboardResponse,
  EqubCollectionsSummaryResponse,
  EqubDrawEligibleMember,
  EqubDrawExcludedMember,
  EqubDrawPreviewResponse,
  EqubEmergencyDrawResponse,
  EqubGroupResponse,
  EqubGuaranteeResponse,
  EqubMemberResponse,
  EqubRoundResponse,
  EqubSchemeResponse,
  EqubTakafulSettlementResponse,
  EqubTakafulTransactionResponse,
  EqubWinnerResponse,
  AgentSummaryResponse,
  MemberRegistrationRequestResponse,
  MemberSummaryResponse,
  UserResponse,
  BankResponse,
} from "@/types/equb-api";
import { EQUB_FREQUENCIES } from "@/types/equb-api";

// With NEXT_PUBLIC_USE_MOCK=true, `equbApi` is the seeded in-memory backend
// (lib/mock/mock-equb-api.ts) for every Equb entity. The modules with no
// backend endpoint yet (payments ledger, reconciliation, disputes) and the
// demo data for applications / staff / roles read lib/mock/mock-db instead.
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// Money on the newer endpoints is decimal-as-string ("60.00"); older ones use numbers.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const optNum = (v: string | number | null | undefined): number | undefined =>
  v === null || v === undefined || v === "" ? undefined : num(v);
const money = (n: number | undefined) => (n === undefined ? undefined : n.toFixed(2));

// ============================================================================
// DTO → view-model mappers (real API shape → the camelCase types pages render)
// ============================================================================
// A group's nested equb_scheme comes back with zero timestamps ("0001-01-01T00:00:00Z").
const realDate = (d?: string | null): string => (d && !d.startsWith("0001-") ? d : "");

const frequency = (f: string): Frequency =>
  (EQUB_FREQUENCIES as readonly string[]).includes(f) ? (f as Frequency) : "daily";

function schemeToCategory(s: EqubSchemeResponse): EqubCategory {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    description: s.description ?? "",
    status: s.status,
    frequency: frequency(s.frequency),
    contribution: num(s.contribution_amount),
    adminFee: num(s.admin_fee),
    takafulFee: num(s.takaful_fee),
    payout: num(s.payout_amount),
    membersPerEqub: s.members_per_group,
    winnersPerRound: s.winners_per_round,
    totalRounds: s.total_rounds,
    guaranteeRequired: s.guarantee_required ?? true,
    acceptedGuaranteeTypes: s.accepted_guarantee_types ?? [],
    createdBy: s.created_by ?? "",
    createdAt: realDate(s.created_at),
    updatedAt: realDate(s.updated_at),
  };
}


function termsToView(t: EqubTermsResponse): EqubTerms {
  return {
    contribution: num(t.contribution_amount),
    adminFee: num(t.admin_fee),
    takafulFee: num(t.takaful_fee),
    payout: num(t.payout_amount),
    totalPerRound: num(t.total_per_round) || num(t.contribution_amount) + num(t.admin_fee) + num(t.takaful_fee),
    frequency: frequency(t.frequency),
    membersPerEqub: t.members_per_group,
    winnersPerRound: t.winners_per_round,
    totalRounds: t.total_rounds,
    guaranteeRequired: t.guarantee_required ?? true,
    acceptedGuaranteeTypes: t.accepted_guarantee_types ?? [],
  };
}

function overridesToView(g: EqubTermOverrides): EqubOverrides {
  const o: EqubOverrides = {
    contribution: optNum(g.contribution_amount_override),
    adminFee: optNum(g.admin_fee_override),
    takafulFee: optNum(g.takaful_fee_override),
    payout: optNum(g.payout_amount_override),
    frequency: g.frequency_override ? frequency(g.frequency_override) : undefined,
    totalRounds: g.total_rounds_override ?? undefined,
    winnersPerRound: g.winners_per_round_override ?? undefined,
    guaranteeRequired: g.guarantee_required_override ?? undefined,
    acceptedGuaranteeTypes: g.accepted_guarantee_types_override ?? undefined,
  };
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as EqubOverrides;
}

function overridesToDto(o: EqubOverrides | undefined): EqubTermOverrides {
  if (!o) return {};
  return {
    contribution_amount_override: money(o.contribution),
    admin_fee_override: money(o.adminFee),
    takaful_fee_override: money(o.takafulFee),
    payout_amount_override: money(o.payout),
    frequency_override: o.frequency,
    total_rounds_override: o.totalRounds,
    winners_per_round_override: o.winnersPerRound,
    guarantee_required_override: o.guaranteeRequired,
    accepted_guarantee_types_override: o.acceptedGuaranteeTypes,
  };
}

function sharesToDto(s: AdminFeeShares | undefined, brokerUserId: string | undefined): EqubAdminFeeShares {
  if (!s) return {};
  return {
    sacco_admin_fee_share: String(s.sacco),
    agent_admin_fee_share: String(s.agent),
    broker_admin_fee_share: String(s.broker),
    broker_user_id: s.broker > 0 ? brokerUserId || undefined : undefined,
  };
}

const attachmentToView = (a: EqubContributionAttachmentResponse): ContributionAttachment => ({
  id: a.id,
  contributionId: a.equb_contribution_id,
  memberId: a.member_id,
  memberName: a.member_name || "—",
  roundId: a.round_id,
  roundNumber: a.round_number,
  fileName: a.file_name,
  fileSize: a.file_size ?? 0,
  mimeType: a.mime_type,
  fileUrl: a.file_url,
  isImage: !!a.is_image,
  description: a.description ?? "",
  createdAt: a.created_at,
});

const totalsToView = (t?: EqubAdminFeeTotals): FeeTotals => ({ charged: num(t?.charged), collected: num(t?.collected), outstanding: num(t?.outstanding) });
const splitToView = (s?: EqubAdminFeeSplit): FeeSplit => ({
  saccoPercent: num(s?.sacco_share_percent),
  saccoAmount: num(s?.sacco_amount),
  agentPercent: num(s?.agent_share_percent),
  agentAmount: num(s?.agent_amount),
  brokerPercent: num(s?.broker_share_percent),
  brokerAmount: num(s?.broker_amount),
});
const feeLineToView = (l: EqubAdminFeeLine): FeeLine => ({
  contributionId: l.contribution_id,
  memberId: l.member_id,
  memberName: l.member_name,
  membershipNumber: l.membership_number,
  roundId: l.round_id,
  roundNumber: l.round_number,
  scheduledAt: l.scheduled_at,
  amount: num(l.amount),
  collected: !!l.collected,
  isCatchUp: !!l.is_catch_up,
  paidAt: l.paid_at,
  paymentId: l.payment_id,
  status: l.status,
});

function groupToEqub(g: EqubGroupResponse): Equb {
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    status: g.status,
    categoryId: g.equb_scheme_id,
    category: g.equb_scheme ? schemeToCategory(g.equb_scheme) : undefined,
    manager: g.manager?.user_id
      ? { userId: g.manager.user_id, fullName: g.manager.full_name || g.manager.email || g.manager.phone_number || "—", email: g.manager.email ?? "", phone: g.manager.phone_number ?? "" }
      : undefined,
    effectiveTerms: g.effective_terms ? termsToView(g.effective_terms) : undefined,
    overrides: overridesToView(g),
    feeShares:
      g.sacco_admin_fee_share != null || g.agent_admin_fee_share != null || g.broker_admin_fee_share != null
        ? { sacco: num(g.sacco_admin_fee_share), agent: num(g.agent_admin_fee_share), broker: num(g.broker_admin_fee_share) }
        : undefined,
    brokerUserId: g.broker_user_id || undefined,
    cycleNumber: g.cycle_number ?? 1,
    previousEqubId: g.previous_group_id || undefined,
    currentMembers: g.current_members ?? 0,
    maxMembers: g.max_members,
    startDate: g.start_date,
    expectedEndDate: g.expected_end_date,
    createdBy: g.created_by ?? "",
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  };
}

function dashboardToView(d: EqubAdminDashboardResponse): EqubDashboard {
  return {
    equbId: d.group_id,
    equbCode: d.group_code,
    equbName: d.group_name,
    status: d.status,
    currentRound: d.current_round,
    totalRounds: d.total_rounds,
    progressPercent: num(d.cycle_progress),
    drawStatus: d.draw_status,
    totalMembers: d.total_members,
    activeMembers: d.active_members,
    suspendedMembers: d.suspended_members,
    eligibleForDraw: d.eligible_for_draw,
    paidThisRound: d.paid_this_round,
    unpaidThisRound: d.unpaid_this_round,
    nextDueDate: d.next_due_date,
    totalCollected: num(d.total_collected),
    totalPayouts: num(d.total_payouts),
    totalAdminFees: num(d.total_admin_fees),
    totalTakafulFees: num(d.total_takaful_fees),
    takafulBalance: num(d.takaful_balance),
    winsDistributed: d.wins_distributed,
  };
}

function memberToView(m: EqubMemberResponse): EqubMember {
  return {
    id: m.id,
    memberId: m.member_id,
    name: m.member?.display_name || m.member?.full_name || m.member?.membership_number || "—",
    membershipNumber: m.member?.membership_number || "—",
    phone: m.member?.phone_number || "",
    photo: m.member?.photo || undefined,
    position: m.position,
    status: m.status,
    joinedAt: m.joined_at,
  };
}

function saccoMemberToSummary(m: MemberSummaryResponse): MemberSummary {
  return {
    id: m.id,
    fullName: m.full_name || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim(),
    membershipNumber: m.membership_number || "—",
    phone: m.phone_number || "",
    photo: m.photo || undefined,
    status: m.status,
  };
}

export const mapRoundStatus = (s: string): RoundStatus => {
  const v = (s || "").toLowerCase();
  if (v === "completed" || v === "closed" || v === "paid") return "completed";
  if (v === "drawn") return "drawn";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "postponed") return "postponed";
  if (v === "active" || v === "open" || v === "ongoing" || v === "in_progress" || v === "live") return "open";
  return "scheduled";
};

const eligibleToView = (m: EqubDrawEligibleMember) => ({
  memberId: m.member_id,
  name: m.member_name,
  phone: m.phone,
  position: m.position,
  contributionPaid: m.contribution_paid,
  previouslyWon: m.previously_won,
  eligible: m.eligible,
});
const excludedToView = (m: EqubDrawExcludedMember) => ({
  memberId: m.member_id,
  name: m.member_name,
  phone: m.phone,
  contributionPaid: m.contribution_paid,
  previouslyWon: m.previously_won,
  hasUnpaidCatchUp: m.has_unpaid_catch_up,
  isBanned: m.is_banned,
  reason: m.reason,
});

function roundToView(r: EqubRoundResponse): Round {
  return {
    id: r.id,
    equbId: r.equb_group_id,
    roundNumber: r.round_number,
    status: mapRoundStatus(r.status),
    rawStatus: r.status,
    notReadyReason: r.not_ready_reason ?? "",
    scheduledAt: r.scheduled_at,
    drawnAt: r.drawn_at,
    contributionDueDate: r.contribution_due_date,
    createdAt: r.created_at,
    totalMembers: r.total_members ?? 0,
    paidCount: r.paid_count ?? 0,
    unpaidCount: r.unpaid_count ?? 0,
    // Money arrives as decimal strings on the live API — never add them raw.
    paymentPercentage: num(r.payment_percentage),
    totalContribution: num(r.total_contribution),
    totalAdminFee: num(r.total_admin_fee),
    totalTakafulFee: num(r.total_takaful_fee),
    payoutAmount: num(r.payout_amount),
    memberPayments: (r.member_payments ?? []).map((p) => ({
      memberId: p.member_id,
      name: p.member_name,
      phone: p.phone,
      amount: num(p.amount),
      status: p.status,
      paidAt: p.paid_at,
      isCatchUp: !!p.isCatchUp,
    })),
    canExecuteDraw: !!r.can_execute_draw,
    eligibleCount: r.eligible_count ?? 0,
    excludedCount: r.excluded_count ?? 0,
    eligibleMembers: (r.eligible_members ?? []).map(eligibleToView),
    excludedMembers: (r.excluded_members ?? []).map(excludedToView),
    winners: (r.winners ?? []).map((w) => ({
      memberId: w.member_id,
      name: w.member_name,
      phone: w.phone,
      payoutAmount: num(w.payout_amount),
      status: w.status,
      position: w.winner_position,
      paidAt: w.paid_at,
    })),
  };
}

function previewToView(p: EqubDrawPreviewResponse): DrawPreview {
  return {
    roundId: p.round_id,
    roundNumber: p.round_number,
    canExecute: !!p.can_execute_draw,
    reason: p.reason ?? "",
    eligibleCount: p.eligible_count ?? 0,
    excludedCount: p.excluded_count ?? 0,
    totalMembers: p.total_members ?? 0,
    winnersPerRound: p.winners_per_round ?? 0,
    eligible: (p.eligible_members ?? []).map(eligibleToView),
    excluded: (p.excluded_members ?? []).map(excludedToView),
  };
}

const mapWinnerStatus = (s: string): Winner["status"] => {
  const v = (s || "").toLowerCase();
  if (v === "paid" || v === "released" || v === "completed") return "paid";
  if (v === "approved" || v === "guaranteed" || v === "ready") return "approved";
  return "pending";
};

function winnerToView(w: EqubWinnerResponse, roundNumber?: number): Winner {
  return {
    id: w.id,
    roundId: w.equb_round_id,
    roundNumber,
    memberId: w.member_id,
    name: w.member?.display_name || w.member?.full_name || w.member?.membership_number || "—",
    membershipNumber: w.member?.membership_number || "—",
    phone: w.member?.phone_number || "",
    position: w.winner_position,
    payoutAmount: num(w.payout_amount),
    status: mapWinnerStatus(w.status),
    rawStatus: w.status,
    guaranteeStatus: w.guarantee_status || "none",
    paidAt: w.paid_at,
    createdAt: w.created_at,
  };
}

function guaranteeToView(g: EqubGuaranteeResponse): Guarantee {
  return {
    id: g.id,
    winnerId: g.equb_winner_id,
    guaranteeType: g.guarantee_type,
    guarantorName: g.guarantor_name,
    guarantorMemberId: g.guarantor_member_id,
    collateralType: g.collateral_type,
    collateralReference: g.collateral_reference,
    collateralValue: num(g.collateral_value),
    status: g.status,
    approvedAt: g.approved_at,
  };
}

function emergencyToView(e: EqubEmergencyDrawResponse): EmergencyDrawRequest {
  return {
    id: e.id,
    equbId: e.equb_group_id,
    memberId: e.member_id,
    reason: e.reason,
    status: e.status,
    reviewNote: e.review_note ?? "",
    // reviewed_by is a user ID on the live API — only show it when it is a name.
    reviewedBy: e.reviewed_by && !UUID_RE.test(e.reviewed_by) ? e.reviewed_by : "",
    createdAt: e.created_at,
  };
}

function takafulToView(x: EqubTakafulTransactionResponse): TakafulTxn {
  return {
    id: x.id,
    equbId: x.equb_group_id,
    roundId: x.equb_round_id,
    memberId: x.member_id,
    type: x.type,
    amount: num(x.amount),
    reference: x.reference,
    createdAt: x.created_at,
  };
}

function settlementToView(s: EqubTakafulSettlementResponse): TakafulSettlement {
  return {
    type: s.type,
    totalAmount: num(s.total_amount),
    remainingBalance: num(s.remaining_balance),
    items: (s.items ?? []).map((i) => ({ memberId: i.member_id, type: i.type, amount: num(i.amount) })),
  };
}

const mapAppStatus = (s: string): ApplicationStatus =>
  s === "approved" ? "accepted" : s === "rejected" ? "rejected" : s === "under_review" ? "under_review" : s === "draft" ? "draft" : "submitted";

function regToApplication(r: MemberRegistrationRequestResponse): Application {
  // registration_data is a JSON blob that may carry the richer KYC fields.
  let extra: Record<string, unknown> = {};
  try { extra = r.registration_data ? JSON.parse(r.registration_data) : {}; } catch { /* ignore */ }
  const num = (k: string) => (typeof extra[k] === "number" ? (extra[k] as number) : 0);
  const str = (k: string) => (typeof extra[k] === "string" ? (extra[k] as string) : undefined);
  return {
    id: r.id,
    fullName: r.full_name || `${r.first_name} ${r.last_name}`.trim(),
    displayHandle: str("display_handle") || (r.first_name || r.full_name || "").toLowerCase(),
    gender: (str("gender") as "male" | "female") || "male",
    age: num("age"),
    faydaId: str("fayda_id") || str("national_id") || "—",
    phone: r.phone_number,
    occupation: str("occupation") || "—",
    estimatedMonthlyIncome: num("estimated_monthly_income"),
    categoryId: str("scheme_id") || str("equb_scheme_id") || str("tier_id") || "",
    status: mapAppStatus(r.status),
    submittedAt: r.created_at,
    peerVotesFor: num("peer_votes_for"),
    peerVotesAgainst: num("peer_votes_against"),
    peerVoteQuorum: num("peer_vote_quorum"),
    sharePurchased: extra["share_purchased"] === true,
    characterAttested: extra["character_attested"] === true,
    declarations: {
      shariaAccept: !!extra["decl_sharia"],
      income: !!extra["decl_income"],
      capacity: !!extra["decl_capacity"],
      commitment: !!extra["decl_commitment"],
      mutualBenefit: !!extra["decl_mutual_benefit"],
    },
    kycDocs: [],
    duplicateActiveMembership: extra["duplicate_active_membership"] === true,
    rejectionReason: r.rejection_reason || undefined,
  };
}

function agentToView(a: AgentSummaryResponse): Agent {
  return {
    id: a.id,
    name: a.full_name || `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email,
    email: a.email ?? "",
    phone: a.phone ?? "",
    active: a.status !== false,
    roles: (a.roles ?? []).map((r) => r.name),
    createdAt: a.created_at ?? "",
    branchId: a.branch_id,
  };
}

const bankToView = (b: BankResponse): Bank => ({
  id: b.id,
  name: b.name,
  code: b.code ?? "",
  address: b.address ?? "",
  city: b.city ?? "",
  country: b.country ?? "",
  phone: b.phone_number ?? "",
  active: b.status !== false,
});
/** Optional fields have a 2-char minimum on the backend, so blanks are left out rather than sent empty. */
const bankBody = (i: BankInput) => ({
  name: i.name.trim(),
  code: i.code.trim(),
  address: i.address.trim() || undefined,
  city: i.city.trim() || undefined,
  country: i.country.trim() || undefined,
  phone_number: i.phone.trim() || undefined,
  status: i.active,
});

/** Payment statuses differ between the two collections endpoints ("confirmed" vs "completed"); the UI uses "confirmed". */
const collectionStatus = (s: string) => ((s || "").toLowerCase() === "completed" ? "confirmed" : s);

function collectionsToView(r: EqubCollectionsSummaryResponse): CollectionsSummary {
  return {
    from: r.from,
    to: r.to,
    count: r.count ?? 0,
    totalCollected: num(r.total_collected),
    totalConfirmed: num(r.total_confirmed),
    totalPending: num(r.total_pending),
    items: (r.collections ?? []).map((c) => ({
      paymentId: c.payment_id,
      memberId: c.member_id,
      memberName: c.member_name || "—",
      equbId: c.group_id,
      equbName: c.group_name || "—",
      categoryId: c.scheme_id,
      categoryName: c.scheme_name || "—",
      amount: num(c.amount),
      reference: c.reference_number ?? "",
      status: collectionStatus(c.status),
      collectedAt: c.collected_at,
    })),
  };
}

const staffParams = (f: StaffFilters) => ({ search: f.search || undefined, status: f.status, branch_id: f.branchId || undefined, role_id: f.roleId || undefined, start_date: f.from || undefined, end_date: f.to || undefined });

function userToStaff(u: UserResponse): StaffMember {
  const role = (u.roles?.[0]?.name || "").toLowerCase();
  const mapped: StaffMember["role"] = role.includes("admin") ? "admin" : role.includes("manager") ? "manager" : role.includes("board") ? "board_chair" : "agent";
  // branch_id is a UUID; never show it. (No branch name comes back on this endpoint.)
  return { id: u.id, name: u.full_name, role: mapped, branch: u.branch_id && !UUID_RE.test(u.branch_id) ? u.branch_id : "—", branchId: u.branch_id, email: u.email, phone: u.phone || "—" };
}

const categoryBody = (c: EqubCategoryInput) => ({
  guarantee_required: c.guaranteeRequired,
  accepted_guarantee_types: c.acceptedGuaranteeTypes,
  name: c.name,
  description: c.description ?? "",
  frequency: c.frequency,
  contribution_amount: c.contribution,
  admin_fee: c.adminFee,
  takaful_fee: c.takafulFee,
  payout_amount: c.payout,
  members_per_group: c.membersPerEqub,
  winners_per_round: c.winnersPerRound,
  total_rounds: c.totalRounds,
});

const toPage = <A, B>(r: { items: A[]; meta: { page: number; per_page: number; total: number; total_pages: number } }, map: (a: A) => B): Page<B> => ({
  items: r.items.map(map),
  page: r.meta.page,
  perPage: r.meta.per_page,
  total: r.meta.total,
  totalPages: r.meta.total_pages,
});

// ============================================================================
export const ekubService = {
  // ---- Equb Categories (backend schemes) ----
  async listCategories(params?: { status?: string; search?: string }): Promise<EqubCategory[]> {
    return (await equbApi.listSchemes(params)).map(schemeToCategory);
  },
  async listCategoriesPage(params: { status?: string; search?: string }, page: number, perPage: number): Promise<Page<EqubCategory>> {
    return toPage(await equbApi.listSchemesPage({ ...params, page, per_page: perPage }), schemeToCategory);
  },
  async getCategory(id: string): Promise<EqubCategory> {
    return schemeToCategory(await equbApi.getScheme(id));
  },
  async createCategory(input: EqubCategoryInput): Promise<EqubCategory> {
    return schemeToCategory(await equbApi.createScheme({ code: input.code?.trim() || undefined, ...categoryBody(input) }));
  },
  async updateCategory(id: string, input: EqubCategoryInput): Promise<EqubCategory> {
    return schemeToCategory(await equbApi.updateScheme(id, { code: input.code?.trim() || undefined, ...categoryBody(input), status: input.status }));
  },
  async deleteCategory(id: string): Promise<void> {
    await equbApi.deleteScheme(id);
  },

  // ---- Equbs (backend groups) ----
  async listEqubs(filters: EqubListFilters = {}): Promise<Equb[]> {
    const rows = await equbApi.listGroups({
      equb_scheme_id: filters.categoryId || undefined,
      status: filters.status && filters.status !== "all" ? filters.status : undefined,
      search: filters.search || undefined,
      per_page: 100,
    });
    return rows.map(groupToEqub);
  },
  async listEqubsPage(filters: EqubListFilters, page: number, perPage: number): Promise<Page<Equb>> {
    return toPage(
      await equbApi.listGroupsPage({
        equb_scheme_id: filters.categoryId || undefined,
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        search: filters.search || undefined,
        page,
        per_page: perPage,
      }),
      groupToEqub
    );
  },
  async getEqub(id: string): Promise<Equb> {
    return groupToEqub(await equbApi.getGroup(id));
  },
  async getEqubDashboard(id: string): Promise<EqubDashboard> {
    return dashboardToView(await equbApi.dashboard(id));
  },
  async createEqub(input: EqubInput): Promise<Equb> {
    return groupToEqub(
      await equbApi.createGroup({
        name: input.name,
        code: input.code?.trim() || undefined,
        equb_scheme_id: input.categoryId,
        max_members: input.maxMembers,
        start_date: input.startDate || undefined,
        expected_end_date: input.expectedEndDate || undefined,
        ...overridesToDto(input.overrides),
        ...sharesToDto(input.feeShares, input.brokerUserId),
      })
    );
  },
  async updateEqub(id: string, input: EqubUpdateInput): Promise<Equb> {
    return groupToEqub(
      await equbApi.updateGroup(id, {
        name: input.name,
        code: input.code?.trim() || undefined,
        max_members: input.maxMembers,
        start_date: input.startDate || undefined,
        expected_end_date: input.expectedEndDate || undefined,
        clear_term_overrides: input.clearOverrides || undefined,
        ...overridesToDto(input.overrides),
        ...sharesToDto(input.feeShares, input.brokerUserId),
      })
    );
  },
  async activateEqub(id: string, startDate: string): Promise<void> {
    await equbApi.activateGroup(id, startDate);
  },
  async cancelEqub(id: string, reason: string): Promise<void> {
    await equbApi.cancelGroup(id, reason);
  },
  async extendEqub(id: string, additionalRounds: number, reason: string): Promise<void> {
    await equbApi.extendGroup(id, additionalRounds, reason);
  },
  async deleteEqub(id: string): Promise<void> {
    await equbApi.deleteGroup(id);
  },
  async autoCancel(): Promise<void> {
    await equbApi.autoCancel();
  },
  /** Start the next cycle of a finished Equb: a new draft carrying its terms and roster. */
  async cloneEqub(id: string, input: CloneEqubInput): Promise<ClonedEqub> {
    const r = await equbApi.cloneGroup(id, {
      name: input.name?.trim() || undefined,
      code: input.code?.trim() || undefined,
      max_members: input.maxMembers || undefined,
      start_date: input.startDate || undefined,
      copy_members: input.copyMembers,
      carry_over_missed_payments: input.carryOverMissedPayments,
    });
    return { equb: groupToEqub(r.group), previousEqubCode: r.previous_group_code, membersCopied: r.members_copied ?? 0, bansCarriedOver: r.bans_carried_over ?? 0, nextStep: r.next_step ?? "" };
  },
  async assignManager(id: string, managerUserId: string): Promise<ManagerAssignment> {
    const r = await equbApi.assignManager(id, managerUserId);
    return { changed: r.changed, managerUserId: r.manager_user_id, previousManagerUserId: r.previous_manager_user_id || undefined };
  },
  /** Staff users for the manager picker (GET /users?search=). */
  async searchStaffUsers(search: string): Promise<StaffUser[]> {
    // Agents are who normally run an Equb; /users adds other staff. Query both,
    // tolerate either failing (permissions differ), merge by user id.
    const q = search.trim() || undefined;
    const [agents, users] = await Promise.all([
      equbApi.listAgents({ search: q, status: "true", page: 1, per_page: 20 }).catch(() => []),
      equbApi.listUsers({ search: q, page: 1, per_page: 20 }).catch(() => []),
    ]);
    const out = new Map<string, StaffUser>();
    for (const a of agents) {
      out.set(a.id, {
        id: a.id,
        fullName: a.full_name || `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email,
        email: a.email ?? "",
        phone: a.phone ?? "",
        role: a.roles?.map((r) => r.name).join(", ") || a.job_title || "Agent",
      });
    }
    for (const u of users) {
      if (out.has(u.id) || u.status === false) continue;
      out.set(u.id, {
        id: u.id,
        fullName: u.full_name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email,
        email: u.email ?? "",
        phone: u.phone ?? "",
        role: u.roles?.map((r) => r.name).join(", ") ?? "",
      });
    }
    return [...out.values()];
  },

  // ---- Equb members ----
  async listEqubMembers(equbId: string, status?: string): Promise<EqubMember[]> {
    const rows = await equbApi.listGroupMembers(equbId, { status: status && status !== "all" ? status : undefined, per_page: 500 });
    return rows.map(memberToView).sort((a, b) => a.position - b.position);
  },
  async listEqubMembersPage(equbId: string, status: string | undefined, page: number, perPage: number): Promise<Page<EqubMember>> {
    return toPage(await equbApi.listGroupMembersPage(equbId, { status: status && status !== "all" ? status : undefined, page, per_page: perPage }), memberToView);
  },
  async getMemberProfile(id: string): Promise<MemberProfile> {
    const m = await equbApi.getMember(id);
    const a = m.current_address ?? undefined;
    const address = [a?.house_number && `#${a.house_number}`, a?.neighborhood, a?.kebele && `Kebele ${a.kebele}`, a?.district, a?.subcity, a?.zone, a?.region].filter(Boolean).join(", ");
    return {
      id: m.id,
      fullName: m.full_name || [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(" "),
      email: m.email ?? "",
      phone: m.phone_number ?? "",
      gender: m.gender ?? "",
      age: m.age || undefined,
      membershipNumber: m.membership_number ?? "—",
      category: m.member_category ?? "",
      photo: m.photo || undefined,
      status: m.status ?? "",
      memberSince: m.created_at ?? "",
      branch: m.branch?.name ?? "",
      address,
      emergencyContacts: (m.emergency_contacts ?? []).map((c) => ({ name: c.full_name, phone: c.phone_number ?? "", relationship: c.relationship ?? "" })),
    };
  },
  async searchMembers(query: string): Promise<MemberSummary[]> {
    if (!query.trim()) return [];
    return (await equbApi.searchMembers(query.trim())).map(saccoMemberToSummary);
  },
  async addMember(equbId: string, memberId: string): Promise<void> {
    await equbApi.addMember(equbId, memberId);
  },
  async removeMember(equbId: string, memberId: string): Promise<void> {
    await equbApi.removeMember(equbId, memberId);
  },
  async setMemberSuspended(equbId: string, memberId: string, suspend: boolean, reason?: string): Promise<void> {
    if (suspend) await equbApi.suspendMember(equbId, memberId, reason ?? "");
    else await equbApi.unsuspendMember(equbId, memberId);
  },
  async swapPositions(equbId: string, memberId1: string, memberId2: string): Promise<void> {
    await equbApi.swapPositions(equbId, memberId1, memberId2);
  },

  // ---- Rounds ----
  async listRounds(equbId: string, status?: string): Promise<Round[]> {
    const rows = await equbApi.listRounds(equbId, { status: status && status !== "all" ? status : undefined, per_page: 200 });
    return rows.map(roundToView).sort((a, b) => a.roundNumber - b.roundNumber);
  },
  async getRound(roundId: string): Promise<Round> {
    return roundToView(await equbApi.getRound(roundId));
  },
  async getDrawPreview(roundId: string): Promise<DrawPreview> {
    return previewToView(await equbApi.drawPreview(roundId));
  },
  /** Re-check every undrawn round and advance the ones now ready to draw. */
  async refreshReadiness(): Promise<void> {
    await equbApi.refreshReadiness();
  },

  // ---- Recording a contribution for a member ----
  async getMemberStanding(equbId: string, memberId: string): Promise<MemberStanding> {
    const s = await equbApi.memberStanding(equbId, memberId);
    return {
      status: s.status,
      good: !!s.good,
      banned: !!s.banned,
      bannedUntilRound: s.banned_until_round ?? 0,
      warningIssued: !!s.warning_issued,
      missedCount: s.missed_count ?? 0,
      currentRound: s.current_round ?? 0,
      eligibleNextDraw: !!s.eligible_next_draw,
      unpaidRounds: s.unpaid_rounds ?? 0,
      unpaidAmount: num(s.unpaid_amount),
      catchUpRounds: s.catch_up_rounds ?? 0,
      catchUpAmount: num(s.catch_up_amount),
      whatToDo: s.what_to_do ?? [],
    };
  },
  async recordPayment(equbId: string, memberId: string, input: RecordPaymentInput): Promise<RecordedPayment> {
    const r = await equbApi.collectContribution(
      equbId,
      memberId,
      { round_ids: input.roundIds, is_catch_up: input.isCatchUp || undefined, method: (input.method || undefined) as never, reference: input.reference?.trim() || undefined, description: input.description?.trim() || undefined, bank_id: input.method === "bank_transfer" ? input.bankId || undefined : undefined },
      input.proof ? { file: input.proof.file, description: input.proof.description?.trim() || undefined } : undefined
    );
    return { paymentId: r.payment_id, status: r.status || "pending", totalAmount: num(r.total_amount ?? r.amount), attachmentsFiled: r.attachments?.length ?? 0, attachmentWarning: r.attachment_warning || undefined };
  },

  /** Settle a recorded collection: marks its payment completed (needs approval rights). */
  async confirmPayment(paymentId: string, notes?: string): Promise<void> {
    await equbApi.updatePaymentStatus(paymentId, { status: "completed", notes: notes?.trim() || undefined });
  },
  /** Turn down a recorded collection: cancels its payment so the contribution stays unpaid. */
  async rejectPayment(paymentId: string, reason: string): Promise<void> {
    await equbApi.updatePaymentStatus(paymentId, { status: "cancelled", notes: reason.trim() || undefined, failure_reason: reason.trim() || undefined });
  },
  /** Catch-up a member owes for missed rounds (staff view). */
  async getCatchUp(equbId: string, memberId: string): Promise<CatchUp> {
    const r = await equbApi.catchUpAmount(equbId, memberId);
    return { roundsMissed: r.rounds_missed ?? 0, perRoundAmount: num(r.per_round_amount), totalCatchUp: num(r.total_catch_up), nextRoundNumber: r.next_round_number ?? 0 };
  },
  /** Contributions the signed-in staff member recorded in a period. */
  async listMyCollections(f: CollectionsFilters = {}): Promise<CollectionsSummary> {
    const r = await equbApi.myCollections({ from: f.from || undefined, to: f.to || undefined, group_id: f.equbId || undefined, scheme_id: f.categoryId || undefined, member_id: f.memberId || undefined });
    return collectionsToView(r);
  },
  /** Every agent's collections (GET /equb/admin/collections), one page at a time. */
  async listAllCollections(f: CollectionsFilters = {}, page = 1, perPage = 20): Promise<CollectionsPage> {
    const r = await equbApi.adminCollections({
      from: f.from || undefined,
      to: f.to || undefined,
      group_id: f.equbId || undefined,
      scheme_id: f.categoryId || undefined,
      member_id: f.memberId || undefined,
      collected_by: f.collectedBy || undefined,
      status: f.status || undefined,
      page,
      per_page: perPage,
    });
    const view = collectionsToView(r);
    return { ...view, page, perPage, hasMore: view.items.length >= perPage };
  },

  // ---- SACCO-wide fee ledger ----
  async getFeeLedger(f: FeeLedgerFilters, page: number, perPage: number): Promise<FeeLedger> {
    const r = await equbApi.feeLedger({
      scheme_id: f.categoryId || undefined,
      group_id: f.equbId || undefined,
      round_id: f.roundId || undefined,
      member_id: f.memberId || undefined,
      status: f.status && f.status !== "all" ? f.status : undefined,
      page,
      per_page: perPage,
    });
    const t = r.totals;
    return {
      items: (r.records ?? []).map((l) => ({
        contributionId: l.contribution_id,
        memberId: l.member_id,
        memberName: l.member_name,
        membershipNumber: l.membership_number,
        equbId: l.group_id,
        equbCode: l.group_code,
        equbName: l.group_name,
        categoryId: l.scheme_id,
        categoryName: l.scheme_name,
        roundId: l.round_id,
        roundNumber: l.round_number,
        scheduledAt: l.scheduled_at,
        contribution: num(l.contribution_amount),
        adminFee: num(l.admin_fee),
        takafulFee: num(l.takaful_fee),
        total: num(l.total_amount),
        status: l.status,
        collected: !!l.collected,
        isCatchUp: !!l.is_catch_up,
        paidAt: l.paid_at,
        paymentId: l.payment_id ?? "",
        bankId: l.bank_id ?? "",
        bankName: l.bank_name ?? "",
      })),
      page: r.page ?? page,
      perPage: r.per_page ?? perPage,
      total: r.total ?? 0,
      totalPages: Math.max(1, Math.ceil((r.total ?? 0) / (r.per_page || perPage))),
      totals: {
        contributions: t?.contributions ?? 0,
        members: t?.members ?? 0,
        rounds: t?.rounds ?? 0,
        contributionCharged: num(t?.contribution_charged),
        contributionCollected: num(t?.contribution_collected),
        adminFeeCharged: num(t?.admin_fee_charged),
        adminFeeCollected: num(t?.admin_fee_collected),
        takafulCharged: num(t?.takaful_fee_charged),
        takafulCollected: num(t?.takaful_fee_collected),
        totalCharged: num(t?.total_charged),
        totalCollected: num(t?.total_collected),
      },
    };
  },

  // ---- Contribution attachments ----
  async listRoundAttachments(roundId: string): Promise<ContributionAttachment[]> {
    return ((await equbApi.listRoundAttachments(roundId)).records ?? []).map(attachmentToView);
  },
  /**
   * Everything behind one payment: the contributions it covers (fee-ledger
   * lines carrying its payment id; the ledger has no payment filter, so it is
   * narrowed by member/Equb and matched here) and the slips filed against
   * them. One slip is stored once but filed on every contribution the payment
   * covers, so the same file comes back per contribution and is shown once.
   */
  async getPaymentDetail(paymentId: string, scope: { memberId?: string; equbId?: string }): Promise<PaymentDetail> {
    const ledger = await ekubService.getFeeLedger({ memberId: scope.memberId, equbId: scope.equbId }, 1, 1000);
    const lines = ledger.items.filter((l) => l.paymentId === paymentId).sort((a, b) => a.roundNumber - b.roundNumber);
    const lists = await Promise.all(lines.map((l) => equbApi.listContributionAttachments(l.contributionId).then((r) => (r.records ?? []).map(attachmentToView))));
    const seen = new Set<string>();
    const attachments: ContributionAttachment[] = [];
    for (const a of lists.flat()) {
      const key = `${a.fileName}|${a.fileSize}|${a.description}|${a.createdAt.slice(0, 16)}`;
      if (seen.has(a.id) || seen.has(key)) continue;
      seen.add(a.id).add(key);
      attachments.push(a);
    }
    return { lines, attachments };
  },
  async uploadAttachment(contributionId: string, file: File, description?: string): Promise<ContributionAttachment> {
    return attachmentToView(await equbApi.uploadContributionAttachment(contributionId, file, description));
  },
  async deleteAttachment(contributionId: string, attachmentId: string): Promise<void> {
    await equbApi.deleteContributionAttachment(contributionId, attachmentId);
  },
  async downloadAttachment(contributionId: string, attachmentId: string): Promise<Blob> {
    return equbApi.downloadContributionAttachment(contributionId, attachmentId);
  },

  // ---- Admin fee ledgers ----
  async getEqubAdminFees(equbId: string): Promise<EqubAdminFees> {
    const r = await equbApi.groupAdminFees(equbId);
    return {
      feePerMemberPerRound: num(r.fee_per_member_per_round),
      totals: totalsToView(r.totals),
      split: splitToView(r.split),
      rounds: (r.rounds ?? []).map((x) => ({ roundId: x.round_id, roundNumber: x.round_number, scheduledAt: x.scheduled_at, status: x.status, members: x.members, paidCount: x.paid_count, totals: totalsToView(x.totals) })),
      members: (r.members ?? []).map((x) => ({ memberId: x.member_id, name: x.member_name, membershipNumber: x.membership_number, rounds: x.rounds, paidCount: x.paid_count, totals: totalsToView(x.totals) })),
    };
  },
  async getRoundAdminFees(roundId: string): Promise<RoundAdminFees> {
    const r = await equbApi.roundAdminFees(roundId);
    return { roundId: r.round_id, roundNumber: r.round_number, status: r.status, totals: totalsToView(r.totals), split: splitToView(r.split), lines: (r.lines ?? []).map(feeLineToView) };
  },
  async getMemberAdminFees(equbId: string, memberId: string): Promise<MemberAdminFees> {
    const r = await equbApi.memberAdminFees(equbId, memberId);
    // The live API omits member_name / membership_number on this endpoint.
    return { memberId: r.member_id, name: r.member_name ?? "", membershipNumber: r.membership_number ?? "", totals: totalsToView(r.totals), lines: (r.lines ?? []).map(feeLineToView) };
  },

  async executeDraw(roundId: string): Promise<Round> {
    await equbApi.executeDraw(roundId);
    return roundToView(await equbApi.getRound(roundId));
  },

  // ---- Winners / guarantees / payouts ----
  async listRoundWinners(roundId: string, roundNumber?: number): Promise<Winner[]> {
    return (await equbApi.listWinners(roundId)).map((w) => winnerToView(w, roundNumber));
  },
  /** Winners across every drawn round of an Equb (payouts & guarantees view). */
  async listEqubWinners(equbId: string): Promise<Winner[]> {
    const rounds = await equbApi.listRounds(equbId, { per_page: 200 });
    const drawn = rounds.filter((r) => {
      const s = mapRoundStatus(r.status);
      return s === "drawn" || s === "completed" || (r.winners?.length ?? 0) > 0;
    });
    const lists = await Promise.all(
      drawn.map((r) => equbApi.listWinners(r.id).then((ws) => ws.map((w) => winnerToView(w, r.round_number))).catch(() => []))
    );
    return lists.flat().sort((a, b) => (b.roundNumber ?? 0) - (a.roundNumber ?? 0) || a.position - b.position);
  },
  async createGuarantee(winnerId: string, body: GuaranteeInput): Promise<Guarantee> {
    return guaranteeToView(
      await equbApi.createGuarantee(winnerId, {
        guarantee_type: body.guaranteeType,
        guarantor_name: body.guarantorName,
        guarantor_member_id: body.guarantorMemberId || undefined,
        collateral_type: body.collateralType || undefined,
        collateral_reference: body.collateralReference || undefined,
        collateral_value: body.collateralValue || undefined,
      })
    );
  },
  async approveGuarantee(guaranteeId: string): Promise<void> {
    await equbApi.approveGuarantee(guaranteeId);
  },
  async rejectGuarantee(guaranteeId: string, reviewNote: string): Promise<void> {
    await equbApi.rejectGuarantee(guaranteeId, reviewNote);
  },
  /** For Equbs whose terms don't require a guarantee. */
  async approveWinner(winnerId: string): Promise<void> {
    await equbApi.approveWinner(winnerId);
  },
  async processPayout(winnerId: string): Promise<void> {
    await equbApi.processPayout(winnerId);
  },

  // ---- Hardship early-turn (emergency draws) ----
  async listEmergencyDraws(equbId: string, status?: string): Promise<EmergencyDrawRequest[]> {
    return (await equbApi.listEmergencyDraws(equbId, status ? { status } : undefined)).map(emergencyToView);
  },
  async decideEmergencyDraw(id: string, decision: "approve" | "reject", note?: string): Promise<void> {
    if (decision === "approve") await equbApi.approveEmergencyDraw(id, note);
    else await equbApi.rejectEmergencyDraw(id, note ?? "");
  },
  async submitEmergencyDraw(equbId: string, memberId: string, reason: string, evidence?: string): Promise<void> {
    await equbApi.submitEmergencyDraw(equbId, memberId, reason, evidence);
  },

  // ---- Takaful ----
  async listTakaful(equbId: string, f?: { roundId?: string; type?: string }): Promise<TakafulTxn[]> {
    return (await equbApi.listTakaful(equbId, { round_id: f?.roundId || undefined, type: f?.type || undefined })).map(takafulToView);
  },
  async listTakafulPage(equbId: string, page: number, perPage: number): Promise<Page<TakafulTxn>> {
    return toPage(await equbApi.listTakafulPage(equbId, page, perPage), takafulToView);
  },
  async getTakafulBalance(equbId: string): Promise<number> {
    return num((await equbApi.takafulBalance(equbId))?.balance);
  },
  async distributeSurplus(equbId: string): Promise<TakafulSettlement> {
    return settlementToView(await equbApi.distributeSurplus(equbId));
  },
  async submitTakafulClaim(equbId: string, memberId: string, amount: number, reason: string): Promise<void> {
    await equbApi.submitTakafulClaim(equbId, memberId, amount, reason);
  },
  async refundTakaful(equbId: string, reason: string): Promise<TakafulSettlement> {
    return settlementToView(await equbApi.refundTakaful(equbId, reason));
  },

  // ---- Contributions (global admin op) ----
  async markOverdue(): Promise<void> {
    await equbApi.markOverdue();
  },

  // ---- Applications (registration requests) ----
  async listApplications(params: { status?: ApplicationStatus | "all"; search?: string } = {}): Promise<Application[]> {
    let rows: Application[];
    if (!USE_MOCK) rows = (await equbApi.listRegistrationRequests()).map(regToApplication);
    else { await delay(); rows = clone(db.applications); }
    if (params.status && params.status !== "all") rows = rows.filter((a) => a.status === params.status);
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter((a) => a.fullName.toLowerCase().includes(q) || a.faydaId.includes(q) || a.displayHandle.includes(q));
    }
    return rows;
  },
  async decideApplication(id: string, decision: "accept" | "reject", reason?: string): Promise<void> {
    if (!USE_MOCK) {
      if (decision === "accept") await equbApi.approveRegistration(id);
      else await equbApi.rejectRegistration(id, reason ?? "");
      return;
    }
    await delay();
    const app = db.applications.find((a) => a.id === id);
    if (!app) throw new Error("Application not found");
    app.status = decision === "accept" ? "accepted" : "rejected";
    if (decision === "reject") app.rejectionReason = reason;
  },

  // ---- Payments (no dedicated global admin endpoint yet → mock) ----
  async listPayments(params: { timing?: string; search?: string } = {}): Promise<Payment[]> {
    await delay();
    let rows = clone(db.payments);
    if (params.timing && params.timing !== "all") rows = rows.filter((p) => p.timing === params.timing);
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter((p) => p.memberHandle.includes(q) || p.ekubNumber.toLowerCase().includes(q) || p.receiptNo.toLowerCase().includes(q));
    }
    return rows;
  },
  async flagOutage(paymentId: string): Promise<Payment> {
    await delay();
    const p = db.payments.find((x) => x.id === paymentId);
    if (!p) throw new Error("Payment not found");
    p.timing = "outage_grace";
    return clone(p);
  },
  async listReconciliation(): Promise<ReconciliationRow[]> {
    await delay();
    return clone(db.reconciliation);
  },
  async reconcile(id: string): Promise<ReconciliationRow> {
    await delay();
    const r = db.reconciliation.find((x) => x.id === id);
    if (!r) throw new Error("Row not found");
    r.reconciled = true;
    return clone(r);
  },

  // ---- Disputes (no equb endpoint yet → mock) ----
  async listDisputes(): Promise<Dispute[]> {
    await delay();
    return clone(db.disputes);
  },
  async escalateDispute(id: string): Promise<Dispute> {
    await delay();
    const d = db.disputes.find((x) => x.id === id);
    if (!d) throw new Error("Dispute not found");
    d.status = "escalated";
    return clone(d);
  },
  async resolveDispute(id: string, resolution: string, boardDecision: string): Promise<Dispute> {
    await delay();
    const d = db.disputes.find((x) => x.id === id);
    if (!d) throw new Error("Dispute not found");
    d.status = "resolved";
    d.resolution = resolution;
    d.boardDecision = boardDecision;
    return clone(d);
  },

  // ---- Staff (real /users) ----
  async listStaff(): Promise<StaffMember[]> {
    if (!USE_MOCK) return (await equbApi.listUsers()).map(userToStaff);
    await delay();
    return clone(db.staff);
  },
  // ---- Agents (GET /agents) ----
  async listAgentsPage(f: StaffFilters, page: number, perPage: number): Promise<Page<Agent>> {
    return toPage(await equbApi.listAgentsPage({ ...staffParams(f), page, per_page: perPage }), agentToView);
  },
  async listBranches(): Promise<Branch[]> {
    return (await equbApi.listBranches()).map((b) => ({ id: b.id, name: b.name, code: b.branch_code ?? "" }));
  },
  async listActiveBanks(): Promise<Bank[]> {
    return (await equbApi.activeBanks()).map(bankToView);
  },
  async listBanks(search?: string): Promise<Bank[]> {
    return (await equbApi.listBanks({ search: search || undefined })).map(bankToView);
  },
  async createBank(input: BankInput): Promise<Bank> {
    return bankToView(await equbApi.createBank({ ...bankBody(input), name: input.name.trim(), code: input.code.trim() }));
  },
  async updateBank(id: string, input: BankInput): Promise<Bank> {
    return bankToView(await equbApi.updateBank(id, bankBody(input)));
  },
  async deleteBank(id: string): Promise<void> {
    await equbApi.deleteBank(id);
  },
  /**
   * Mobile money providers. The only source is the member portal's providers
   * endpoint, which may refuse a staff token; an empty list then just hides
   * the picker.
   */
  async listMobileMoneyProviders(): Promise<MobileMoneyProvider[]> {
    try {
      return ((await equbApi.paymentProviders()).mobile_money ?? []).map((m) => ({ code: m.code, name: m.name || m.code }));
    } catch {
      return [];
    }
  },
  async listUserRoles(): Promise<UserRole[]> {
    return (await equbApi.listUserRoles()).map((r) => ({ id: r.id, name: r.name }));
  },
  async getAgent(id: string): Promise<Agent> {
    return agentToView(await equbApi.getAgent(id));
  },
  async listStaffPage(f: StaffFilters, page: number, perPage: number): Promise<Page<StaffMember>> {
    const search = f.search;
    if (USE_MOCK) {
      await delay();
      const all = clone(db.staff).filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));
      return { items: all.slice((page - 1) * perPage, page * perPage), page, perPage, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / perPage)) };
    }
    return toPage(await equbApi.listUsersPage({ ...staffParams(f), page, per_page: perPage }), userToStaff);
  },
};
