import type {
  Application,
  Dispute,
  Payment,
  ReconciliationRow,
  RoleDef,
  StaffMember,
} from "@/types/ekub";

// In-memory mock store, used only when NEXT_PUBLIC_USE_MOCK=true and only for
// the modules that have no backend endpoint yet (payments ledger,
// reconciliation, disputes) plus demo fallbacks for applications and staff.
// Equb entities (categories, equbs, members, rounds, winners, takaful) are
// seeded separately in lib/mock/mock-equb-api.ts.

export const applications: Application[] = [
  {
    id: "app-1001",
    fullName: "Hanan Abdulahi",
    displayHandle: "hanan_a",
    gender: "female",
    age: 29,
    faydaId: "6001-2345-6789",
    phone: "+251911223344",
    occupation: "Merchant",
    estimatedMonthlyIncome: 45000,
    categoryId: "t1",
    status: "submitted",
    submittedAt: "2026-09-01T08:30:00+03:00",
    peerVotesFor: 118,
    peerVotesAgainst: 12,
    peerVoteQuorum: 100,
    sharePurchased: true,
    characterAttested: true,
    declarations: { shariaAccept: true, income: true, capacity: true, commitment: true, mutualBenefit: true },
    kycDocs: [
      { id: "d1", label: "Fayda ID (front)", url: "https://picsum.photos/seed/fayda1/600/380", kind: "fayda" },
      { id: "d2", label: "Selfie", url: "https://picsum.photos/seed/selfie1/400/400", kind: "selfie" },
    ],
    duplicateActiveMembership: false,
  },
  {
    id: "app-1002",
    fullName: "Bilal Yusuf",
    displayHandle: "bilal_y",
    gender: "male",
    age: 41,
    faydaId: "6002-8765-4321",
    phone: "+251922334455",
    occupation: "Private-org employee",
    estimatedMonthlyIncome: 30000,
    categoryId: "t2",
    status: "under_review",
    submittedAt: "2026-09-02T10:15:00+03:00",
    peerVotesFor: 64,
    peerVotesAgainst: 40,
    peerVoteQuorum: 100,
    sharePurchased: false,
    characterAttested: true,
    declarations: { shariaAccept: true, income: true, capacity: true, commitment: true, mutualBenefit: false },
    kycDocs: [
      { id: "d3", label: "Fayda ID (front)", url: "https://picsum.photos/seed/fayda2/600/380", kind: "fayda" },
      { id: "d4", label: "Business license", url: "https://picsum.photos/seed/lic2/600/380", kind: "license" },
    ],
    duplicateActiveMembership: false,
  },
  {
    id: "app-1003",
    fullName: "Sara Kemal",
    displayHandle: "sara_k",
    gender: "female",
    age: 34,
    faydaId: "6003-1111-2222",
    phone: "+251933445566",
    occupation: "Self-employed",
    estimatedMonthlyIncome: 120000,
    categoryId: "t3",
    status: "submitted",
    submittedAt: "2026-09-03T09:00:00+03:00",
    peerVotesFor: 90,
    peerVotesAgainst: 5,
    peerVoteQuorum: 100,
    sharePurchased: true,
    characterAttested: false,
    declarations: { shariaAccept: true, income: true, capacity: true, commitment: true, mutualBenefit: true },
    kycDocs: [
      { id: "d5", label: "Fayda ID (front)", url: "https://picsum.photos/seed/fayda3/600/380", kind: "fayda" },
    ],
    duplicateActiveMembership: true,
  },
  {
    id: "app-1004",
    fullName: "Nuru Ahmed",
    displayHandle: "nuru_a",
    gender: "male",
    age: 38,
    faydaId: "6004-3333-4444",
    phone: "+251944556677",
    occupation: "Government employee",
    estimatedMonthlyIncome: 22000,
    categoryId: "t1",
    status: "accepted",
    submittedAt: "2026-08-20T11:00:00+03:00",
    peerVotesFor: 140,
    peerVotesAgainst: 3,
    peerVoteQuorum: 100,
    sharePurchased: true,
    characterAttested: true,
    declarations: { shariaAccept: true, income: true, capacity: true, commitment: true, mutualBenefit: true },
    kycDocs: [],
    duplicateActiveMembership: false,
  },
];

export const payments: Payment[] = [
  { id: "p1", memberHandle: "nuru_a", ekubNumber: "EK-000123", categoryId: "t1", round: 42, amount: 1090, method: "mobile_money", timing: "on_time", receiptNo: "RC-88213", timestamp: "2026-09-06T07:12:00+03:00" },
  { id: "p2", memberHandle: "hanan_a", ekubNumber: "EK-000201", categoryId: "t1", round: 42, amount: 1090, method: "cash", timing: "on_time", receiptNo: "RC-88214", collectedBy: "Yusuf Kedir", timestamp: "2026-09-06T08:40:00+03:00" },
  { id: "p3", memberHandle: "bilal_y", ekubNumber: "EK-000342", categoryId: "t2", round: 42, amount: 10900, method: "bank_transfer", timing: "late", receiptNo: "RC-88215", timestamp: "2026-09-06T20:05:00+03:00" },
  { id: "p4", memberHandle: "sara_k", ekubNumber: "EK-000501", categoryId: "t3", round: 41, amount: 54000, method: "gateway", timing: "outage_grace", receiptNo: "RC-88190", timestamp: "2026-09-05T23:50:00+03:00" },
];

export const reconciliation: ReconciliationRow[] = [
  { id: "rc1", agentName: "Yusuf Kedir", cashCollected: 54500, bankDeposit: 54500, reconciled: true, date: "2026-09-05" },
  { id: "rc2", agentName: "Mimi Tesfaye", cashCollected: 98100, bankDeposit: 87200, reconciled: false, date: "2026-09-06" },
];

export const disputes: Dispute[] = [
  { id: "dp-1", memberHandle: "hanan_a", subject: "Payment not reflected in ledger", openedAt: "2026-09-05T09:00:00+03:00", status: "open" },
  { id: "dp-2", memberHandle: "sara_k", subject: "Question on Takaful surplus split", openedAt: "2026-09-03T14:00:00+03:00", status: "escalated" },
  { id: "dp-3", memberHandle: "abdi_r", subject: "Draw fairness clarification", openedAt: "2026-08-30T11:00:00+03:00", status: "resolved", resolution: "Shared RNG proof with member.", boardDecision: "Draw upheld as fair." },
];

export const staff: StaffMember[] = [
  { id: "s1", name: "Aisha Mohammed", role: "admin", branch: "HQ", email: "admin@emadekub.com", phone: "+251900000001" },
  { id: "s2", name: "Yusuf Kedir", role: "agent", branch: "Merkato", email: "agent@emadekub.com", phone: "+251900000002" },
  { id: "s3", name: "Mimi Tesfaye", role: "agent", branch: "Bole", email: "mimi@emadekub.com", phone: "+251900000003" },
  { id: "s4", name: "Sheikh Idris", role: "board_chair", branch: "HQ", email: "board@emadekub.com", phone: "+251900000004" },
];

export const roles: RoleDef[] = [
  { id: "r1", name: "Administrator", permissions: ["application:approve", "tier:manage", "payment:reconcile", "draw:execute", "payout:approve", "penalty:manage", "dispute:resolve", "staff:manage", "role:read"] },
  { id: "r2", name: "Agent", permissions: ["payment:read", "application:read"] },
  { id: "r3", name: "Manager", permissions: ["application:read", "payment:read", "draw:read", "payout:read", "penalty:read", "dispute:read"] },
  { id: "r4", name: "Board Chair", permissions: ["dispute:resolve", "payout:read", "draw:read"] },
];
