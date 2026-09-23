// ============================================================================
// Seeded in-memory Equb backend for NEXT_PUBLIC_USE_MOCK=true.
//
// It implements the exact same surface as the real `equbApi` and returns the
// same snake_case DTOs the swagger defines, so services/ekub.ts, the hooks and
// every page run the identical code path in mock and live mode. State lives
// for the lifetime of the browser tab: create / activate / draw / pay-out etc.
// all mutate it, and a reload re-seeds.
// ============================================================================

import type { EqubApi } from "@/services/equb-api";
import type {
  EqubDrawEligibleMember,
  EqubDrawExcludedMember,
  EqubEmergencyDrawResponse,
  EqubGroupManagerInfo,
  EqubGroupResponse,
  EqubGuaranteeResponse,
  EqubMemberResponse,
  EqubRoundMemberPayment,
  EqubRoundResponse,
  EqubRoundWinner,
  EqubSchemeResponse,
  EqubTakafulSettlementResponse,
  EqubTakafulTransactionResponse,
  EqubWinnerResponse,
  MemberInfo,
  MemberSummaryResponse,
  UserResponse,
} from "@/types/equb-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
let seq = 1000;
const uid = (p: string) => `${p}-${++seq}`;
const now = () => new Date().toISOString();

/** Error shaped like an axios error so getErrorMessage() reads it the same way. */
function fail(message: string): never {
  throw Object.assign(new Error(message), { response: { status: 400, data: { success: false, message } } });
}

// Deterministic PRNG so the seed is identical on every load.
let rngState = 20260923;
const rand = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const DAY = 86_400_000;
const FREQ_DAYS: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 91, semi_annual: 182, annual: 365 };
const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

// ---------------------------------------------------------------------------
// Sacco member directory (what "add member" searches)
// ---------------------------------------------------------------------------
const FIRST = ["Hanan", "Bilal", "Sara", "Nuru", "Leyla", "Mustefa", "Fatima", "Abdi", "Worku", "Hawi", "Yusuf", "Meron", "Kedir", "Aisha", "Tigist", "Ibrahim", "Selam", "Jemal", "Ruth", "Ahmed", "Zeyneb", "Dawit", "Hiwot", "Omar", "Rahel", "Seid", "Eden", "Nesredin", "Liya", "Tesfaye", "Mariam", "Kalid", "Bethel", "Hamza", "Saron", "Yonas", "Amina", "Girma", "Samira", "Elias"];
const LAST = ["Abdulahi", "Yusuf", "Kemal", "Ahmed", "Hussen", "Kedir", "Zeyn", "Rashid", "Bekele", "Tadesse", "Mohammed", "Alemu", "Ali", "Hassen", "Girma", "Ibrahim", "Tesfaye", "Umer", "Haile", "Seid"];

interface DirMember { id: string; first: string; last: string; full: string; number: string; phone: string; status: string }
const directory: DirMember[] = Array.from({ length: 72 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  return {
    id: `m-${String(i + 1).padStart(4, "0")}`,
    first,
    last,
    full: `${first} ${last}`,
    number: `EMD-${String(10230 + i * 3).padStart(6, "0")}`,
    phone: `+2519${String(10000000 + ((i * 7919) % 89999999)).padStart(8, "0")}`,
    status: "active",
  };
});
const dirById = (id: string) => directory.find((d) => d.id === id);
const memberInfo = (id: string): MemberInfo => {
  const d = dirById(id);
  return {
    id,
    full_name: d?.full ?? id,
    display_name: d?.full ?? id,
    membership_number: d?.number ?? "—",
    phone_number: d?.phone ?? "",
    photo: "",
  };
};

// ---------------------------------------------------------------------------
// Staff users (who can be assigned as an Equb's manager)
// ---------------------------------------------------------------------------
const staffUser = (id: string, first: string, last: string, email: string, phone: string, role: string, active = true): UserResponse => ({
  id, first_name: first, last_name: last, full_name: `${first} ${last}`, email, phone, branch_id: "hq", gender: "male", status: active, totp_enabled: false,
  roles: [{ id: `role-${role.toLowerCase().replace(/\s+/g, "-")}`, name: role }],
});
const staffUsers: UserResponse[] = [
  staffUser("u-admin", "Aisha", "Mohammed", "admin@emadekub.com", "+251900000001", "Administrator"),
  staffUser("u-mgr-1", "Kedir", "Abdella", "kedir.a@emadekub.com", "+251900000011", "Equb Manager"),
  staffUser("u-mgr-2", "Meron", "Tadesse", "meron.t@emadekub.com", "+251900000012", "Equb Manager"),
  staffUser("u-mgr-3", "Hamza", "Seid", "hamza.s@emadekub.com", "+251900000013", "Equb Manager"),
  staffUser("u-agent", "Yusuf", "Kedir", "agent@emadekub.com", "+251900000002", "Agent"),
  staffUser("u-agent-2", "Mimi", "Tesfaye", "mimi@emadekub.com", "+251900000003", "Agent"),
  staffUser("u-mgr-old", "Dawit", "Girma", "dawit.g@emadekub.com", "+251900000014", "Equb Manager", false),
];
const managerInfo = (userId?: string): EqubGroupManagerInfo | null => {
  const u = staffUsers.find((x) => x.id === userId);
  return u ? { user_id: u.id, full_name: u.full_name, email: u.email, phone_number: u.phone } : null;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface StoredMember { id: string; group_id: string; member_id: string; position: number; status: string; joined_at: string; suspend_reason?: string }
interface StoredPayment { member_id: string; amount: number; status: string; paid_at: string; isCatchUp: boolean }
interface StoredRound {
  id: string;
  group_id: string;
  round_number: number;
  status: string; // scheduled | open | drawn | completed
  scheduled_at: string;
  contribution_due_date: string;
  drawn_at: string;
  created_at: string;
  payments: StoredPayment[];
}
interface StoredWinner { id: string; round_id: string; group_id: string; member_id: string; position: number; payout_amount: number; status: string; guarantee_status: string; paid_at: string; created_at: string }

const db = {
  schemes: [] as EqubSchemeResponse[],
  groups: [] as (Omit<EqubGroupResponse, "equb_scheme" | "current_members" | "manager"> & { manager_user_id?: string })[],
  members: [] as StoredMember[],
  rounds: [] as StoredRound[],
  winners: [] as StoredWinner[],
  guarantees: [] as EqubGuaranteeResponse[],
  emergency: [] as EqubEmergencyDrawResponse[],
  takaful: [] as EqubTakafulTransactionResponse[],
};

const scheme = (id: string) => db.schemes.find((s) => s.id === id);
const group = (id: string) => db.groups.find((g) => g.id === id) ?? fail("Equb group not found");
const groupMembers = (gid: string) => db.members.filter((m) => m.group_id === gid).sort((a, b) => a.position - b.position);
const groupRounds = (gid: string) => db.rounds.filter((r) => r.group_id === gid).sort((a, b) => a.round_number - b.round_number);
const perRound = (s: EqubSchemeResponse) => s.contribution_amount + s.admin_fee + s.takaful_fee;
const hasWon = (gid: string, memberId: string) => db.winners.some((w) => w.group_id === gid && w.member_id === memberId);

function addRounds(gid: string, from: number, count: number, startIso: string) {
  const g = group(gid);
  const s = scheme(g.equb_scheme_id)!;
  const step = FREQ_DAYS[s.frequency] ?? 7;
  for (let i = 0; i < count; i++) {
    const n = from + i;
    const due = addDays(startIso, (n - 1) * step);
    db.rounds.push({
      id: uid("rnd"),
      group_id: gid,
      round_number: n,
      status: "scheduled",
      scheduled_at: addDays(due, 0.5),
      contribution_due_date: due,
      drawn_at: "",
      created_at: now(),
      payments: [],
    });
  }
}

/** Every roster member gets a payment row once a round opens. */
function openRound(r: StoredRound) {
  const g = group(r.group_id);
  const s = scheme(g.equb_scheme_id)!;
  r.status = "open";
  r.payments = groupMembers(r.group_id).map((m) => ({ member_id: m.member_id, amount: perRound(s), status: "pending", paid_at: "", isCatchUp: false }));
}

function recordPayment(r: StoredRound, p: StoredPayment, paidAt: string) {
  const g = group(r.group_id);
  const s = scheme(g.equb_scheme_id)!;
  p.status = "paid";
  p.paid_at = paidAt;
  if (s.takaful_fee > 0) {
    db.takaful.push({ id: uid("tk"), equb_group_id: g.id, equb_round_id: r.id, member_id: p.member_id, type: "contribution", amount: s.takaful_fee, reference: `R-${r.round_number}`, created_at: paidAt });
  }
}

function drawWinners(r: StoredRound, drawnAt: string) {
  const g = group(r.group_id);
  const s = scheme(g.equb_scheme_id)!;
  const pool = eligibility(r).eligible;
  if (pool.length === 0) fail("No eligible members for this round");
  const picks = shuffle(pool).slice(0, Math.max(1, s.winners_per_round));
  picks.forEach((m, i) => {
    db.winners.push({ id: uid("win"), round_id: r.id, group_id: g.id, member_id: m.member_id, position: i + 1, payout_amount: s.payout_amount, status: "pending", guarantee_status: "none", paid_at: "", created_at: drawnAt });
  });
  r.status = "drawn";
  r.drawn_at = drawnAt;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
function seed() {
  const created = "2026-06-01T08:00:00Z";
  db.schemes.push(
    { id: "sch-med", code: "MED-DAILY", name: "Medium (መካከለኛ)", description: "Daily savers — the everyday merchant tier.", status: "active", frequency: "daily", contribution_amount: 1000, admin_fee: 50, takaful_fee: 10, payout_amount: 28000, members_per_group: 30, winners_per_round: 2, total_rounds: 15, created_by: "u-admin", created_at: created, updated_at: created },
    { id: "sch-hm", code: "HM-WEEKLY", name: "High Merchant (ከፍተኛ ነጋዴ)", description: "Weekly contributions for established traders.", status: "active", frequency: "weekly", contribution_amount: 10000, admin_fee: 500, takaful_fee: 100, payout_amount: 120000, members_per_group: 12, winners_per_round: 1, total_rounds: 12, created_by: "u-admin", created_at: created, updated_at: created },
    { id: "sch-vip", code: "VIP-MONTHLY", name: "VIP", description: "Monthly high-value Equb with collateral-backed payouts.", status: "active", frequency: "monthly", contribution_amount: 50000, admin_fee: 2500, takaful_fee: 500, payout_amount: 500000, members_per_group: 10, winners_per_round: 1, total_rounds: 10, created_by: "u-admin", created_at: created, updated_at: created },
    { id: "sch-draft", code: "STUDENT-WK", name: "Student Starter", description: "Small weekly Equb — still being designed.", status: "draft", frequency: "weekly", contribution_amount: 200, admin_fee: 10, takaful_fee: 2, payout_amount: 4000, members_per_group: 20, winners_per_round: 1, total_rounds: 20, created_by: "u-admin", created_at: created, updated_at: created },
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // spec: [group, scheme, members, drawn rounds, paid ratio in open round]
  const plans = [
    { id: "grp-med-01", code: "MED-2026-01", name: "Merkato Medium · 01", scheme: "sch-med", status: "active", members: 24, max: 30, drawn: 5, openPaid: 0.7, manager: "u-mgr-1" },
    // Managed by someone who has since left — the reassignment case.
    { id: "grp-hm-01", code: "HM-2026-01", name: "Bole High Merchant · 01", scheme: "sch-hm", status: "active", members: 12, max: 12, drawn: 3, openPaid: 0.5, manager: "u-mgr-old" },
    // No manager yet.
    { id: "grp-vip-01", code: "VIP-2026-01", name: "VIP Circle · 01", scheme: "sch-vip", status: "draft", members: 6, max: 10, drawn: 0, openPaid: 0, manager: undefined },
    { id: "grp-med-00", code: "MED-2025-04", name: "Merkato Medium · 00 (closed)", scheme: "sch-med", status: "cancelled", members: 3, max: 30, drawn: 0, openPaid: 0, manager: "u-mgr-2" },
  ];

  let dirCursor = 0;
  for (const p of plans) {
    const s = scheme(p.scheme)!;
    const step = FREQ_DAYS[s.frequency];
    const start = p.status === "active" ? addDays(todayIso, -p.drawn * step) : "";
    db.groups.push({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      equb_scheme_id: p.scheme,
      max_members: p.max,
      start_date: start,
      expected_end_date: start ? addDays(start, s.total_rounds * step) : "",
      created_by: "u-admin",
      manager_user_id: p.manager,
      created_at: created,
      updated_at: created,
    });
    for (let i = 0; i < p.members; i++) {
      const d = directory[dirCursor++ % directory.length];
      db.members.push({ id: uid("em"), group_id: p.id, member_id: d.id, position: i + 1, status: "active", joined_at: addDays(created, i * 0.2) });
    }
    if (p.status !== "active") continue;

    addRounds(p.id, 1, s.total_rounds, start);
    const rounds = groupRounds(p.id);
    // Past rounds: everyone paid (a couple on catch-up), then drawn.
    for (let i = 0; i < p.drawn; i++) {
      const r = rounds[i];
      openRound(r);
      r.payments.forEach((pay, k) => {
        recordPayment(r, pay, addDays(r.contribution_due_date, -0.3 + (k % 3) * 0.1));
        if (k === 3 && i > 0) pay.isCatchUp = true;
      });
      drawWinners(r, r.scheduled_at);
    }
    // Current round: partially paid, ready to draw.
    const open = rounds[p.drawn];
    openRound(open);
    const payCount = Math.round(open.payments.length * p.openPaid);
    open.payments.slice(0, payCount).forEach((pay) => recordPayment(open, pay, addDays(open.contribution_due_date, -0.2)));
  }

  // Payout pipeline states on the older winners of the Medium Equb.
  const medWinners = db.winners.filter((w) => w.group_id === "grp-med-01").sort((a, b) => a.created_at.localeCompare(b.created_at));
  medWinners.slice(0, 5).forEach((w) => {
    w.status = "paid";
    w.guarantee_status = "approved";
    w.paid_at = addDays(w.created_at, 1);
    db.guarantees.push({ id: uid("gua"), equb_winner_id: w.id, guarantee_type: "member", guarantor_member_id: directory[60].id, guarantor_name: directory[60].full, collateral_type: "", collateral_reference: "", collateral_value: 0, status: "approved", approved_at: w.paid_at, created_at: w.created_at });
  });
  medWinners.slice(5, 7).forEach((w) => {
    w.status = "approved";
    w.guarantee_status = "approved";
  });
  // Paid-out payouts on the High Merchant Equb, too.
  db.winners.filter((w) => w.group_id === "grp-hm-01").slice(0, 2).forEach((w) => {
    w.status = "paid";
    w.guarantee_status = "approved";
    w.paid_at = addDays(w.created_at, 1);
  });

  // A drawn round whose winners are all paid out is complete.
  db.rounds.filter((r) => r.status === "drawn").forEach((r) => {
    const ws = db.winners.filter((w) => w.round_id === r.id);
    if (ws.length && ws.every((w) => w.status === "paid")) r.status = "completed";
  });

  // A suspended member, a Takaful claim, hardship requests.
  const med = groupMembers("grp-med-01");
  med[20].status = "suspended";
  med[20].suspend_reason = "Two consecutive missed contributions";
  db.takaful.push({ id: uid("tk"), equb_group_id: "grp-med-01", equb_round_id: "", member_id: med[8].member_id, type: "claim", amount: 300, reference: "CLAIM-001", created_at: addDays(todayIso, -2) });
  db.emergency.push(
    { id: uid("emg"), equb_group_id: "grp-med-01", member_id: med[14].member_id, reason: "Hospital admission of my child — need the payout early for surgery costs.", status: "pending", review_note: "", reviewed_by: "", created_at: addDays(todayIso, -1) },
    { id: uid("emg"), equb_group_id: "grp-med-01", member_id: med[17].member_id, reason: "Death in the family, funeral expenses.", status: "approved", review_note: "Documents verified.", reviewed_by: "Aisha Mohammed", created_at: addDays(todayIso, -12) },
    { id: uid("emg"), equb_group_id: "grp-hm-01", member_id: groupMembers("grp-hm-01")[5].member_id, reason: "Shop stock lost in a fire.", status: "rejected", review_note: "Insurance claim already covers the loss.", reviewed_by: "Aisha Mohammed", created_at: addDays(todayIso, -20) },
  );
}
seed();

// ---------------------------------------------------------------------------
// DTO builders
// ---------------------------------------------------------------------------
function groupDto(g: (typeof db.groups)[number]): EqubGroupResponse {
  const { manager_user_id, ...rest } = clone(g);
  return { ...rest, equb_scheme: clone(scheme(g.equb_scheme_id)), manager: managerInfo(manager_user_id), current_members: groupMembers(g.id).length };
}

function memberDto(m: StoredMember): EqubMemberResponse {
  return { id: m.id, equb_group_id: m.group_id, member_id: m.member_id, member: memberInfo(m.member_id), position: m.position, status: m.status, joined_at: m.joined_at };
}

function eligibility(r: StoredRound) {
  const members = groupMembers(r.group_id);
  const priorRounds = groupRounds(r.group_id).filter((x) => x.round_number < r.round_number);
  const eligible: StoredMember[] = [];
  const excluded: EqubDrawExcludedMember[] = [];
  for (const m of members) {
    const pay = r.payments.find((p) => p.member_id === m.member_id);
    const paid = pay?.status === "paid";
    const won = hasWon(r.group_id, m.member_id);
    const banned = m.status === "suspended";
    const catchUp = priorRounds.some((pr) => pr.payments.some((p) => p.member_id === m.member_id && p.status !== "paid"));
    if (paid && !won && !banned && !catchUp) eligible.push(m);
    else {
      const d = dirById(m.member_id);
      excluded.push({
        member_id: m.member_id,
        member_name: d?.full ?? m.member_id,
        phone: d?.phone ?? "",
        contribution_paid: paid,
        previously_won: won,
        has_unpaid_catch_up: catchUp,
        is_banned: banned,
        eligible: false,
        reason: banned ? m.suspend_reason ?? "Suspended" : "",
      });
    }
  }
  return { eligible, excluded };
}

function roundDto(r: StoredRound): EqubRoundResponse {
  const g = group(r.group_id);
  const s = scheme(g.equb_scheme_id)!;
  const payments: EqubRoundMemberPayment[] = r.payments.map((p) => {
    const d = dirById(p.member_id);
    return { member_id: p.member_id, member_name: d?.full ?? p.member_id, phone: d?.phone ?? "", amount: p.amount, status: p.status, paid_at: p.paid_at, isCatchUp: p.isCatchUp };
  });
  const paid = r.payments.filter((p) => p.status === "paid");
  const total = r.payments.length || groupMembers(r.group_id).length;
  const isOpen = r.status === "open";
  const el = isOpen ? eligibility(r) : { eligible: [], excluded: [] };
  const eligibleDto: EqubDrawEligibleMember[] = el.eligible.map((m) => {
    const d = dirById(m.member_id);
    return { member_id: m.member_id, member_name: d?.full ?? m.member_id, phone: d?.phone ?? "", position: m.position, contribution_paid: true, previously_won: false, eligible: true };
  });
  const winners: EqubRoundWinner[] = db.winners
    .filter((w) => w.round_id === r.id)
    .map((w) => {
      const d = dirById(w.member_id);
      return { member_id: w.member_id, member_name: d?.full ?? w.member_id, phone: d?.phone ?? "", payout_amount: w.payout_amount, status: w.status, winner_position: w.position, paid_at: w.paid_at };
    });
  return {
    id: r.id,
    equb_group_id: r.group_id,
    round_number: r.round_number,
    status: r.status,
    scheduled_at: r.scheduled_at,
    drawn_at: r.drawn_at,
    contribution_due_date: r.contribution_due_date,
    created_at: r.created_at,
    total_members: total,
    paid_count: paid.length,
    unpaid_count: r.payments.length - paid.length,
    payment_percentage: total ? Math.round((paid.length / total) * 1000) / 10 : 0,
    total_contribution: paid.length * s.contribution_amount,
    total_admin_fee: paid.length * s.admin_fee,
    total_takaful_fee: paid.length * s.takaful_fee,
    payout_amount: s.payout_amount * s.winners_per_round,
    member_payments: payments,
    can_execute_draw: isOpen && eligibleDto.length > 0,
    eligible_count: eligibleDto.length,
    excluded_count: el.excluded.length,
    eligible_members: eligibleDto,
    excluded_members: el.excluded,
    winners,
  };
}

function winnerDto(w: StoredWinner): EqubWinnerResponse {
  return { id: w.id, equb_round_id: w.round_id, equb_draw_id: w.round_id, member_id: w.member_id, member: memberInfo(w.member_id), winner_position: w.position, payout_amount: w.payout_amount, status: w.status, guarantee_status: w.guarantee_status, paid_at: w.paid_at, created_at: w.created_at };
}

const takafulBalance = (gid: string) =>
  Math.round(db.takaful.filter((t) => t.equb_group_id === gid).reduce((sum, t) => sum + (t.type === "contribution" ? t.amount : -t.amount), 0) * 100) / 100;

const matches = (q: string | undefined, ...fields: string[]) => !q || fields.some((f) => f.toLowerCase().includes(q.toLowerCase()));

// ---------------------------------------------------------------------------
// API surface (same signatures as the real equbApi)
// ---------------------------------------------------------------------------
export const mockEqubApi: EqubApi = {
  async login() {
    await delay();
    return fail("Use the demo sign-in buttons in mock mode");
  },

  // ---- Schemes ----
  async listSchemes(params) {
    await delay();
    return clone(db.schemes.filter((s) => (!params?.status || s.status === params.status) && matches(params?.search, s.name, s.code)));
  },
  async createScheme(body) {
    await delay();
    if (db.schemes.some((s) => s.code === body.code)) fail(`A category with code ${body.code} already exists`);
    const s: EqubSchemeResponse = { id: uid("sch"), status: "draft", description: "", admin_fee: 0, takaful_fee: 0, ...body, created_by: "u-admin", created_at: now(), updated_at: now() } as EqubSchemeResponse;
    db.schemes.push(s);
    return clone(s);
  },
  async getScheme(id) {
    await delay();
    return clone(scheme(id) ?? fail("Equb scheme not found"));
  },
  async updateScheme(id, body) {
    await delay();
    const s = scheme(id) ?? fail("Equb scheme not found");
    Object.assign(s, body, { updated_at: now() });
    return clone(s);
  },
  async deleteScheme(id) {
    await delay();
    if (db.groups.some((g) => g.equb_scheme_id === id && g.status !== "cancelled")) fail("This category still has Equbs; cancel or delete them first");
    db.schemes = db.schemes.filter((s) => s.id !== id);
    return null;
  },

  // ---- Groups ----
  async listGroups(params) {
    await delay();
    return db.groups
      .filter((g) => (!params?.equb_scheme_id || g.equb_scheme_id === params.equb_scheme_id) && (!params?.status || g.status === params.status) && matches(params?.search, g.name, g.code))
      .map(groupDto);
  },
  async getGroup(id) {
    await delay();
    return groupDto(group(id));
  },
  async createGroup(body) {
    await delay();
    const s = scheme(body.equb_scheme_id) ?? fail("Equb scheme not found");
    if (s.status === "cancelled") fail("Cannot create an Equb from a cancelled category");
    if (db.groups.some((g) => g.code === body.code)) fail(`An Equb with code ${body.code} already exists`);
    // The creator manages the group until an admin reassigns it.
    const g = { id: uid("grp"), code: body.code, name: body.name, status: "draft", equb_scheme_id: s.id, max_members: body.max_members, start_date: body.start_date ?? "", expected_end_date: body.expected_end_date ?? "", created_by: "u-admin", manager_user_id: "u-admin", created_at: now(), updated_at: now() };
    db.groups.push(g);
    return groupDto(g);
  },
  async updateGroup(id, body) {
    await delay();
    const g = group(id);
    if (body.max_members != null && body.max_members < groupMembers(id).length) fail("Maximum members cannot be lower than the current roster");
    Object.assign(g, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)), { updated_at: now() });
    return groupDto(g);
  },
  async deleteGroup(id) {
    await delay();
    const g = group(id);
    if (g.status === "active") fail("Cancel an active Equb before deleting it");
    db.groups = db.groups.filter((x) => x.id !== id);
    db.members = db.members.filter((m) => m.group_id !== id);
    db.rounds = db.rounds.filter((r) => r.group_id !== id);
    return null;
  },
  async activateGroup(id, startDate) {
    await delay();
    const g = group(id);
    if (g.status !== "draft") fail("Only draft Equbs can be activated");
    if (groupMembers(id).length < 2) fail("Add at least 2 members before activating");
    const s = scheme(g.equb_scheme_id)!;
    g.status = "active";
    g.start_date = startDate;
    g.expected_end_date = addDays(startDate, s.total_rounds * (FREQ_DAYS[s.frequency] ?? 7));
    addRounds(id, 1, s.total_rounds, startDate);
    openRound(groupRounds(id)[0]);
    return groupDto(g);
  },
  async cancelGroup(id, reason) {
    await delay();
    const g = group(id);
    if (!reason) fail("Reason is required");
    g.status = "cancelled";
    groupRounds(id).filter((r) => r.status === "scheduled" || r.status === "open").forEach((r) => (r.status = "cancelled"));
    return groupDto(g);
  },
  async extendGroup(id, additionalRounds) {
    await delay();
    const g = group(id);
    if (g.status !== "active") fail("Only active Equbs can be extended");
    const rounds = groupRounds(id);
    const s = scheme(g.equb_scheme_id)!;
    const step = FREQ_DAYS[s.frequency] ?? 7;
    const last = rounds[rounds.length - 1];
    addRounds(id, last.round_number + 1, additionalRounds, g.start_date);
    g.expected_end_date = addDays(g.expected_end_date || now(), additionalRounds * step);
    return groupDto(g);
  },
  async assignManager(id, managerUserId) {
    await delay();
    const g = group(id);
    const u = staffUsers.find((x) => x.id === managerUserId) ?? fail("User not found");
    if (!u.status) fail("This user is inactive and cannot manage an Equb");
    const previous = g.manager_user_id;
    const changed = previous !== managerUserId;
    if (changed) {
      g.manager_user_id = managerUserId;
      g.updated_at = now();
    }
    return { group_id: g.id, group_code: g.code, group_name: g.name, manager_user_id: managerUserId, previous_manager_user_id: previous, changed };
  },
  async autoCancel() {
    await delay();
    const stale = db.groups.filter((g) => g.status === "draft" && groupMembers(g.id).length === 0);
    stale.forEach((g) => (g.status = "cancelled"));
    return { cancelled: stale.length };
  },
  async dashboard(groupId) {
    await delay();
    const g = group(groupId);
    if (g.status === "draft") fail("Equb is not active yet");
    const s = scheme(g.equb_scheme_id)!;
    const members = groupMembers(groupId);
    const rounds = groupRounds(groupId);
    const current = rounds.find((r) => r.status === "open") ?? rounds.filter((r) => r.status === "drawn").pop();
    const allPaid = rounds.flatMap((r) => r.payments.filter((p) => p.status === "paid"));
    const wins = db.winners.filter((w) => w.group_id === groupId);
    const drawnCount = rounds.filter((r) => r.status === "drawn" || r.status === "completed").length;
    const curDto = current ? roundDto(current) : undefined;
    return {
      group_id: g.id,
      group_code: g.code,
      group_name: g.name,
      status: g.status,
      cycle_number: 1,
      cycle_progress: rounds.length ? Math.round((drawnCount / rounds.length) * 100) : 0,
      current_round: current?.round_number ?? 0,
      total_rounds: rounds.length,
      draw_status: current?.status ?? "scheduled",
      total_members: members.length,
      active_members: members.filter((m) => m.status === "active").length,
      suspended_members: members.filter((m) => m.status === "suspended").length,
      eligible_for_draw: curDto?.eligible_count ?? 0,
      paid_this_round: curDto?.paid_count ?? 0,
      unpaid_this_round: curDto?.unpaid_count ?? 0,
      next_due_date: rounds.find((r) => r.status === "open" || r.status === "scheduled")?.contribution_due_date ?? "",
      total_collected: allPaid.length * perRound(s),
      total_payouts: wins.filter((w) => w.status === "paid").reduce((sum, w) => sum + w.payout_amount, 0),
      total_admin_fees: allPaid.length * s.admin_fee,
      total_takaful_fees: allPaid.length * s.takaful_fee,
      takaful_balance: takafulBalance(groupId),
      wins_distributed: wins.length,
    };
  },

  // ---- Members ----
  async listGroupMembers(groupId, params) {
    await delay();
    group(groupId);
    return groupMembers(groupId).filter((m) => !params?.status || m.status === params.status).map(memberDto);
  },
  async addMember(groupId, memberId) {
    await delay();
    const g = group(groupId);
    if (g.status === "cancelled" || g.status === "completed") fail("This Equb is closed");
    if (!dirById(memberId)) fail("Member not found");
    const roster = groupMembers(groupId);
    if (roster.some((m) => m.member_id === memberId)) fail("Member is already in this Equb");
    if (roster.length >= g.max_members) fail("This Equb is full");
    const m: StoredMember = { id: uid("em"), group_id: groupId, member_id: memberId, position: roster.length + 1, status: "active", joined_at: now() };
    db.members.push(m);
    const open = groupRounds(groupId).find((r) => r.status === "open");
    if (open) {
      const s = scheme(g.equb_scheme_id)!;
      open.payments.push({ member_id: memberId, amount: perRound(s), status: "pending", paid_at: "", isCatchUp: false });
    }
    return memberDto(m);
  },
  async removeMember(groupId, memberId) {
    await delay();
    if (hasWon(groupId, memberId)) fail("A member who has already won cannot be removed");
    db.members = db.members.filter((m) => !(m.group_id === groupId && m.member_id === memberId));
    groupMembers(groupId).forEach((m, i) => (m.position = i + 1));
    groupRounds(groupId).filter((r) => r.status === "open").forEach((r) => (r.payments = r.payments.filter((p) => p.member_id !== memberId)));
    return null;
  },
  async swapPositions(groupId, a, b) {
    await delay();
    const ma = groupMembers(groupId).find((m) => m.member_id === a) ?? fail("First member not found");
    const mb = groupMembers(groupId).find((m) => m.member_id === b) ?? fail("Second member not found");
    [ma.position, mb.position] = [mb.position, ma.position];
    return { member_id_1: a, member_id_2: b };
  },
  async suspendMember(groupId, memberId, reason) {
    await delay();
    const m = groupMembers(groupId).find((x) => x.member_id === memberId) ?? fail("Member not found");
    m.status = "suspended";
    m.suspend_reason = reason;
    return null;
  },
  async unsuspendMember(groupId, memberId) {
    await delay();
    const m = groupMembers(groupId).find((x) => x.member_id === memberId) ?? fail("Member not found");
    m.status = "active";
    m.suspend_reason = undefined;
    return null;
  },

  // ---- Directory ----
  async searchMembers(search, limit = 10): Promise<MemberSummaryResponse[]> {
    await delay(150);
    return directory
      .filter((d) => matches(search, d.full, d.number, d.phone))
      .slice(0, limit)
      .map((d) => ({ id: d.id, full_name: d.full, first_name: d.first, last_name: d.last, membership_number: d.number, phone_number: d.phone, photo: "", status: d.status, member_category: "regular" }));
  },

  // ---- Rounds / draws ----
  async listRounds(groupId, params) {
    await delay();
    group(groupId);
    return groupRounds(groupId).filter((r) => !params?.status || r.status === params.status).map(roundDto);
  },
  async getRound(roundId) {
    await delay();
    return roundDto(db.rounds.find((r) => r.id === roundId) ?? fail("Round not found"));
  },
  async drawPreview(roundId) {
    await delay();
    const r = db.rounds.find((x) => x.id === roundId) ?? fail("Round not found");
    const g = group(r.group_id);
    const dto = roundDto(r);
    const reason = r.status !== "open" ? `Round is ${r.status}` : dto.eligible_count === 0 ? "No member is eligible yet — nobody has paid for this round" : "";
    return {
      group_id: g.id,
      group_name: g.name,
      round_id: r.id,
      round_number: r.round_number,
      can_execute_draw: dto.can_execute_draw,
      reason,
      eligible_count: dto.eligible_count,
      excluded_count: dto.excluded_count,
      total_members: dto.total_members,
      winners_per_round: scheme(g.equb_scheme_id)!.winners_per_round,
      eligible_members: dto.eligible_members ?? [],
      excluded_members: dto.excluded_members ?? [],
    };
  },
  async executeDraw(roundId) {
    await delay(700);
    const r = db.rounds.find((x) => x.id === roundId) ?? fail("Round not found");
    if (r.status !== "open") fail("Only an open round can be drawn");
    drawWinners(r, now());
    const next = groupRounds(r.group_id).find((x) => x.status === "scheduled");
    if (next) openRound(next);
    else group(r.group_id).status = "completed";
    return null;
  },
  async listWinners(roundId) {
    await delay();
    return db.winners.filter((w) => w.round_id === roundId).sort((a, b) => a.position - b.position).map(winnerDto);
  },
  async drawCandidates() {
    await delay();
    return [];
  },

  // ---- Guarantees / payouts ----
  async createGuarantee(winnerId, body) {
    await delay();
    const w = db.winners.find((x) => x.id === winnerId) ?? fail("Winner not found");
    if (w.status === "paid") fail("This winner is already paid");
    const g: EqubGuaranteeResponse = { id: uid("gua"), equb_winner_id: winnerId, guarantee_type: body.guarantee_type, guarantor_member_id: body.guarantor_member_id ?? "", guarantor_name: body.guarantor_name, collateral_type: body.collateral_type ?? "", collateral_reference: body.collateral_reference ?? "", collateral_value: body.collateral_value ?? 0, status: "pending", approved_at: "", created_at: now() };
    db.guarantees.push(g);
    w.guarantee_status = "pending";
    return clone(g);
  },
  async approveGuarantee(guaranteeId) {
    await delay();
    const g = db.guarantees.find((x) => x.id === guaranteeId) ?? fail("Guarantee not found");
    g.status = "approved";
    g.approved_at = now();
    const w = db.winners.find((x) => x.id === g.equb_winner_id);
    if (w) { w.guarantee_status = "approved"; w.status = "approved"; }
    return null;
  },
  async rejectGuarantee(guaranteeId) {
    await delay();
    const g = db.guarantees.find((x) => x.id === guaranteeId) ?? fail("Guarantee not found");
    g.status = "rejected";
    const w = db.winners.find((x) => x.id === g.equb_winner_id);
    if (w) w.guarantee_status = "rejected";
    return null;
  },
  async processPayout(winnerId) {
    await delay(500);
    const w = db.winners.find((x) => x.id === winnerId) ?? fail("Winner not found");
    if (w.status === "paid") fail("This payout was already processed");
    if (w.guarantee_status !== "approved") fail("An approved guarantee is required before payout");
    w.status = "paid";
    w.paid_at = now();
    const r = db.rounds.find((x) => x.id === w.round_id);
    if (r && db.winners.filter((x) => x.round_id === r.id).every((x) => x.status === "paid")) r.status = "completed";
    return { id: uid("pay"), equb_winner_id: w.id, member_id: w.member_id, member: memberInfo(w.member_id), amount: w.payout_amount, status: "paid", payment_id: uid("txn"), paid_at: w.paid_at, created_at: w.paid_at };
  },

  // ---- Emergency draws ----
  async listEmergencyDraws(groupId, params) {
    await delay();
    return clone(db.emergency.filter((e) => e.equb_group_id === groupId && (!params?.status || e.status === params.status)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async submitEmergencyDraw(groupId, memberId, reason) {
    await delay();
    if (!groupMembers(groupId).some((m) => m.member_id === memberId)) fail("Member is not in this Equb");
    const e: EqubEmergencyDrawResponse = { id: uid("emg"), equb_group_id: groupId, member_id: memberId, reason, status: "pending", review_note: "", reviewed_by: "", created_at: now() };
    db.emergency.push(e);
    return clone(e);
  },
  async approveEmergencyDraw(requestId, reviewNote) {
    await delay();
    const e = db.emergency.find((x) => x.id === requestId) ?? fail("Request not found");
    Object.assign(e, { status: "approved", review_note: reviewNote ?? "", reviewed_by: "Aisha Mohammed" });
    return null;
  },
  async rejectEmergencyDraw(requestId, reviewNote) {
    await delay();
    const e = db.emergency.find((x) => x.id === requestId) ?? fail("Request not found");
    Object.assign(e, { status: "rejected", review_note: reviewNote, reviewed_by: "Aisha Mohammed" });
    return null;
  },

  // ---- Takaful ----
  async listTakaful(groupId) {
    await delay();
    return clone(db.takaful.filter((t) => t.equb_group_id === groupId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async takafulBalance(groupId) {
    await delay();
    return { balance: takafulBalance(groupId) };
  },
  async distributeSurplus(groupId): Promise<EqubTakafulSettlementResponse> {
    await delay();
    const bal = takafulBalance(groupId);
    if (bal <= 0) fail("There is no surplus to distribute");
    const members = groupMembers(groupId);
    const share = Math.floor((bal / members.length) * 100) / 100;
    const items = members.map((m) => ({ member_id: m.member_id, type: "surplus", amount: share }));
    items.forEach((i) => db.takaful.push({ id: uid("tk"), equb_group_id: groupId, equb_round_id: "", member_id: i.member_id, type: "surplus", amount: i.amount, reference: "SURPLUS", created_at: now() }));
    return { equb_group_id: groupId, type: "surplus", total_amount: share * members.length, remaining_balance: takafulBalance(groupId), items, created_at: now() };
  },
  async submitTakafulClaim(groupId, memberId, amount, reason) {
    await delay();
    if (amount > takafulBalance(groupId)) fail("Claim exceeds the Takaful balance");
    db.takaful.push({ id: uid("tk"), equb_group_id: groupId, equb_round_id: "", member_id: memberId, type: "claim", amount, reference: reason.slice(0, 24), created_at: now() });
    return { id: uid("clm"), equb_group_id: groupId, member_id: memberId, amount, reason, status: "approved", created_at: now() };
  },
  async refundTakaful(groupId): Promise<EqubTakafulSettlementResponse> {
    await delay();
    const bal = takafulBalance(groupId);
    if (bal <= 0) fail("There is no balance to refund");
    const paidBy = new Map<string, number>();
    db.takaful.filter((t) => t.equb_group_id === groupId && t.type === "contribution").forEach((t) => paidBy.set(t.member_id, (paidBy.get(t.member_id) ?? 0) + t.amount));
    const totalPaid = [...paidBy.values()].reduce((a, b) => a + b, 0);
    const items = [...paidBy.entries()].map(([member_id, paid]) => ({ member_id, type: "refund", amount: Math.floor((bal * paid) / totalPaid * 100) / 100 }));
    items.forEach((i) => db.takaful.push({ id: uid("tk"), equb_group_id: groupId, equb_round_id: "", member_id: i.member_id, type: "refund", amount: i.amount, reference: "REFUND", created_at: now() }));
    return { equb_group_id: groupId, type: "refund", total_amount: items.reduce((a, i) => a + i.amount, 0), remaining_balance: takafulBalance(groupId), items, created_at: now() };
  },

  // ---- Contributions ----
  async markOverdue() {
    await delay();
    let count = 0;
    const today = Date.now();
    db.rounds.filter((r) => r.status === "open" && new Date(r.contribution_due_date).getTime() < today).forEach((r) =>
      r.payments.filter((p) => p.status === "pending").forEach((p) => { p.status = "overdue"; count++; })
    );
    return { marked: count };
  },

  // ---- Not Equb-specific: services/ekub.ts serves these from lib/mock/mock-db ----
  async listRegistrationRequests() { await delay(); return []; },
  async approveRegistration() { await delay(); return null; },
  async rejectRegistration() { await delay(); return null; },
  async listUsers(params) {
    await delay(150);
    const q = typeof params?.search === "string" ? params.search : undefined;
    const onlyActive = params?.status === true || params?.status === "true";
    return clone(staffUsers.filter((u) => (!onlyActive || u.status) && matches(q, u.full_name, u.email, u.phone)));
  },
  async listRoles() { await delay(); return []; },

  // ---- Manager ----
  async managerGroups() { await delay(); return db.groups.map(groupDto); },
  async managerSchemes() { await delay(); return clone(db.schemes); },
  async catchUpAmount() { await delay(); return { amount: 0 }; },
};
