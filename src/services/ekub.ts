import * as db from "@/lib/mock/mock-db";
import type {
  Application,
  ApplicationStatus,
  Draw,
  Dispute,
  Payment,
  Payout,
  Penalty,
  Tier,
  HardshipRequest,
  OverviewStats,
  ReconciliationRow,
  StaffMember,
  RoleDef,
} from "@/types/ekub";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Small artificial latency so loading skeletons are visible during demos.
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function ensureMock() {
  if (!USE_MOCK) {
    // Real Equb API wiring will replace these mock branches once the backend
    // base URL + Swagger are provided. Kept explicit so it can't silently
    // return empty data against a misconfigured environment.
    throw new Error(
      "Real Equb API is not wired yet. Set NEXT_PUBLIC_USE_MOCK=true or implement the axios calls in services/ekub.ts."
    );
  }
}

function makeSeed(): string {
  // 16 hex chars — stand-in for a commit-reveal RNG seed (FR-4.3).
  let s = "";
  for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

export const ekubService = {
  // ---- Overview ----
  async getOverview(): Promise<OverviewStats> {
    ensureMock();
    await delay();
    return clone(db.overview);
  },

  // ---- Tiers ----
  async listTiers(): Promise<Tier[]> {
    ensureMock();
    await delay();
    return clone(db.tiers);
  },
  async saveTier(tier: Tier): Promise<Tier> {
    ensureMock();
    await delay();
    const idx = db.tiers.findIndex((t) => t.id === tier.id);
    if (idx >= 0) db.tiers[idx] = tier;
    else db.tiers.push({ ...tier, id: `t${db.tiers.length + 1}` });
    return clone(tier);
  },

  // ---- Applications ----
  async listApplications(params: { status?: ApplicationStatus | "all"; search?: string } = {}): Promise<Application[]> {
    ensureMock();
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
    ensureMock();
    await delay();
    const app = db.applications.find((a) => a.id === id);
    if (!app) throw new Error("Application not found");
    app.status = decision === "accept" ? "accepted" : "rejected";
    if (decision === "reject") app.rejectionReason = reason;
    return clone(app);
  },

  // ---- Payments ----
  async listPayments(params: { timing?: string; search?: string } = {}): Promise<Payment[]> {
    ensureMock();
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
    ensureMock();
    await delay();
    const p = db.payments.find((x) => x.id === paymentId);
    if (!p) throw new Error("Payment not found");
    p.timing = "outage_grace";
    return clone(p);
  },
  async listReconciliation(): Promise<ReconciliationRow[]> {
    ensureMock();
    await delay();
    return clone(db.reconciliation);
  },
  async reconcile(id: string): Promise<ReconciliationRow> {
    ensureMock();
    await delay();
    const r = db.reconciliation.find((x) => x.id === id);
    if (!r) throw new Error("Row not found");
    r.reconciled = true;
    return clone(r);
  },

  // ---- Draws ----
  async listDraws(): Promise<Draw[]> {
    ensureMock();
    await delay();
    return clone(db.draws);
  },
  async getDraw(id: string): Promise<Draw> {
    ensureMock();
    await delay();
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    return clone(d);
  },
  async publishDraw(id: string): Promise<Draw> {
    ensureMock();
    await delay();
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    d.locked = true;
    return clone(d);
  },
  async rescheduleDraw(id: string, scheduledAt: string, reason: string): Promise<Draw> {
    ensureMock();
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
    ensureMock();
    await delay(900);
    const d = db.draws.find((x) => x.id === id);
    if (!d) throw new Error("Draw not found");
    if (d.status === "completed") throw new Error("Draw already completed — result is immutable (FR-4.17)");
    if (d.eligibleCount === 0) {
      d.status = "postponed";
      d.postponeReason = "No eligible members at draw time (FR-4.13).";
      return clone(d);
    }
    // Deterministic-ish winner synthesis from the eligible pool.
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

  // ---- Payouts ----
  async listPayouts(): Promise<Payout[]> {
    ensureMock();
    await delay();
    return clone(db.payouts);
  },
  async approvePackage(id: string): Promise<Payout> {
    ensureMock();
    await delay();
    const p = db.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    if (p.requiresProperty && !p.propertyTitleUrl) throw new Error("Immovable-property collateral required for Tier 2/3 (FR-5.5)");
    p.status = "approved";
    p.approvedAt = new Date().toISOString();
    return clone(p);
  },
  async releasePayout(id: string): Promise<Payout> {
    ensureMock();
    await delay();
    const p = db.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    if (p.status !== "approved") throw new Error("Package must be approved before release (FR-5.6)");
    p.status = "released";
    return clone(p);
  },
  async attachPropertyTitle(id: string): Promise<Payout> {
    ensureMock();
    await delay();
    const p = db.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    p.propertyTitleUrl = "https://picsum.photos/seed/title/600/380";
    return clone(p);
  },
  async listHardship(): Promise<HardshipRequest[]> {
    ensureMock();
    await delay();
    return clone(db.hardshipRequests);
  },

  // ---- Penalties ----
  async listPenalties(): Promise<Penalty[]> {
    ensureMock();
    await delay();
    return clone(db.penalties);
  },
  async liftSuspension(id: string): Promise<Penalty> {
    ensureMock();
    await delay();
    const p = db.penalties.find((x) => x.id === id);
    if (!p) throw new Error("Penalty not found");
    if (p.trigger === "turn_sale") throw new Error("Turn-selling removal is permanent (Article 11.2)");
    p.status = "at_risk";
    p.drawsAffected = 0;
    return clone(p);
  },

  // ---- Disputes ----
  async listDisputes(): Promise<Dispute[]> {
    ensureMock();
    await delay();
    return clone(db.disputes);
  },
  async escalateDispute(id: string): Promise<Dispute> {
    ensureMock();
    await delay();
    const d = db.disputes.find((x) => x.id === id);
    if (!d) throw new Error("Dispute not found");
    d.status = "escalated";
    return clone(d);
  },
  async resolveDispute(id: string, resolution: string, boardDecision: string): Promise<Dispute> {
    ensureMock();
    await delay();
    const d = db.disputes.find((x) => x.id === id);
    if (!d) throw new Error("Dispute not found");
    d.status = "resolved";
    d.resolution = resolution;
    d.boardDecision = boardDecision;
    return clone(d);
  },

  // ---- Staff / Roles ----
  async listStaff(): Promise<StaffMember[]> {
    ensureMock();
    await delay();
    return clone(db.staff);
  },
  async listRoles(): Promise<RoleDef[]> {
    ensureMock();
    await delay();
    return clone(db.roles);
  },
};
