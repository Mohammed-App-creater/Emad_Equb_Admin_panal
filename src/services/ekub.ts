import * as db from "@/lib/mock/mock-db";
import { equbApi } from "@/services/equb-api";
import type {
  Application,
  ApplicationStatus,
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
  MemberSummary,
  Payment,
  ReconciliationRow,
  RoleDef,
  Round,
  RoundStatus,
  StaffMember,
  TakafulSettlement,
  TakafulTxn,
  Winner,
} from "@/types/ekub";
import type {
  EqubAdminDashboardResponse,
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
  MemberRegistrationRequestResponse,
  MemberSummaryResponse,
  UserResponse,
} from "@/types/equb-api";
import { EQUB_FREQUENCIES } from "@/types/equb-api";

// With NEXT_PUBLIC_USE_MOCK=true, `equbApi` is the seeded in-memory backend
// (lib/mock/mock-equb-api.ts) for every Equb entity. The modules with no
// backend endpoint yet (payments ledger, reconciliation, disputes) and the
// demo data for applications / staff / roles read lib/mock/mock-db instead.
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ============================================================================
// DTO → view-model mappers (real API shape → the camelCase types pages render)
// ============================================================================
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
    contribution: s.contribution_amount,
    adminFee: s.admin_fee ?? 0,
    takafulFee: s.takaful_fee ?? 0,
    payout: s.payout_amount,
    membersPerEqub: s.members_per_group,
    winnersPerRound: s.winners_per_round,
    totalRounds: s.total_rounds,
    createdBy: s.created_by ?? "",
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

function groupToEqub(g: EqubGroupResponse): Equb {
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    status: g.status,
    categoryId: g.equb_scheme_id,
    category: g.equb_scheme ? schemeToCategory(g.equb_scheme) : undefined,
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
    progressPercent: d.cycle_progress,
    drawStatus: d.draw_status,
    totalMembers: d.total_members,
    activeMembers: d.active_members,
    suspendedMembers: d.suspended_members,
    eligibleForDraw: d.eligible_for_draw,
    paidThisRound: d.paid_this_round,
    unpaidThisRound: d.unpaid_this_round,
    nextDueDate: d.next_due_date,
    totalCollected: d.total_collected,
    totalPayouts: d.total_payouts,
    totalAdminFees: d.total_admin_fees,
    totalTakafulFees: d.total_takaful_fees,
    takafulBalance: d.takaful_balance,
    winsDistributed: d.wins_distributed,
  };
}

function memberToView(m: EqubMemberResponse): EqubMember {
  return {
    id: m.id,
    memberId: m.member_id,
    name: m.member?.display_name || m.member?.full_name || m.member_id,
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
    scheduledAt: r.scheduled_at,
    drawnAt: r.drawn_at,
    contributionDueDate: r.contribution_due_date,
    createdAt: r.created_at,
    totalMembers: r.total_members ?? 0,
    paidCount: r.paid_count ?? 0,
    unpaidCount: r.unpaid_count ?? 0,
    paymentPercentage: r.payment_percentage ?? 0,
    totalContribution: r.total_contribution ?? 0,
    totalAdminFee: r.total_admin_fee ?? 0,
    totalTakafulFee: r.total_takaful_fee ?? 0,
    payoutAmount: r.payout_amount ?? 0,
    memberPayments: (r.member_payments ?? []).map((p) => ({
      memberId: p.member_id,
      name: p.member_name,
      phone: p.phone,
      amount: p.amount,
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
      payoutAmount: w.payout_amount,
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
    name: w.member?.display_name || w.member?.full_name || w.member_id,
    membershipNumber: w.member?.membership_number || "—",
    phone: w.member?.phone_number || "",
    position: w.winner_position,
    payoutAmount: w.payout_amount,
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
    collateralValue: g.collateral_value,
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
    reviewedBy: e.reviewed_by ?? "",
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
    amount: x.amount,
    reference: x.reference,
    createdAt: x.created_at,
  };
}

function settlementToView(s: EqubTakafulSettlementResponse): TakafulSettlement {
  return {
    type: s.type,
    totalAmount: s.total_amount,
    remainingBalance: s.remaining_balance,
    items: (s.items ?? []).map((i) => ({ memberId: i.member_id, type: i.type, amount: i.amount })),
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

function userToStaff(u: UserResponse): StaffMember {
  const role = (u.roles?.[0]?.name || "").toLowerCase();
  const mapped: StaffMember["role"] = role.includes("admin") ? "admin" : role.includes("manager") ? "manager" : role.includes("board") ? "board_chair" : "agent";
  return { id: u.id, name: u.full_name, role: mapped, branch: u.branch_id || "—", email: u.email, phone: u.phone || "—" };
}

const categoryBody = (c: EqubCategoryInput) => ({
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

// ============================================================================
export const ekubService = {
  // ---- Equb Categories (backend schemes) ----
  async listCategories(params?: { status?: string; search?: string }): Promise<EqubCategory[]> {
    return (await equbApi.listSchemes(params)).map(schemeToCategory);
  },
  async getCategory(id: string): Promise<EqubCategory> {
    return schemeToCategory(await equbApi.getScheme(id));
  },
  async createCategory(input: EqubCategoryInput): Promise<EqubCategory> {
    if (!input.code) throw new Error("Category code is required");
    return schemeToCategory(await equbApi.createScheme({ code: input.code, ...categoryBody(input) }));
  },
  async updateCategory(id: string, input: EqubCategoryInput): Promise<EqubCategory> {
    return schemeToCategory(await equbApi.updateScheme(id, { ...categoryBody(input), status: input.status }));
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
        code: input.code,
        equb_scheme_id: input.categoryId,
        max_members: input.maxMembers,
        start_date: input.startDate || undefined,
        expected_end_date: input.expectedEndDate || undefined,
      })
    );
  },
  async updateEqub(id: string, input: EqubUpdateInput): Promise<Equb> {
    return groupToEqub(
      await equbApi.updateGroup(id, {
        name: input.name,
        code: input.code,
        max_members: input.maxMembers,
        start_date: input.startDate || undefined,
        expected_end_date: input.expectedEndDate || undefined,
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

  // ---- Equb members ----
  async listEqubMembers(equbId: string, status?: string): Promise<EqubMember[]> {
    const rows = await equbApi.listGroupMembers(equbId, { status: status && status !== "all" ? status : undefined, per_page: 500 });
    return rows.map(memberToView).sort((a, b) => a.position - b.position);
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
  async processPayout(winnerId: string): Promise<void> {
    await equbApi.processPayout(winnerId);
  },

  // ---- Hardship early-turn (emergency draws) ----
  async listEmergencyDraws(equbId: string): Promise<EmergencyDrawRequest[]> {
    return (await equbApi.listEmergencyDraws(equbId)).map(emergencyToView);
  },
  async decideEmergencyDraw(id: string, decision: "approve" | "reject", note?: string): Promise<void> {
    if (decision === "approve") await equbApi.approveEmergencyDraw(id, note);
    else await equbApi.rejectEmergencyDraw(id, note ?? "");
  },
  async submitEmergencyDraw(equbId: string, memberId: string, reason: string, evidence?: string): Promise<void> {
    await equbApi.submitEmergencyDraw(equbId, memberId, reason, evidence);
  },

  // ---- Takaful ----
  async listTakaful(equbId: string): Promise<TakafulTxn[]> {
    return (await equbApi.listTakaful(equbId)).map(takafulToView);
  },
  async getTakafulBalance(equbId: string): Promise<number> {
    const r = await equbApi.takafulBalance(equbId);
    return typeof r === "number" ? r : r?.balance ?? 0;
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

  // ---- Staff / Roles (real /users + /users/roles) ----
  async listStaff(): Promise<StaffMember[]> {
    if (!USE_MOCK) return (await equbApi.listUsers()).map(userToStaff);
    await delay();
    return clone(db.staff);
  },
  async listRoles(): Promise<RoleDef[]> {
    if (!USE_MOCK) {
      const roles = await equbApi.listRoles();
      return roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: (r.permissions || []).map((p) => p.slug || p.name || "").filter(Boolean),
      }));
    }
    await delay();
    return clone(db.roles);
  },
};
