import * as db from "@/lib/mock/mock-db";
import { equbApi } from "@/services/equb-api";
import { useEqubStore } from "@/store/equb.store";
import type {
  Application,
  ApplicationStatus,
  Cadence,
  Draw,
  Dispute,
  Group,
  GroupMember,
  EligibilityPreview,
  Payment,
  Payout,
  Penalty,
  Tier,
  TakafulTxn,
  HardshipRequest,
  OverviewStats,
  ReconciliationRow,
  StaffMember,
  RoleDef,
} from "@/types/ekub";
import type {
  EqubAdminDashboardResponse,
  EqubDrawPreviewResponse,
  EqubEmergencyDrawResponse,
  EqubGroupResponse,
  EqubMemberResponse,
  EqubRoundResponse,
  EqubSchemeResponse,
  EqubTakafulTransactionResponse,
  EqubWinnerResponse,
  MemberRegistrationRequestResponse,
  UserResponse,
} from "@/types/equb-api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const activeGroup = () => useEqubStore.getState().activeGroupId;

function makeSeed(): string {
  let s = "";
  for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

// ============================================================================
// DTO → view-model mappers (real API shape → the camelCase types pages render)
// ============================================================================
const cadence = (f: string): Cadence =>
  f === "weekly" || f === "monthly" ? f : "daily";

function schemeToTier(s: EqubSchemeResponse): Tier {
  return {
    id: s.id,
    name: s.name,
    contribution: s.contribution_amount,
    serviceFee: s.admin_fee,
    participationFee: 0, // backend folds participation into admin_fee
    groupSize: s.members_per_group,
    winnersPerDraw: s.winners_per_round,
    fixedPayout: s.payout_amount,
    contributionCadence: cadence(s.frequency),
    drawCadence: cadence(s.frequency),
    tabarruPercent: s.takaful_fee, // NOTE: backend stores an amount, shown as-is
    requiresProperty: s.payout_amount >= 1_000_000,
  };
}

function groupToView(g: EqubGroupResponse): Group {
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    status: g.status,
    schemeId: g.equb_scheme_id,
    currentMembers: g.current_members,
    maxMembers: g.max_members,
    startDate: g.start_date,
    expectedEndDate: g.expected_end_date,
  };
}

function mockGroupToView(g: db.MockGroup): Group {
  return { ...g };
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
    tierId: str("scheme_id") || str("tier_id") || "",
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

function dashboardToOverview(d: EqubAdminDashboardResponse): OverviewStats {
  const denom = d.paid_this_round + d.unpaid_this_round;
  const rate = denom > 0 ? Math.round((d.paid_this_round / denom) * 1000) / 10 : 0;
  return {
    activeMembers: d.active_members,
    collectionRate: rate,
    upcomingDraws: d.draw_status === "scheduled" || d.draw_status === "ready" ? 1 : 0,
    flaggedDisputes: 0,
    guarantorExposure: d.total_payouts,
    pendingApprovals: 0,
    takafulBalance: d.takaful_balance,
    collectionsTrend: [],
    membersByTier: [],
  };
}

const mapRoundStatus = (s: string): Draw["status"] =>
  s === "completed" || s === "drawn" ? "completed" : s === "active" || s === "ongoing" || s === "live" ? "live" : s === "postponed" ? "postponed" : "scheduled";

function roundToDraw(r: EqubRoundResponse): Draw {
  return {
    id: r.id,
    tierId: r.equb_group_id,
    round: r.round_number,
    scheduledAt: r.scheduled_at,
    status: mapRoundStatus(r.status),
    locked: !(r.status === "pending" || r.status === "scheduled") || !r.can_execute_draw,
    eligibleCount: r.eligible_count,
    winnersPerDraw: r.winners?.length || 0,
    winners: (r.winners || []).map((w) => ({ ekubNumber: `#${w.winner_position}`, displayHandle: w.member_name })),
  };
}

const mapPayoutStatus = (s: string): Payout["status"] =>
  s === "paid" || s === "released" ? "released" : s === "approved" ? "approved" : "pending";

function winnerToPayout(w: EqubWinnerResponse): Payout {
  return {
    id: w.id,
    winnerHandle: w.member?.display_name || w.member?.full_name || w.member_id,
    ekubNumber: w.member?.membership_number || `#${w.winner_position}`,
    tierId: activeGroup() || "",
    amount: w.payout_amount,
    status: mapPayoutStatus(w.status),
    requiresProperty: false,
    drawCompletedAt: w.created_at,
  };
}

function emergencyToHardship(e: EqubEmergencyDrawResponse): HardshipRequest {
  const reason: HardshipRequest["reason"] = /ill|health|sick/i.test(e.reason)
    ? "illness"
    : /death|family/i.test(e.reason)
    ? "family_death"
    : "business_need";
  const status: HardshipRequest["status"] =
    e.status === "approved" || e.status === "released" ? "released" : e.status === "rejected" || e.status === "declined" ? "declined" : e.status === "proposed" ? "proposed" : "requested";
  return { id: e.id, memberHandle: e.member_id, ekubNumber: "—", tierId: e.equb_group_id, reason, evidenceUrl: undefined, consentReceived: 0, consentRequired: 0, status };
}

function memberToGroupMember(m: EqubMemberResponse): GroupMember {
  return {
    id: m.id,
    memberId: m.member_id,
    handle: m.member?.display_name || m.member?.full_name || m.member_id,
    ekubNumber: m.member?.membership_number || "—",
    position: m.position,
    status: m.status,
  };
}

function previewToEligibility(p: EqubDrawPreviewResponse): EligibilityPreview {
  return {
    canExecute: p.can_execute_draw,
    reason: p.reason,
    eligibleCount: p.eligible_count,
    excludedCount: p.excluded_count,
    totalMembers: p.total_members,
    winnersPerRound: p.winners_per_round,
    members: (p.eligible_members || []).map((m) => ({
      memberId: m.member_id,
      handle: m.member_name,
      position: m.position,
      contributionPaid: m.contribution_paid,
      previouslyWon: m.previously_won,
      eligible: m.eligible,
    })),
  };
}

function takafulToView(x: EqubTakafulTransactionResponse): TakafulTxn {
  return { id: x.id, memberHandle: x.member_id, type: x.type, amount: x.amount, reference: x.reference, createdAt: x.created_at };
}

function userToStaff(u: UserResponse): StaffMember {
  const role = (u.roles?.[0]?.name || "").toLowerCase();
  const mapped: StaffMember["role"] = role.includes("admin") ? "admin" : role.includes("manager") ? "manager" : role.includes("board") ? "board_chair" : "agent";
  return { id: u.id, name: u.full_name, role: mapped, branch: u.branch_id || "—", email: u.email, phone: u.phone || "—" };
}

function memberToPenalty(m: EqubMemberResponse): Penalty {
  return {
    id: m.id,
    memberHandle: m.member?.display_name || m.member?.full_name || m.member_id,
    ekubNumber: m.member?.membership_number || "—",
    tierId: m.equb_group_id,
    trigger: "missed",
    consecutiveMisses: 0,
    drawsAffected: 0,
    status: m.status === "suspended" ? "suspended" : "at_risk",
    createdAt: m.joined_at,
  };
}

// ============================================================================
export const ekubService = {
  // ---- Groups / cycles ----
  async listGroups(): Promise<Group[]> {
    if (!USE_MOCK) return (await equbApi.listGroups()).map(groupToView);
    await delay();
    return db.groups.map(mockGroupToView);
  },

  // ---- Overview ----
  async getOverview(): Promise<OverviewStats> {
    if (!USE_MOCK) {
      const gid = activeGroup();
      if (!gid) return { activeMembers: 0, collectionRate: 0, upcomingDraws: 0, flaggedDisputes: 0, guarantorExposure: 0, pendingApprovals: 0, takafulBalance: 0, collectionsTrend: [], membersByTier: [] };
      return dashboardToOverview(await equbApi.dashboard(gid));
    }
    await delay();
    return clone(db.overview);
  },

  // ---- Tiers (Schemes) ----
  async listTiers(): Promise<Tier[]> {
    if (!USE_MOCK) return (await equbApi.listSchemes()).map(schemeToTier);
    await delay();
    return clone(db.tiers);
  },
  async saveTier(tier: Tier): Promise<Tier> {
    if (!USE_MOCK) {
      const body = {
        name: tier.name,
        description: "",
        frequency: tier.contributionCadence,
        contribution_amount: tier.contribution,
        admin_fee: tier.serviceFee + tier.participationFee,
        takaful_fee: tier.tabarruPercent,
        payout_amount: tier.fixedPayout,
        members_per_group: tier.groupSize,
        winners_per_round: tier.winnersPerDraw,
        total_rounds: Math.ceil(tier.groupSize / Math.max(1, tier.winnersPerDraw)),
      };
      return schemeToTier(await equbApi.updateScheme(tier.id, body));
    }
    await delay();
    const idx = db.tiers.findIndex((t) => t.id === tier.id);
    if (idx >= 0) db.tiers[idx] = tier;
    else db.tiers.push({ ...tier, id: `t${db.tiers.length + 1}` });
    return clone(tier);
  },
  async createTier(tier: Tier): Promise<Tier> {
    if (!USE_MOCK) {
      const s = await equbApi.createScheme({
        code: tier.name.replace(/\s+/g, "-").toUpperCase().slice(0, 12) + "-" + Math.floor(Math.random() * 900 + 100),
        name: tier.name,
        description: "",
        frequency: tier.contributionCadence,
        contribution_amount: tier.contribution,
        admin_fee: tier.serviceFee + tier.participationFee,
        takaful_fee: tier.tabarruPercent,
        payout_amount: tier.fixedPayout,
        members_per_group: tier.groupSize,
        winners_per_round: tier.winnersPerDraw,
        total_rounds: Math.ceil(tier.groupSize / Math.max(1, tier.winnersPerDraw)),
      });
      return schemeToTier(s);
    }
    await delay();
    const created = { ...tier, id: `t${db.tiers.length + 1}` };
    db.tiers.push(created);
    return clone(created);
  },
  async deleteTier(id: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.deleteScheme(id); return; }
    await delay();
    const idx = db.tiers.findIndex((t) => t.id === id);
    if (idx >= 0) db.tiers.splice(idx, 1);
  },

  // ---- Cycle (group) lifecycle ----
  async createGroup(input: { name: string; code: string; schemeId: string; maxMembers: number; startDate?: string; expectedEndDate?: string }): Promise<Group> {
    if (!USE_MOCK) {
      const g = await equbApi.createGroup({ name: input.name, code: input.code, equb_scheme_id: input.schemeId, max_members: input.maxMembers, start_date: input.startDate, expected_end_date: input.expectedEndDate });
      return groupToView(g);
    }
    await delay();
    const g: db.MockGroup = { id: `g${db.groups.length + 1}`, code: input.code, name: input.name, status: "draft", schemeId: input.schemeId, currentMembers: 0, maxMembers: input.maxMembers, startDate: input.startDate || "", expectedEndDate: input.expectedEndDate || "" };
    db.groups.push(g);
    db.groupMembers[g.id] = [];
    return mockGroupToView(g);
  },
  async activateGroup(id: string, startDate: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.activateGroup(id, startDate); return; }
    await delay();
    const g = db.groups.find((x) => x.id === id);
    if (g) { g.status = "active"; g.startDate = startDate; }
  },
  async cancelGroup(id: string, reason: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.cancelGroup(id, reason); return; }
    await delay();
    const g = db.groups.find((x) => x.id === id);
    if (g) g.status = "cancelled";
  },
  async extendGroup(id: string, additionalRounds: number, reason: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.extendGroup(id, additionalRounds, reason); return; }
    await delay();
  },
  async deleteGroup(id: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.deleteGroup(id); return; }
    await delay();
    const idx = db.groups.findIndex((x) => x.id === id);
    if (idx >= 0) db.groups.splice(idx, 1);
  },
  async autoCancel(): Promise<void> {
    if (!USE_MOCK) { await equbApi.autoCancel(); return; }
    await delay();
  },

  // ---- Group members ----
  async listMembers(): Promise<GroupMember[]> {
    const gid = activeGroup();
    if (!USE_MOCK) {
      if (!gid) return [];
      return (await equbApi.listGroupMembers(gid)).map(memberToGroupMember);
    }
    await delay();
    return clone(db.groupMembers[gid || "g1"] || []);
  },
  async addMember(memberId: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.addMember(gid, memberId); return; }
    await delay();
    const list = db.groupMembers[gid || "g1"] || (db.groupMembers[gid || "g1"] = []);
    list.push({ id: `gm${Date.now()}`, memberId, handle: memberId, ekubNumber: "—", position: list.length + 1, status: "active" });
  },
  async removeMember(equbMemberId: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.removeMember(gid, equbMemberId); return; }
    await delay();
    const list = db.groupMembers[gid || "g1"] || [];
    const idx = list.findIndex((m) => m.id === equbMemberId);
    if (idx >= 0) list.splice(idx, 1);
  },
  async setMemberSuspended(memberId: string, suspend: boolean, reason?: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) {
      if (!gid) return;
      if (suspend) await equbApi.suspendMember(gid, memberId, reason ?? "");
      else await equbApi.unsuspendMember(gid, memberId);
      return;
    }
    await delay();
    const list = db.groupMembers[gid || "g1"] || [];
    const m = list.find((x) => x.memberId === memberId || x.id === memberId);
    if (m) m.status = suspend ? "suspended" : "active";
  },
  async swapPositions(memberId1: string, memberId2: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.swapPositions(gid, memberId1, memberId2); return; }
    await delay();
    const list = db.groupMembers[gid || "g1"] || [];
    const a = list.find((m) => m.memberId === memberId1), b = list.find((m) => m.memberId === memberId2);
    if (a && b) { const p = a.position; a.position = b.position; b.position = p; }
  },

  // ---- Draw eligibility preview ----
  async getDrawPreview(roundId: string): Promise<EligibilityPreview | null> {
    if (!USE_MOCK) return previewToEligibility(await equbApi.drawPreview(roundId));
    await delay();
    const d = db.draws.find((x) => x.id === roundId);
    if (!d) return null;
    return {
      canExecute: d.status === "scheduled" && d.eligibleCount > 0,
      reason: d.eligibleCount > 0 ? "" : "No eligible members",
      eligibleCount: d.eligibleCount,
      excludedCount: 0,
      totalMembers: d.eligibleCount,
      winnersPerRound: d.winnersPerDraw || 7,
      members: [],
    };
  },

  // ---- Guarantee lifecycle ----
  async createGuarantee(winnerId: string, body: { guaranteeType: string; guarantorName: string; guarantorMemberId?: string; collateralType?: string; collateralReference?: string; collateralValue?: number }): Promise<string> {
    if (!USE_MOCK) {
      const g = await equbApi.createGuarantee(winnerId, {
        guarantee_type: body.guaranteeType, guarantor_name: body.guarantorName, guarantor_member_id: body.guarantorMemberId,
        collateral_type: body.collateralType, collateral_reference: body.collateralReference, collateral_value: body.collateralValue,
      });
      return g.id;
    }
    await delay();
    const p = db.payouts.find((x) => x.id === winnerId);
    if (p) p.primaryGuarantor = { fullName: body.guarantorName, faydaId: "—", phone: "—", relationship: "—", collateralType: (body.collateralType as never) || "check", consentSigned: true };
    return "mock-guarantee";
  },
  async approveGuarantee(guaranteeId: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.approveGuarantee(guaranteeId); return; }
    await delay();
  },
  async rejectGuarantee(guaranteeId: string, reviewNote: string): Promise<void> {
    if (!USE_MOCK) { await equbApi.rejectGuarantee(guaranteeId, reviewNote); return; }
    await delay();
  },

  // ---- Applications (registration requests) ----
  async listApplications(params: { status?: ApplicationStatus | "all"; search?: string } = {}): Promise<Application[]> {
    if (!USE_MOCK) {
      const rows = (await equbApi.listRegistrationRequests()).map(regToApplication);
      let out = rows;
      if (params.status && params.status !== "all") out = out.filter((a) => a.status === params.status);
      if (params.search) {
        const q = params.search.toLowerCase();
        out = out.filter((a) => a.fullName.toLowerCase().includes(q) || a.faydaId.includes(q) || a.displayHandle.includes(q));
      }
      return out;
    }
    await delay();
    let rows = clone(db.applications);
    if (params.status && params.status !== "all") rows = rows.filter((a) => a.status === params.status);
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter((a) => a.fullName.toLowerCase().includes(q) || a.faydaId.includes(q) || a.displayHandle.includes(q));
    }
    return rows;
  },
  async decideApplication(id: string, decision: "accept" | "reject", reason?: string): Promise<Application> {
    if (!USE_MOCK) {
      if (decision === "accept") await equbApi.approveRegistration(id);
      else await equbApi.rejectRegistration(id, reason ?? "");
      return {} as Application; // hooks refetch the list on success
    }
    await delay();
    const app = db.applications.find((a) => a.id === id);
    if (!app) throw new Error("Application not found");
    app.status = decision === "accept" ? "accepted" : "rejected";
    if (decision === "reject") app.rejectionReason = reason;
    return clone(app);
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

  // ---- Draws (group rounds) ----
  async listDraws(): Promise<Draw[]> {
    if (!USE_MOCK) {
      const gid = activeGroup();
      if (!gid) return [];
      return (await equbApi.listRounds(gid)).map(roundToDraw);
    }
    await delay();
    return clone(db.draws);
  },
  async getDraw(id: string): Promise<Draw> {
    if (!USE_MOCK) return roundToDraw(await equbApi.getRound(id));
    await delay();
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    return clone(d);
  },
  async publishDraw(id: string): Promise<Draw> {
    if (!USE_MOCK) throw new Error("Publishing/locking a round is not exposed by the backend yet.");
    await delay();
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    d.locked = true;
    return clone(d);
  },
  async rescheduleDraw(id: string, scheduledAt: string, reason: string): Promise<Draw> {
    if (!USE_MOCK) throw new Error("Rescheduling a round is not exposed by the backend yet.");
    await delay();
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    if (d.status === "completed") throw new Error("Completed draws are immutable");
    d.scheduledAt = scheduledAt;
    d.rescheduleReason = reason;
    d.status = "scheduled";
    return clone(d);
  },
  async runDraw(id: string): Promise<Draw> {
    if (!USE_MOCK) return roundToDraw(await equbApi.executeDraw(id));
    await delay(900);
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    if (d.status === "completed") throw new Error("Draw already completed — result is immutable (FR-4.17)");
    if (d.eligibleCount === 0) {
      d.status = "postponed";
      d.postponeReason = "No eligible members at draw time (FR-4.13).";
      return clone(d);
    }
    const winners = Array.from({ length: d.winnersPerDraw }, () => {
      const n = Math.floor(Math.random() * 900) + 1;
      const num = `EK-${String(n).padStart(6, "0")}`;
      return { ekubNumber: num, displayHandle: `member_${num.slice(-3)}` };
    });
    d.winners = winners;
    d.rngSeed = makeSeed();
    d.rngAlgorithm = "HMAC-SHA256 / commit-reveal v1";
    d.status = "completed";
    d.locked = true;
    return clone(d);
  },

  // ---- Payouts (winners across the group's rounds) ----
  async listPayouts(): Promise<Payout[]> {
    if (!USE_MOCK) {
      const gid = activeGroup();
      if (!gid) return [];
      const rounds = await equbApi.listRounds(gid);
      const done = rounds.filter((r) => mapRoundStatus(r.status) === "completed");
      const winnerLists = await Promise.all(done.map((r) => equbApi.listWinners(r.id)));
      return winnerLists.flat().map(winnerToPayout);
    }
    await delay();
    return clone(db.payouts);
  },
  async approvePackage(id: string): Promise<Payout> {
    if (!USE_MOCK) throw new Error("Guarantee approval requires the guarantee id (create the guarantee first).");
    await delay();
    const p = db.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    if (p.requiresProperty && !p.propertyTitleUrl) throw new Error("Immovable-property collateral required for Tier 2/3 (FR-5.5)");
    p.status = "approved";
    p.approvedAt = new Date().toISOString();
    return clone(p);
  },
  async releasePayout(id: string): Promise<Payout> {
    if (!USE_MOCK) {
      await equbApi.processPayout(id); // id = winner id
      return {} as Payout;
    }
    await delay();
    const p = db.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    if (p.status !== "approved") throw new Error("Package must be approved before release (FR-5.6)");
    p.status = "released";
    return clone(p);
  },
  async attachPropertyTitle(id: string): Promise<Payout> {
    if (!USE_MOCK) throw new Error("Collateral upload is not exposed by the backend yet.");
    await delay();
    const p = db.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    p.propertyTitleUrl = "https://picsum.photos/seed/title/600/380";
    return clone(p);
  },
  async listHardship(): Promise<HardshipRequest[]> {
    if (!USE_MOCK) {
      const gid = activeGroup();
      if (!gid) return [];
      return (await equbApi.listEmergencyDraws(gid)).map(emergencyToHardship);
    }
    await delay();
    return clone(db.hardshipRequests);
  },
  async decideHardship(id: string, decision: "approve" | "reject", note?: string): Promise<void> {
    if (!USE_MOCK) {
      if (decision === "approve") await equbApi.approveEmergencyDraw(id);
      else await equbApi.rejectEmergencyDraw(id, note ?? "");
      return;
    }
    await delay();
    const h = db.hardshipRequests.find((x) => x.id === id);
    if (h) h.status = decision === "approve" ? "released" : "declined";
  },
  async submitHardship(memberId: string, reason: string, evidence?: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.submitEmergencyDraw(gid, memberId, reason, evidence); return; }
    await delay();
    db.hardshipRequests.push({ id: `hs${Date.now()}`, memberHandle: memberId, ekubNumber: "—", tierId: gid || "g1", reason: "business_need", evidenceUrl: evidence, consentReceived: 0, consentRequired: 0, status: "requested" });
  },

  // ---- Takaful ----
  async listTakaful(): Promise<TakafulTxn[]> {
    const gid = activeGroup();
    if (!USE_MOCK) {
      if (!gid) return [];
      return (await equbApi.listTakaful(gid)).map(takafulToView);
    }
    await delay();
    return (db.takafulTxns.filter((x) => x.groupId === (gid || "g1"))).map((x) => ({ id: x.id, memberHandle: x.memberHandle, type: x.type, amount: x.amount, reference: x.reference, createdAt: x.createdAt }));
  },
  async getTakafulBalance(): Promise<number> {
    const gid = activeGroup();
    if (!USE_MOCK) {
      if (!gid) return 0;
      return (await equbApi.takafulBalance(gid)).balance;
    }
    await delay();
    return db.takafulBalances[gid || "g1"] ?? 0;
  },
  async distributeSurplus(): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.distributeSurplus(gid); return; }
    await delay();
  },
  async submitTakafulClaim(memberId: string, amount: number, reason: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.submitTakafulClaim(gid, memberId, amount, reason); return; }
    await delay();
    db.takafulTxns.push({ id: `tk${Date.now()}`, groupId: gid || "g1", memberHandle: memberId, type: "claim", amount, reference: "CLAIM", createdAt: new Date().toISOString() });
  },
  async refundTakaful(reason: string): Promise<void> {
    const gid = activeGroup();
    if (!USE_MOCK) { if (gid) await equbApi.refundTakaful(gid, reason); return; }
    await delay();
  },

  // ---- Contributions (admin op) ----
  async markOverdue(): Promise<void> {
    if (!USE_MOCK) { await equbApi.markOverdue(); return; }
    await delay();
  },

  // ---- Penalties (suspended group members) ----
  async listPenalties(): Promise<Penalty[]> {
    if (!USE_MOCK) {
      const gid = activeGroup();
      if (!gid) return [];
      const members = await equbApi.listGroupMembers(gid);
      return members.filter((m) => m.status === "suspended" || m.status === "at_risk").map(memberToPenalty);
    }
    await delay();
    return clone(db.penalties);
  },
  async liftSuspension(id: string): Promise<Penalty> {
    if (!USE_MOCK) {
      const gid = activeGroup();
      if (!gid) throw new Error("Select a cycle first.");
      await equbApi.unsuspendMember(gid, id);
      return {} as Penalty;
    }
    await delay();
    const p = db.penalties.find((x) => x.id === id);
    if (!p) throw new Error("Penalty not found");
    if (p.trigger === "turn_sale") throw new Error("Turn-selling removal is permanent (Article 11.2)");
    p.status = "at_risk";
    p.drawsAffected = 0;
    return clone(p);
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
