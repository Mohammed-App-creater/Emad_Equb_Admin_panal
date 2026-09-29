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
  EqubContributionAttachmentResponse,
  EqubFeeLine,
  EqubAdminFeeLine,
  EqubAdminFeeSplit,
  EqubAdminFeeTotals,
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
  EqubTermOverrides,
  EqubTermsResponse,
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
interface StoredPayment { id: string; member_id: string; amount: number; admin_fee: number; status: string; paid_at: string; payment_id: string; isCatchUp: boolean }
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

type StoredGroup = Omit<EqubGroupResponse, "equb_scheme" | "current_members" | "manager" | "effective_terms"> & { manager_user_id?: string };

/** Schemes are stored with numeric money so the mock can do arithmetic; schemeDto() sends decimal strings like the live API. */
type StoredScheme = Omit<EqubSchemeResponse, "contribution_amount" | "admin_fee" | "takaful_fee" | "payout_amount"> & { contribution_amount: number; admin_fee: number; takaful_fee: number; payout_amount: number };
const schemeDto = (s: StoredScheme): EqubSchemeResponse => ({
  ...clone(s),
  contribution_amount: String(s.contribution_amount),
  admin_fee: String(s.admin_fee),
  takaful_fee: String(s.takaful_fee),
  payout_amount: String(s.payout_amount),
});

const db = {
  schemes: [] as StoredScheme[],
  groups: [] as StoredGroup[],
  members: [] as StoredMember[],
  rounds: [] as StoredRound[],
  winners: [] as StoredWinner[],
  guarantees: [] as EqubGuaranteeResponse[],
  emergency: [] as EqubEmergencyDrawResponse[],
  takaful: [] as EqubTakafulTransactionResponse[],
  attachments: [] as (EqubContributionAttachmentResponse & { data_url: string })[],
  /** Payments raised by a staff collection, waiting to be confirmed. */
  pendingPayments: {} as Record<string, { group_id: string; member_id: string; round_ids: string[]; status: string; collected_at: string; reference: string; amount: number }>,
};

const scheme = (id: string) => db.schemes.find((s) => s.id === id);
const group = (id: string) => db.groups.find((g) => g.id === id) ?? fail("Equb group not found");
const groupMembers = (gid: string) => db.members.filter((m) => m.group_id === gid).sort((a, b) => a.position - b.position);
const groupRounds = (gid: string) => db.rounds.filter((r) => r.group_id === gid).sort((a, b) => a.round_number - b.round_number);
/** Numeric terms, same field names as the scheme so the rest of the mock reads either. */
interface Terms { contribution_amount: number; admin_fee: number; takaful_fee: number; payout_amount: number; frequency: string; members_per_group: number; winners_per_round: number; total_rounds: number; guarantee_required: boolean; accepted_guarantee_types: string[] }
const dec = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? undefined : Number(v));

/** The scheme's terms with the group's overrides applied (what the group actually runs on). */
function groupTerms(g: StoredGroup): Terms {
  const s = scheme(g.equb_scheme_id)!;
  return {
    contribution_amount: dec(g.contribution_amount_override) ?? s.contribution_amount,
    admin_fee: dec(g.admin_fee_override) ?? s.admin_fee,
    takaful_fee: dec(g.takaful_fee_override) ?? s.takaful_fee,
    payout_amount: dec(g.payout_amount_override) ?? s.payout_amount,
    frequency: g.frequency_override ?? s.frequency,
    members_per_group: g.max_members,
    winners_per_round: g.winners_per_round_override ?? s.winners_per_round,
    total_rounds: g.total_rounds_override ?? s.total_rounds,
    guarantee_required: g.guarantee_required_override ?? s.guarantee_required ?? true,
    accepted_guarantee_types: g.accepted_guarantee_types_override ?? s.accepted_guarantee_types ?? ["member", "cheque", "collateral"],
  };
}
const perRound = (t: Terms) => t.contribution_amount + t.admin_fee + t.takaful_fee;
const hasOverrides = (g: EqubTermOverrides) =>
  [g.contribution_amount_override, g.admin_fee_override, g.takaful_fee_override, g.payout_amount_override, g.frequency_override, g.total_rounds_override, g.winners_per_round_override].some((v) => v !== null && v !== undefined && v !== "");
const OVERRIDE_KEYS = ["contribution_amount_override", "admin_fee_override", "takaful_fee_override", "payout_amount_override", "frequency_override", "total_rounds_override", "winners_per_round_override", "guarantee_required_override", "accepted_guarantee_types_override"] as const;

function validateTerms(g: StoredGroup) {
  if (!hasOverrides(g)) return;
  const t = groupTerms(g);
  if (Math.abs(t.payout_amount - t.contribution_amount * g.max_members) > 0.001)
    fail(`Payout must equal contribution × max members (${t.contribution_amount} × ${g.max_members} = ${t.contribution_amount * g.max_members})`);
  if (t.winners_per_round > g.max_members) fail("Winners per round must fit in max members");
}

function applyShares(g: StoredGroup, body: { sacco_admin_fee_share?: string; agent_admin_fee_share?: string; broker_admin_fee_share?: string; broker_user_id?: string | null }, required: boolean) {
  const sent = [body.sacco_admin_fee_share, body.agent_admin_fee_share, body.broker_admin_fee_share].filter((v) => v !== undefined && v !== "");
  if (sent.length === 0) {
    if (required) Object.assign(g, { sacco_admin_fee_share: "100", agent_admin_fee_share: "0", broker_admin_fee_share: "0", broker_user_id: null });
    return;
  }
  if (sent.length !== 3) fail("Send all three admin fee shares (SACCO, agent, broker) or none");
  const [sa, ag, br] = [Number(body.sacco_admin_fee_share), Number(body.agent_admin_fee_share), Number(body.broker_admin_fee_share)];
  if ([sa, ag, br].some((x) => !Number.isFinite(x) || x < 0)) fail("Admin fee shares must be non-negative numbers");
  if (Math.abs(sa + ag + br - 100) > 0.001) fail(`Admin fee shares must total exactly 100 (got ${sa + ag + br})`);
  if (br > 0 && !body.broker_user_id) fail("broker_user_id is required when the broker share is above zero");
  Object.assign(g, {
    sacco_admin_fee_share: String(sa),
    agent_admin_fee_share: String(ag),
    broker_admin_fee_share: String(br),
    broker_user_id: br > 0 ? body.broker_user_id : null,
  });
}

let schemeSeq = 4;
let groupSeq = 4;
const nextCode = (prefix: string, n: number) => `${prefix}${String(n).padStart(5, "0")}`;
const hasWon = (gid: string, memberId: string) => db.winners.some((w) => w.group_id === gid && w.member_id === memberId);

function addRounds(gid: string, from: number, count: number, startIso: string) {
  const g = group(gid);
  const s = groupTerms(g);
  const step = FREQ_DAYS[s.frequency] ?? 7;
  for (let i = 0; i < count; i++) {
    const n = from + i;
    const due = addDays(startIso, (n - 1) * step);
    db.rounds.push({
      id: uid("rnd"),
      group_id: gid,
      round_number: n,
      status: "scheduled",
      // Like the live API: scheduled_at opens the collection window, the due date closes it.
      scheduled_at: addDays(due, -step),
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
  const s = groupTerms(g);
  r.status = "open";
  r.payments = groupMembers(r.group_id).map((m) => ({ id: uid("ctb"), member_id: m.member_id, amount: perRound(s), admin_fee: s.admin_fee, status: "pending", paid_at: "", payment_id: "", isCatchUp: false }));
}

function recordPayment(r: StoredRound, p: StoredPayment, paidAt: string) {
  const g = group(r.group_id);
  const s = groupTerms(g);
  p.status = "paid";
  p.paid_at = paidAt;
  p.payment_id = uid("pay");
  if (s.takaful_fee > 0) {
    db.takaful.push({ id: uid("tk"), equb_group_id: g.id, equb_round_id: r.id, member_id: p.member_id, type: "contribution", amount: s.takaful_fee, reference: `R-${r.round_number}`, created_at: paidAt });
  }
}

function drawWinners(r: StoredRound, drawnAt: string) {
  const g = group(r.group_id);
  const s = groupTerms(g);
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
    { id: "sch-med", code: "EQS00001", name: "Medium (መካከለኛ)", description: "Daily savers — the everyday merchant tier.", status: "active", frequency: "daily", contribution_amount: 1000, admin_fee: 50, takaful_fee: 10, payout_amount: 30000, members_per_group: 30, winners_per_round: 2, total_rounds: 15, created_by: "u-admin", created_at: created, updated_at: created },
    { id: "sch-hm", code: "EQS00002", name: "High Merchant (ከፍተኛ ነጋዴ)", description: "Weekly contributions for established traders.", status: "active", frequency: "weekly", contribution_amount: 10000, admin_fee: 500, takaful_fee: 100, payout_amount: 120000, members_per_group: 12, winners_per_round: 1, total_rounds: 12, created_by: "u-admin", created_at: created, updated_at: created },
    { id: "sch-vip", code: "EQS00003", name: "VIP", description: "Monthly high-value Equb with collateral-backed payouts.", status: "active", frequency: "monthly", contribution_amount: 50000, admin_fee: 2500, takaful_fee: 500, payout_amount: 500000, members_per_group: 10, winners_per_round: 1, total_rounds: 10, created_by: "u-admin", created_at: created, updated_at: created },
    { id: "sch-draft", code: "EQS00004", name: "Student Starter", description: "Small weekly Equb — still being designed.", status: "draft", frequency: "weekly", contribution_amount: 200, admin_fee: 10, takaful_fee: 2, payout_amount: 4000, members_per_group: 20, winners_per_round: 1, total_rounds: 20, created_by: "u-admin", created_at: created, updated_at: created },
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // spec: [group, scheme, members, drawn rounds, paid ratio in open round]
  const plans = [
    { id: "grp-med-01", code: "MED-2026-01", name: "Merkato Medium · 01", scheme: "sch-med", status: "active", members: 24, max: 30, drawn: 5, openPaid: 1, manager: "u-mgr-1", shares: ["70", "20", "10"], broker: "u-mgr-3" },
    // Managed by someone who has since left — the reassignment case.
    { id: "grp-hm-01", code: "HM-2026-01", name: "Bole High Merchant · 01", scheme: "sch-hm", status: "active", members: 12, max: 12, drawn: 3, openPaid: 0.5, manager: "u-mgr-old", shares: ["80", "20", "0"], broker: undefined, noGuarantee: true },
    // No manager yet.
    { id: "grp-vip-01", code: "VIP-2026-01", name: "VIP Circle · 01", scheme: "sch-vip", status: "draft", members: 6, max: 10, drawn: 0, openPaid: 0, manager: undefined, shares: ["100", "0", "0"], broker: undefined },
    { id: "grp-med-00", code: "MED-2025-04", name: "Merkato Medium · 00 (closed)", scheme: "sch-med", status: "cancelled", members: 3, max: 30, drawn: 0, openPaid: 0, manager: "u-mgr-2", shares: ["100", "0", "0"], broker: undefined },
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
      sacco_admin_fee_share: p.shares[0],
      agent_admin_fee_share: p.shares[1],
      broker_admin_fee_share: p.shares[2],
      broker_user_id: p.broker ?? null,
      guarantee_required_override: (p as { noGuarantee?: boolean }).noGuarantee ? false : null,
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
      drawWinners(r, addDays(r.contribution_due_date, 0.5));
    }
    // Current round: partially paid, ready to draw.
    const open = rounds[p.drawn];
    openRound(open);
    const payCount = Math.round(open.payments.length * p.openPaid);
    open.payments.slice(0, payCount).forEach((pay) => recordPayment(open, pay, addDays(open.contribution_due_date, -0.2)));
  }

  // Three of today's Merkato payments were collected in the field (already
  // confirmed), and one High Merchant member's cash is still awaiting confirmation.
  {
    const medOpen = groupRounds("grp-med-01").find((r) => r.status === "open")!;
    medOpen.payments.filter((p) => p.status === "paid").slice(0, 3).forEach((p, i) => {
      const id = uid("pay");
      p.payment_id = id;
      db.pendingPayments[id] = { group_id: "grp-med-01", member_id: p.member_id, round_ids: [medOpen.id], status: "completed", collected_at: now(), reference: i === 0 ? "RC-1042" : "", amount: p.amount };
    });
    const hmOpen = groupRounds("grp-hm-01").find((r) => r.status === "open")!;
    const unpaid = hmOpen.payments.find((p) => p.status !== "paid")!;
    const id = uid("pay");
    unpaid.status = "processing";
    unpaid.payment_id = id;
    db.pendingPayments[id] = { group_id: "grp-hm-01", member_id: unpaid.member_id, round_ids: [hmOpen.id], status: "pending", collected_at: now(), reference: "TX-88213", amount: unpaid.amount };
  }

  // The VIP draft departs from its category (10 members at 40,000 instead of 50,000).
  Object.assign(group("grp-vip-01"), { contribution_amount_override: "40000.00", payout_amount_override: "400000.00", admin_fee_override: "2000.00" });

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
  const t = groupTerms(g);
  const m2 = (n: number) => n.toFixed(2);
  const effective_terms: EqubTermsResponse = {
    contribution_amount: m2(t.contribution_amount),
    admin_fee: m2(t.admin_fee),
    takaful_fee: m2(t.takaful_fee),
    payout_amount: m2(t.payout_amount),
    total_per_round: m2(perRound(t)),
    frequency: t.frequency,
    members_per_group: t.members_per_group,
    winners_per_round: t.winners_per_round,
    total_rounds: t.total_rounds,
    guarantee_required: t.guarantee_required,
    accepted_guarantee_types: t.accepted_guarantee_types,
  };
  return { ...rest, equb_scheme: scheme(g.equb_scheme_id) ? schemeDto(scheme(g.equb_scheme_id)!) : undefined, manager: managerInfo(manager_user_id), effective_terms, cycle_number: g.cycle_number ?? 1, previous_group_id: g.previous_group_id ?? null, current_members: groupMembers(g.id).length };
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

/** Both draw conditions: every member settled, and the collection window has closed. */
function notReadyReason(r: StoredRound): string {
  if (r.status === "drawn" || r.status === "completed" || r.status === "cancelled") return "";
  if (r.status === "scheduled") return "Collection window has not opened yet";
  const unpaid = r.payments.filter((p) => p.status !== "paid").length;
  if (unpaid > 0) return `Contributions outstanding: ${unpaid} of ${r.payments.length} members have not paid`;
  if (new Date(r.contribution_due_date).getTime() > Date.now()) return "Collection window has not closed yet";
  return "";
}

function roundDto(r: StoredRound): EqubRoundResponse {
  const g = group(r.group_id);
  const s = groupTerms(g);
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
    not_ready_reason: notReadyReason(r),
    total_members: total,
    paid_count: paid.length,
    unpaid_count: r.payments.length - paid.length,
    payment_percentage: total ? Math.round((paid.length / total) * 1000) / 10 : 0,
    total_contribution: paid.length * s.contribution_amount,
    total_admin_fee: paid.length * s.admin_fee,
    total_takaful_fee: paid.length * s.takaful_fee,
    payout_amount: s.payout_amount * s.winners_per_round,
    member_payments: payments,
    can_execute_draw: isOpen && eligibleDto.length > 0 && notReadyReason(r) === "",
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

/** What the external payment system does when a collection is confirmed or fails. */
function settlePendingPayment(paymentId: string, status: "completed" | "cancelled" | "failed") {
  const pp = db.pendingPayments[paymentId];
  if (!pp || pp.status !== "pending") return;
  const paidAt = now();
  const openNo = groupRounds(pp.group_id).find((x) => x.status === "open")?.round_number ?? 0;
  for (const rid of pp.round_ids) {
    const r = db.rounds.find((x) => x.id === rid);
    const p = r?.payments.find((x) => x.member_id === pp.member_id);
    if (!r || !p) continue;
    if (status === "completed") {
      recordPayment(r, p, paidAt);
      p.payment_id = paymentId;
      if (r.round_number < openNo) p.isCatchUp = true;
    } else {
      p.status = "pending";
      p.payment_id = "";
    }
  }
  pp.status = status;
}

// ---- SACCO-wide fee ledger + attachments (mock) ----
function feeLedgerLines(): EqubFeeLine[] {
  const out: EqubFeeLine[] = [];
  for (const r of db.rounds) {
    if (!r.payments.length) continue;
    const g = group(r.group_id); const s = scheme(g.equb_scheme_id)!; const t = groupTerms(g);
    for (const p of r.payments) {
      const d = dirById(p.member_id);
      const contribution = p.amount - p.admin_fee - t.takaful_fee;
      out.push({
        contribution_id: p.id, member_id: p.member_id, member_name: d?.full ?? p.member_id, membership_number: d?.number ?? "—",
        group_id: g.id, group_code: g.code, group_name: g.name, scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
        round_id: r.id, round_number: r.round_number, scheduled_at: r.scheduled_at,
        contribution_amount: contribution.toFixed(2), admin_fee: p.admin_fee.toFixed(2), takaful_fee: t.takaful_fee.toFixed(2), total_amount: p.amount.toFixed(2),
        status: p.status === "processing" ? "pending" : p.status, collected: p.status === "paid", is_catch_up: p.isCatchUp, paid_at: p.paid_at, payment_id: p.payment_id, created_at: r.created_at,
      });
    }
  }
  return out;
}

// ---- Admin fee ledger helpers ----
function feeLine(r: StoredRound, p: StoredPayment): EqubAdminFeeLine {
  const d = dirById(p.member_id);
  const collected = p.status === "paid";
  return {
    contribution_id: p.id,
    member_id: p.member_id,
    member_name: d?.full ?? p.member_id,
    membership_number: d?.number ?? "—",
    round_id: r.id,
    round_number: r.round_number,
    scheduled_at: r.scheduled_at,
    amount: p.admin_fee.toFixed(2),
    collected,
    is_catch_up: p.isCatchUp,
    paid_at: p.paid_at,
    payment_id: collected ? p.payment_id : "",
    status: p.status,
  };
}
function feeTotals(lines: EqubAdminFeeLine[]): EqubAdminFeeTotals {
  const charged = lines.reduce((a, l) => a + Number(l.amount), 0);
  const collected = lines.filter((l) => l.collected).reduce((a, l) => a + Number(l.amount), 0);
  return { charged: charged.toFixed(2), collected: collected.toFixed(2), outstanding: (charged - collected).toFixed(2) };
}
function feeSplit(g: StoredGroup, lines: EqubAdminFeeLine[]): EqubAdminFeeSplit {
  const collected = Number(feeTotals(lines).collected);
  const pct = (v?: string) => Number(v ?? 0);
  const amt = (v?: string) => ((collected * pct(v)) / 100).toFixed(2);
  return {
    sacco_share_percent: String(pct(g.sacco_admin_fee_share)),
    sacco_amount: amt(g.sacco_admin_fee_share),
    agent_share_percent: String(pct(g.agent_admin_fee_share)),
    agent_amount: amt(g.agent_admin_fee_share),
    broker_share_percent: String(pct(g.broker_admin_fee_share)),
    broker_amount: amt(g.broker_admin_fee_share),
  };
}

const takafulBalance = (gid: string) =>
  Math.round(db.takaful.filter((t) => t.equb_group_id === gid).reduce((sum, t) => sum + (t.type === "contribution" ? t.amount : -t.amount), 0) * 100) / 100;

const matches = (q: string | undefined, ...fields: string[]) => !q || fields.some((f) => f.toLowerCase().includes(q.toLowerCase()));

/** Slice a full list into one page with the envelope's pagination meta. */
function paginate<T>(all: T[], page = 1, perPage = 10) {
  const p = Math.max(1, page), n = Math.max(1, perPage);
  return { items: all.slice((p - 1) * n, p * n), meta: { page: p, per_page: n, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / n)) } };
}

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
    return db.schemes.filter((s) => (!params?.status || s.status === params.status) && matches(params?.search, s.name, s.code)).map(schemeDto);
  },
  async listSchemesPage(params) {
    await delay();
    return paginate(db.schemes.filter((s) => (!params.status || s.status === params.status) && matches(params.search, s.name, s.code)).map(schemeDto), params.page, params.per_page);
  },
  async createScheme(body) {
    await delay();
    const code = body.code?.trim() || nextCode("EQS", ++schemeSeq);
    if (!/^[A-Za-z0-9]+$/.test(code)) fail("Code may contain letters and digits only (no hyphens or spaces)");
    if (db.schemes.some((s) => s.code === code)) fail(`A category with code ${code} already exists`);
    if (Math.abs(body.payout_amount - body.contribution_amount * body.members_per_group) > 0.001)
      fail(`Payout must equal contribution × members per group (${body.contribution_amount} × ${body.members_per_group} = ${body.contribution_amount * body.members_per_group})`);
    // The live API creates schemes active.
    const s: StoredScheme = { id: uid("sch"), status: "active", description: "", admin_fee: 0, takaful_fee: 0, guarantee_required: true, accepted_guarantee_types: ["member", "cheque", "collateral"], ...body, code, created_by: "u-admin", created_at: now(), updated_at: now() } as StoredScheme;
    db.schemes.push(s);
    return schemeDto(s);
  },
  async getScheme(id) {
    await delay();
    return schemeDto(scheme(id) ?? fail("Equb scheme not found"));
  },
  async updateScheme(id, body) {
    await delay();
    const s = scheme(id) ?? fail("Equb scheme not found");
    const code = body.code?.trim() || s.code;
    if (!/^[A-Za-z0-9]+$/.test(code)) fail("Code may contain letters and digits only (no hyphens or spaces)");
    if (db.schemes.some((x) => x.id !== id && x.code === code)) fail(`A category with code ${code} already exists`);
    if (Math.abs(body.payout_amount - body.contribution_amount * body.members_per_group) > 0.001)
      fail(`Payout must equal contribution × members per group (${body.contribution_amount} × ${body.members_per_group} = ${body.contribution_amount * body.members_per_group})`);
    Object.assign(s, body, { code, updated_at: now() });
    return schemeDto(s);
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
  async listGroupsPage(params) {
    await delay();
    const all = db.groups
      .filter((g) => (!params.equb_scheme_id || g.equb_scheme_id === params.equb_scheme_id) && (!params.status || g.status === params.status) && matches(params.search, g.name, g.code))
      .map(groupDto);
    return paginate(all, params.page, params.per_page);
  },
  async getGroup(id) {
    await delay();
    return groupDto(group(id));
  },
  async createGroup(body) {
    await delay();
    const s = scheme(body.equb_scheme_id) ?? fail("Equb scheme not found");
    if (s.status === "cancelled") fail("Cannot create an Equb from a cancelled category");
    const code = body.code?.trim() || nextCode("EQG", ++groupSeq);
    if (db.groups.some((g) => g.code === code)) fail(`An Equb with code ${code} already exists`);
    // The creator manages the group until an admin reassigns it.
    const g: StoredGroup = { id: uid("grp"), code, name: body.name, status: "draft", equb_scheme_id: s.id, max_members: body.max_members, start_date: body.start_date ?? "", expected_end_date: body.expected_end_date ?? "", created_by: "u-admin", manager_user_id: "u-admin", created_at: now(), updated_at: now() };
    for (const k of OVERRIDE_KEYS) if (body[k] !== undefined && body[k] !== null && body[k] !== "") Object.assign(g, { [k]: body[k] });
    applyShares(g, body, true);
    validateTerms(g);
    db.groups.push(g);
    return groupDto(g);
  },
  async updateGroup(id, body) {
    await delay();
    const current = group(id);
    if (current.status !== "draft") fail("Only draft Equbs can be edited — activation freezes their terms");
    if (body.max_members != null && body.max_members < groupMembers(id).length) fail("Maximum members cannot be lower than the current roster");
    // Work on a copy so a refused update leaves the group untouched.
    const g: StoredGroup = clone(current);
    if (body.clear_term_overrides) for (const k of OVERRIDE_KEYS) delete (g as Record<string, unknown>)[k];
    const { clear_term_overrides: _clear, sacco_admin_fee_share, agent_admin_fee_share, broker_admin_fee_share, broker_user_id, ...rest } = body;
    void _clear;
    Object.assign(g, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined && v !== "")));
    applyShares(g, { sacco_admin_fee_share, agent_admin_fee_share, broker_admin_fee_share, broker_user_id }, false);
    validateTerms(g);
    // Object.assign never removes keys, so drop cleared overrides explicitly.
    for (const k of OVERRIDE_KEYS) if (!(k in g)) delete (current as Record<string, unknown>)[k];
    Object.assign(current, g, { updated_at: now() });
    return groupDto(current);
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
    const s = groupTerms(g);
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
    const s = groupTerms(g);
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
  async cloneGroup(id, body) {
    await delay(400);
    const src = group(id);
    if (src.status !== "completed" && src.status !== "cancelled") fail("Only a completed or cancelled Equb can start a next cycle");
    const cycle = (src.cycle_number ?? 1) + 1;
    const code = body.code?.trim() || nextCode("EQG", ++groupSeq);
    if (db.groups.some((g) => g.code === code)) fail(`An Equb with code ${code} already exists`);
    const members = body.copy_members === false ? [] : groupMembers(id).filter((m) => m.status === "active");
    if (body.max_members && body.max_members < members.length) fail("Maximum members cannot be lower than the members being copied");
    const { id: _oldId, code: _oldCode, name: _oldName, ...rest } = src;
    void _oldId; void _oldCode; void _oldName;
    const g: StoredGroup = { ...clone(rest), id: uid("grp"), code, name: body.name?.trim() || `${src.name.replace(/ · Cycle \d+$/, "")} · Cycle ${cycle}`, status: "draft", max_members: body.max_members ?? src.max_members, start_date: body.start_date ?? "", expected_end_date: "", cycle_number: cycle, previous_group_id: src.id, created_at: now(), updated_at: now() };
    db.groups.push(g);
    members.forEach((m) => db.members.push({ id: uid("em"), group_id: g.id, member_id: m.member_id, position: m.position, status: "active", joined_at: now() }));
    return { group: groupDto(g), previous_group_id: src.id, previous_group_code: src.code, members_copied: members.length, bans_carried_over: 0, next_step: "Activate the new Equb with a start date to generate its rounds." };
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
    const s = groupTerms(g);
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
      // Money as decimal strings, like the live API.
      total_collected: String(allPaid.length * perRound(s)),
      total_payouts: String(wins.filter((w) => w.status === "paid").reduce((sum, w) => sum + w.payout_amount, 0)),
      total_admin_fees: String(allPaid.length * s.admin_fee),
      total_takaful_fees: String(allPaid.length * s.takaful_fee),
      takaful_balance: String(takafulBalance(groupId)),
      wins_distributed: wins.length,
    };
  },

  // ---- Members ----
  async listGroupMembers(groupId, params) {
    await delay();
    group(groupId);
    return groupMembers(groupId).filter((m) => !params?.status || m.status === params.status).map(memberDto);
  },
  async listGroupMembersPage(groupId, params) {
    await delay();
    group(groupId);
    return paginate(groupMembers(groupId).filter((m) => !params.status || m.status === params.status).map(memberDto), params.page, params.per_page);
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
      const s = groupTerms(g);
      open.payments.push({ id: uid("ctb"), member_id: memberId, amount: perRound(s), admin_fee: s.admin_fee, status: "pending", paid_at: "", payment_id: "", isCatchUp: false });
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

  async getMember(id) {
    await delay(150);
    const d = dirById(id) ?? fail("Member not found");
    const i = directory.indexOf(d);
    return {
      id: d.id, full_name: d.full, first_name: d.first, last_name: d.last, email: `${d.first.toLowerCase()}.${d.last.toLowerCase()}@example.com`,
      phone_number: d.phone, gender: i % 3 === 0 ? "female" : "male", age: 24 + (i % 30), membership_number: d.number, member_category: "regular",
      photo: "", status: d.status, created_at: addDays("2025-01-10T09:00:00Z", i * 3),
      branch: { id: "br-1", name: i % 2 ? "Bole" : "Merkato", code: i % 2 ? "BOL" : "MRK" },
      current_address: { region: "Addis Ababa", subcity: i % 2 ? "Bole" : "Addis Ketema", kebele: String(3 + (i % 12)), house_number: String(100 + i) },
      emergency_contacts: [{ full_name: `${LAST[(i + 3) % LAST.length]} ${FIRST[(i + 5) % FIRST.length]}`, phone_number: `+2519${String(20000000 + i * 131).padStart(8, "0")}`, relationship: i % 2 ? "Spouse" : "Sibling" }],
    };
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
    const reason = r.status !== "open" ? `Round is ${r.status}` : notReadyReason(r) || (dto.eligible_count === 0 ? "No member is eligible for this round" : "");
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
      winners_per_round: groupTerms(g).winners_per_round,
      eligible_members: dto.eligible_members ?? [],
      excluded_members: dto.excluded_members ?? [],
    };
  },
  async executeDraw(roundId) {
    await delay(700);
    const r = db.rounds.find((x) => x.id === roundId) ?? fail("Round not found");
    if (r.status !== "open") fail("Only an open round can be drawn");
    const why = notReadyReason(r);
    if (why) fail(`Round is not ready to draw: ${why}`);
    drawWinners(r, now());
    const next = groupRounds(r.group_id).find((x) => x.status === "scheduled");
    if (next) openRound(next);
    else group(r.group_id).status = "completed";
    return null;
  },
  async refreshReadiness() {
    await delay();
    const ready = db.rounds.filter((r) => r.status === "open" && notReadyReason(r) === "");
    return { updated: ready.length };
  },

  async groupAdminFees(groupId) {
    await delay();
    const g = group(groupId);
    const rounds = groupRounds(groupId).filter((r) => r.payments.length > 0);
    const lines = rounds.flatMap((r) => r.payments.map((p) => feeLine(r, p)));
    const members = groupMembers(groupId).map((m) => {
      const own = lines.filter((l) => l.member_id === m.member_id);
      const d = dirById(m.member_id);
      return { member_id: m.member_id, member_name: d?.full ?? m.member_id, membership_number: d?.number ?? "—", rounds: own.length, paid_count: own.filter((l) => l.collected).length, totals: feeTotals(own) };
    });
    return {
      group_id: g.id,
      group_code: g.code,
      group_name: g.name,
      fee_per_member_per_round: groupTerms(g).admin_fee.toFixed(2),
      totals: feeTotals(lines),
      split: feeSplit(g, lines),
      rounds: rounds.map((r) => {
        const own = lines.filter((l) => l.round_id === r.id);
        return { round_id: r.id, round_number: r.round_number, scheduled_at: r.scheduled_at, status: r.status, members: own.length, paid_count: own.filter((l) => l.collected).length, totals: feeTotals(own) };
      }),
      members,
    };
  },
  async roundAdminFees(roundId) {
    await delay();
    const r = db.rounds.find((x) => x.id === roundId) ?? fail("Round not found");
    const g = group(r.group_id);
    const lines = r.payments.map((p) => feeLine(r, p));
    return { group_id: g.id, group_name: g.name, round_id: r.id, round_number: r.round_number, scheduled_at: r.scheduled_at, contribution_due_date: r.contribution_due_date, status: r.status, totals: feeTotals(lines), split: feeSplit(g, lines), lines };
  },
  async memberAdminFees(groupId, memberId) {
    await delay();
    const g = group(groupId);
    if (!groupMembers(groupId).some((m) => m.member_id === memberId)) fail("Member is not in this Equb");
    const lines = groupRounds(groupId).flatMap((r) => r.payments.filter((p) => p.member_id === memberId).map((p) => feeLine(r, p)));
    const d = dirById(memberId);
    return { group_id: g.id, group_name: g.name, member_id: memberId, member_name: d?.full ?? memberId, membership_number: d?.number ?? "—", totals: feeTotals(lines), lines };
  },

  async feeLedger(params) {
    await delay();
    let lines = feeLedgerLines()
      .filter((l) => !params.scheme_id || l.scheme_id === params.scheme_id)
      .filter((l) => !params.group_id || l.group_id === params.group_id)
      .filter((l) => !params.round_id || l.round_id === params.round_id)
      .filter((l) => !params.contribution_id || l.contribution_id === params.contribution_id)
      .filter((l) => !params.member_id || l.member_id === params.member_id)
      .filter((l) => !params.status || l.status === params.status)
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at) || a.member_name.localeCompare(b.member_name));
    const sum = (f: (l: EqubFeeLine) => number, only?: (l: EqubFeeLine) => boolean) => lines.filter(only ?? (() => true)).reduce((a, l) => a + f(l), 0).toFixed(2);
    const paid = (l: EqubFeeLine) => l.collected;
    const totals = {
      contributions: lines.length, members: new Set(lines.map((l) => l.member_id)).size, rounds: new Set(lines.map((l) => l.round_id)).size,
      contribution_charged: sum((l) => Number(l.contribution_amount)), contribution_collected: sum((l) => Number(l.contribution_amount), paid),
      admin_fee_charged: sum((l) => Number(l.admin_fee)), admin_fee_collected: sum((l) => Number(l.admin_fee), paid),
      takaful_fee_charged: sum((l) => Number(l.takaful_fee)), takaful_fee_collected: sum((l) => Number(l.takaful_fee), paid),
      total_charged: sum((l) => Number(l.total_amount)), total_collected: sum((l) => Number(l.total_amount), paid),
    };
    const page = paginate(lines, params.page, params.per_page);
    lines = page.items;
    return { page: page.meta.page, per_page: page.meta.per_page, total: page.meta.total, totals, records: lines };
  },
  async listRoundAttachments(roundId) {
    await delay();
    const recs = db.attachments.filter((a) => a.round_id === roundId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(({ data_url, ...a }) => ({ ...a, file_url: data_url }));
    return { records: recs, total: recs.length };
  },
  async listContributionAttachments(contributionId) {
    await delay();
    const recs = db.attachments.filter((a) => a.equb_contribution_id === contributionId).map(({ data_url, ...a }) => ({ ...a, file_url: data_url }));
    return { records: recs, total: recs.length };
  },
  async uploadContributionAttachment(contributionId, file, description) {
    await delay(500);
    const r = db.rounds.find((x) => x.payments.some((p) => p.id === contributionId)) ?? fail("Contribution not found");
    const p = r.payments.find((x) => x.id === contributionId)!;
    if (db.attachments.filter((a) => a.equb_contribution_id === contributionId).length >= 10) fail("A contribution may carry at most 10 attachments");
    if (file.size > 10 * 1024 * 1024) fail("File is larger than 10MB");
    const dataUrl = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error("read failed")); fr.readAsDataURL(file); });
    const a = { id: uid("att"), equb_contribution_id: contributionId, member_id: p.member_id, member_name: dirById(p.member_id)?.full ?? p.member_id, round_id: r.id, round_number: r.round_number, file_name: file.name, file_size: file.size, mime_type: file.type, file_url: "", is_image: file.type.startsWith("image/"), description: description ?? "", uploaded_by: "u-admin", created_at: now(), data_url: dataUrl };
    db.attachments.push(a);
    const { data_url, ...dto } = a;
    return { ...dto, file_url: data_url };
  },
  async deleteContributionAttachment(contributionId, attachmentId) {
    await delay();
    db.attachments = db.attachments.filter((a) => !(a.equb_contribution_id === contributionId && a.id === attachmentId));
    return null;
  },
  async downloadContributionAttachment(contributionId, attachmentId) {
    await delay();
    const a = db.attachments.find((x) => x.equb_contribution_id === contributionId && x.id === attachmentId) ?? fail("Attachment not found");
    const res = await fetch(a.data_url);
    return res.blob();
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
  async approveWinner(winnerId) {
    await delay();
    const w = db.winners.find((x) => x.id === winnerId) ?? fail("Winner not found");
    if (groupTerms(group(w.group_id)).guarantee_required) fail("This Equb requires a guarantee: approve the winner's guarantee instead");
    if (w.status === "paid") fail("This winner is already paid");
    w.status = "approved";
    w.guarantee_status = "not_required";
    return winnerDto(w);
  },
  async processPayout(winnerId) {
    await delay(500);
    const w = db.winners.find((x) => x.id === winnerId) ?? fail("Winner not found");
    if (w.status === "paid") fail("This payout was already processed");
    if (w.guarantee_status !== "approved" && w.guarantee_status !== "not_required") fail("An approved guarantee is required before payout");
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
  async listTakaful(groupId, params) {
    await delay();
    return clone(db.takaful.filter((t) => t.equb_group_id === groupId && (!params?.round_id || t.equb_round_id === params.round_id) && (!params?.type || t.type === params.type)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async listTakafulPage(groupId, page, perPage) {
    await delay();
    return paginate(clone(db.takaful.filter((t) => t.equb_group_id === groupId).sort((a, b) => b.created_at.localeCompare(a.created_at))), page, perPage);
  },
  async takafulBalance(groupId) {
    await delay();
    return { balance: String(takafulBalance(groupId)) };
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
  async listAgents(params) {
    await delay(150);
    const onlyActive = params.status === "true";
    return clone(
      staffUsers
        .filter((u) => (u.roles ?? []).some((r) => /agent|manager/i.test(r.name)))
        .filter((u) => (!onlyActive || u.status) && matches(params.search, u.full_name, u.email, u.phone))
        .map((u) => ({ id: u.id, full_name: u.full_name, first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone, status: u.status, is_agent: true, roles: u.roles }))
    );
  },
  async listAgentsPage(params) {
    await delay(150);
    const rows = staffUsers
      .filter((u) => (u.roles ?? []).some((r) => /agent|manager/i.test(r.name)))
      .filter((u) => matches(params.search, u.full_name, u.email, u.phone))
      .filter((u) => !params.status || String(u.status) === params.status)
      .filter((u) => !params.branch_id || u.branch_id === params.branch_id)
      .map((u) => ({ id: u.id, full_name: u.full_name, first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone, status: u.status, is_agent: true, roles: u.roles }));
    return paginate(clone(rows), params.page, params.per_page);
  },
  async getAgent(id) {
    await delay(150);
    const u = staffUsers.find((x) => x.id === id) ?? fail("Agent not found");
    return clone({ id: u.id, full_name: u.full_name, first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone, status: u.status, is_agent: true, roles: u.roles });
  },
  async listUsersPage(params) {
    await delay(150);
    const rows = staffUsers
      .filter((u) => matches(params.search, u.full_name, u.email, u.phone))
      .filter((u) => !params.status || String(u.status) === params.status)
      .filter((u) => !params.branch_id || u.branch_id === params.branch_id)
      .filter((u) => !params.role_id || (u.roles ?? []).some((r) => r.id === params.role_id));
    return paginate(clone(rows), params.page, params.per_page);
  },
  async listBranches() {
    await delay(100);
    return [{ id: "hq", name: "Head Office", branch_code: "HQ" }, { id: "merkato", name: "Merkato", branch_code: "MKT" }];
  },
  async listUserRoles() {
    await delay(100);
    const seen = new Map<string, { id: string; name: string }>();
    for (const u of staffUsers) for (const r of u.roles ?? []) seen.set(r.id, { id: r.id, name: r.name });
    return [...seen.values()];
  },

  // ---- Recording a contribution (staff) ----
  async collectContribution(groupId, memberId, body, proof) {
    await delay(400);
    const g = group(groupId);
    if (g.status !== "active") fail("Payments can only be recorded for an active Equb");
    if (!groupMembers(groupId).some((m) => m.member_id === memberId)) fail("Member is not in this Equb");
    if (!body.round_ids?.length) fail("Select at least one round");
    const t = groupTerms(g);
    const paidAt = now();
    const rows: { round_id: string; round_number: number; amount: number }[] = [];
    for (const rid of body.round_ids) {
      const r = db.rounds.find((x) => x.id === rid && x.group_id === groupId) ?? fail("Round not found in this Equb");
      const p = r.payments.find((x) => x.member_id === memberId) ?? fail(`Round #${r.round_number} is not open for payment yet`);
      if (p.status === "paid") fail(`Round #${r.round_number} is already paid`);
      if (p.status === "processing") fail(`Round #${r.round_number} already has a payment awaiting confirmation`);
      rows.push({ round_id: r.id, round_number: r.round_number, amount: p.amount });
    }
    // Like the real backend: the payment is raised as *pending* and the
    // contribution only settles once the payment system confirms it. The mock
    // plays the payment system and settles it a few seconds later.
    const paymentId = uid("pay");
    for (const row of rows) {
      const r = db.rounds.find((x) => x.id === row.round_id)!;
      const p = r.payments.find((x) => x.member_id === memberId)!;
      p.status = "processing";
      p.payment_id = paymentId;
    }
    db.pendingPayments[paymentId] = { group_id: groupId, member_id: memberId, round_ids: rows.map((r) => r.round_id), status: "pending", collected_at: now(), reference: body.reference ?? "", amount: rows.reduce((a, r) => a + r.amount, 0) };
    setTimeout(() => settlePendingPayment(paymentId, "completed"), 6000);
    void t;
    void paidAt;
    // One slip covers every round in the request: stored once, filed against each contribution.
    let attachments: { id: string; file_name: string; contribution_ids: string[] }[] | undefined;
    if (proof) {
      const dataUrl = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error("read failed")); fr.readAsDataURL(proof.file); });
      const ids: string[] = [];
      for (const row of rows) {
        const r = db.rounds.find((x) => x.id === row.round_id)!;
        const p = r.payments.find((x) => x.member_id === memberId)!;
        ids.push(p.id);
        db.attachments.push({ id: uid("att"), equb_contribution_id: p.id, member_id: memberId, member_name: dirById(memberId)?.full ?? memberId, round_id: r.id, round_number: r.round_number, file_name: proof.file.name, file_size: proof.file.size, mime_type: proof.file.type, file_url: "", is_image: proof.file.type.startsWith("image/"), description: proof.description ?? "", uploaded_by: "u-admin", created_at: now(), data_url: dataUrl });
      }
      attachments = [{ id: uid("att"), file_name: proof.file.name, contribution_ids: ids }];
    }
    // Mirror the server: marking back-pay rounds requires is_catch_up.
    if (rows.some((r) => r.round_number < (groupRounds(groupId).find((x) => x.status === "open")?.round_number ?? 0)) && !body.is_catch_up) fail("is_catch_up must be true when collecting missed rounds");
    return { group_id: groupId, payment_id: paymentId, status: "pending", amount: rows.reduce((a, r) => a + r.amount, 0), total_amount: rows.reduce((a, r) => a + r.amount, 0), rounds: rows, attachments };
  },
  async updatePaymentStatus(paymentId, body) {
    await delay(300);
    const pp = db.pendingPayments[paymentId] ?? fail("Payment not found");
    if (pp.status !== "pending") fail(`This payment is already ${pp.status}`);
    if (body.status === "completed" || body.status === "cancelled" || body.status === "failed") settlePendingPayment(paymentId, body.status);
    else pp.status = body.status;
    return { id: paymentId, status: pp.status };
  },
  async memberStanding(groupId, memberId) {
    await delay();
    const g = group(groupId);
    const m = groupMembers(groupId).find((x) => x.member_id === memberId) ?? fail("Member is not in this Equb");
    const rounds = groupRounds(groupId);
    const open = rounds.find((r) => r.status === "open");
    const owed = rounds.flatMap((r) => r.payments.filter((p) => p.member_id === memberId && p.status !== "paid").map((p) => ({ r, p })));
    const catchUp = owed.filter(({ r }) => open && r.round_number < open.round_number);
    const unpaidAmount = owed.reduce((a, { p }) => a + p.amount, 0);
    const banned = m.status === "suspended";
    const status = banned ? "banned" : catchUp.length > 0 ? "owing" : owed.length > 0 ? "warning" : "good";
    const what: string[] = [];
    if (banned) what.push(`Suspended: ${m.suspend_reason ?? "see the Members tab"}. Lift the suspension before the next draw.`);
    if (owed.length) what.push(`Pay ${owed.length} outstanding round(s) — ${unpaidAmount.toFixed(2)} ETB — to be eligible for the next draw.`);
    if (!what.length) what.push("Nothing owed. The member is in good standing.");
    return {
      group_id: g.id,
      group_name: g.name,
      member_id: memberId,
      status,
      good: status === "good",
      banned,
      banned_until_round: 0,
      warning_issued: owed.length > 0,
      missed_count: catchUp.length,
      current_round: open?.round_number ?? 0,
      eligible_next_draw: !banned && owed.length === 0 && !hasWon(groupId, memberId),
      unpaid_rounds: owed.length,
      unpaid_amount: unpaidAmount,
      catch_up_rounds: catchUp.length,
      catch_up_amount: catchUp.reduce((a, { p }) => a + p.amount, 0),
      what_to_do: what,
    };
  },

  // ---- Manager ----
  async managerGroups() { await delay(); return db.groups.map(groupDto); },
  async managerSchemes() { await delay(); return db.schemes.map(schemeDto); },
  async catchUpAmount(groupId, memberId) {
    await delay(150);
    const g = group(groupId);
    if (!groupMembers(groupId).some((m) => m.member_id === memberId)) fail("Member is not in this Equb");
    const rounds = groupRounds(groupId);
    const open = rounds.find((r) => r.status === "open");
    const missed = rounds.filter((r) => open && r.round_number < open.round_number && r.payments.some((p) => p.member_id === memberId && p.status !== "paid"));
    const per = perRound(groupTerms(g));
    return { group_id: groupId, member_id: memberId, rounds_missed: missed.length, per_round_amount: per, total_catch_up: missed.length * per, next_round_number: open?.round_number ?? 0 };
  },
  async adminCollections(params) {
    // Same ledger as my-collections; the mock has one collector, so collected_by is accepted and ignored.
    const all = await this.myCollections(params);
    const filtered = all.collections.filter((c) => !params?.status || c.status === params.status || (params.status === "completed" && c.status === "confirmed"));
    const per = params?.per_page ?? 20;
    const page = params?.page ?? 1;
    return { ...all, count: filtered.slice((page - 1) * per, page * per).length, collections: filtered.slice((page - 1) * per, page * per) };
  },
  async myCollections(params) {
    await delay();
    const day = (iso: string) => iso.slice(0, 10);
    const today = day(now());
    const from = params?.from || today;
    const to = params?.to || today;
    const items = Object.entries(db.pendingPayments)
      .map(([id, p]) => ({ id, ...p }))
      .filter((p) => day(p.collected_at) >= from && day(p.collected_at) <= to)
      .filter((p) => !params?.group_id || p.group_id === params.group_id)
      .filter((p) => !params?.member_id || p.member_id === params.member_id)
      .filter((p) => !params?.scheme_id || group(p.group_id).equb_scheme_id === params.scheme_id)
      .sort((a, b) => b.collected_at.localeCompare(a.collected_at))
      .map((p) => {
        const g = group(p.group_id);
        const d = dirById(p.member_id);
        return {
          payment_id: p.id,
          member_id: p.member_id,
          member_name: d?.full ?? "",
          group_id: g.id,
          group_name: g.name,
          scheme_id: g.equb_scheme_id,
          scheme_name: scheme(g.equb_scheme_id)?.name ?? "",
          amount: p.amount,
          reference_number: p.reference,
          status: p.status === "completed" ? "confirmed" : p.status,
          collected_at: p.collected_at,
        };
      });
    const sum = (f: (x: (typeof items)[number]) => boolean) => items.filter(f).reduce((a, x) => a + x.amount, 0);
    return { from, to, count: items.length, total_collected: String(sum(() => true)), total_confirmed: String(sum((x) => x.status === "confirmed")), total_pending: String(sum((x) => x.status !== "confirmed")), collections: items };
  },
};
