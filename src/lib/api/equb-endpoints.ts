/**
 * Real Equb backend endpoints, filtered from the Sacco/Equb OpenAPI spec
 * (swagger.json). All paths are relative to NEXT_PUBLIC_API_BASE_URL, which
 * already includes the `/api/v1` basePath (host: api.emadssl.com).
 *
 * Domain model (important — differs from the mock's flat "Tier + Draw"):
 *   Scheme  = reusable template/catalogue entry (our "Tier"), lifecycle
 *             draft → active → completed → cancelled.
 *   Group   = a running instance created from a Scheme (our "cycle", ~200
 *             members). Owns members, rounds, takaful, dashboard.
 *   Round   = one draw period within a Group; has winners.
 *   Winner  = a member drawn in a round; carries guarantee + payout.
 *
 * These replace the mock branches in services/ekub.ts once we wire real data.
 */
export const EQUB_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login", // { identifier, password } → JWT + profile
    LOGIN_TOTP: "/auth/login-totp",
    LOGOUT: "/auth/logout",
    PROFILE: "/auth/profile",
    REFRESH: "/auth/refresh-token",
  },

  // ---- Overview ----
  // Per-group admin dashboard powers our Overview tiles/charts.
  DASHBOARD: (groupId: string) => `/equb/admin/groups/${groupId}/admin-dashboard`,

  // ---- Tiers (= Schemes: the configurable catalogue, FR-2.1/2.1a) ----
  SCHEMES: {
    LIST: "/equb/admin/schemes",
    CREATE: "/equb/admin/schemes",
    DETAIL: (id: string) => `/equb/admin/schemes/${id}`,
    UPDATE: (id: string) => `/equb/admin/schemes/${id}`,
    DELETE: (id: string) => `/equb/admin/schemes/${id}`,
  },

  // ---- Groups / cycles (create, lifecycle, members) ----
  GROUPS: {
    LIST: "/equb/admin/groups",
    CREATE: "/equb/admin/groups",
    DETAIL: (id: string) => `/equb/admin/groups/${id}`,
    UPDATE: (id: string) => `/equb/admin/groups/${id}`,
    DELETE: (id: string) => `/equb/admin/groups/${id}`,
    ACTIVATE: (id: string) => `/equb/admin/groups/${id}/activate`,
    CANCEL: (id: string) => `/equb/admin/groups/${id}/cancel`,
    EXTEND: (id: string) => `/equb/admin/groups/${id}/extend`,
    MEMBERS: (id: string) => `/equb/admin/groups/${id}/members`,
    MEMBER: (id: string, memberId: string) => `/equb/admin/groups/${id}/members/${memberId}`,
    SUSPEND_MEMBER: (id: string, memberId: string) => `/equb/admin/groups/${id}/members/${memberId}/suspend`,
    UNSUSPEND_MEMBER: (id: string, memberId: string) => `/equb/admin/groups/${id}/members/${memberId}/unsuspend`,
    SWAP_POSITIONS: (id: string) => `/equb/admin/groups/${id}/members/swap-positions`,
    ROUNDS: (id: string) => `/equb/admin/groups/${id}/rounds`,
  },

  // ---- Draws / rounds (FR-4.x) ----
  ROUNDS: {
    DETAIL: (roundId: string) => `/equb/admin/rounds/${roundId}`,
    DRAW_PREVIEW: (roundId: string) => `/equb/admin/rounds/${roundId}/draw-preview`, // eligibility preview
    EXECUTE_DRAW: (roundId: string) => `/equb/admin/rounds/${roundId}/draw`, // runs RNG, records winners
    WINNERS: (roundId: string) => `/equb/admin/rounds/${roundId}/winners`,
    DRAW_CANDIDATES: (drawId: string) => `/equb/admin/draws/${drawId}/candidates`,
  },

  // ---- Hardship early-turn (= emergency draws, FR-4.6a) ----
  EMERGENCY_DRAWS: {
    LIST: (groupId: string) => `/equb/admin/groups/${groupId}/emergency-draws`,
    SUBMIT: (groupId: string) => `/equb/admin/groups/${groupId}/emergency-draws`,
    APPROVE: (requestId: string) => `/equb/admin/emergency-draws/${requestId}/approve`,
    REJECT: (requestId: string) => `/equb/admin/emergency-draws/${requestId}/reject`,
  },

  // ---- Payout / guarantor / collateral (FR-5.x) ----
  GUARANTEES: {
    CREATE: (winnerId: string) => `/equb/admin/winners/${winnerId}/guarantee`,
    APPROVE: (guaranteeId: string) => `/equb/admin/guarantees/${guaranteeId}/approve`,
    REJECT: (guaranteeId: string) => `/equb/admin/guarantees/${guaranteeId}/reject`,
  },
  PAYOUT: (winnerId: string) => `/equb/admin/winners/${winnerId}/payout`,

  // ---- Penalties / contributions (FR-3.4, FR-8.4) ----
  CONTRIBUTIONS: {
    MARK_OVERDUE: "/equb/admin/contributions/mark-overdue",
  },
  AUTO_CANCEL: "/equb/admin/auto-cancel",

  // ---- Takaful (FR-T*) — fully supported by the backend ----
  TAKAFUL: {
    LIST: (groupId: string) => `/equb/admin/groups/${groupId}/takaful`,
    BALANCE: (groupId: string) => `/equb/admin/groups/${groupId}/takaful/balance`,
    CLAIMS: (groupId: string) => `/equb/admin/groups/${groupId}/takaful/claims`,
    DISTRIBUTE_SURPLUS: (groupId: string) => `/equb/admin/groups/${groupId}/takaful/distribute-surplus`,
    REFUND: (groupId: string) => `/equb/admin/groups/${groupId}/takaful/refund`,
  },

  // ---- Membership approvals (FR-1.6 / FR-8.2) ----
  // Handled by the shared member-registration-request flow, not under /equb.
  REGISTRATION_REQUESTS: {
    LIST: "/member-registration-requests",
    DETAIL: (id: string) => `/member-registration-requests/${id}`,
    APPROVE: (id: string) => `/member-registration-requests/${id}/approve`,
    REJECT: (id: string) => `/member-registration-requests/${id}/reject`,
  },

  // ---- Member directory / KYC (FR-1.x) ----
  MEMBERS: {
    LIST: "/members",
    DETAIL: (id: string) => `/members/${id}`,
    STATUS: (id: string) => `/members/${id}/status`,
    ID_PHOTO: (id: string) => `/members/${id}/id-photo`,
    PROFILE_PHOTO: (id: string) => `/members/${id}/profile-photo`,
  },

  // ---- Staff & roles (FR-8.7, NFR-4) ----
  USERS: {
    LIST: "/users",
    ROLES: "/users/roles",
    PERMISSIONS: "/users/permissions",
    BRANCHES: "/users/branches",
  },
  USER_ROLES: {
    LIST: "/user-roles",
    ASSIGN_PERMISSIONS: "/user-roles/assign-permissions",
    REVOKE_USER_ROLE: "/user-roles/revoke-user-role",
    REVOKE_ROLE_PERMISSION: "/user-roles/revoke-role-permission",
  },

  // ---- Reports (deferred module — backend already exposes these) ----
  REPORTS: {
    EXECUTIVE_SNAPSHOT: "/reports/executive/snapshot",
    MEMBER_STATS: "/reports/members/stats",
    MEMBER_GROWTH: "/reports/members/growth",
    PAYMENT_COLLECTION_EFFICIENCY: "/reports/payments/collection-efficiency",
    CASH_DAILY: "/reports/cash/daily",
  },

  // ---- Notifications (FR-9.x) ----
  PUSH: {
    SUBSCRIBE: "/push/subscribe",
    UNSUBSCRIBE: "/push/unsubscribe",
    SUBSCRIPTIONS: "/push/subscriptions",
  },

  // ---- Manager (portfolio) role, if we add a manager surface later ----
  MANAGER: {
    MY_GROUPS: "/equb/manager/my-groups",
    MY_SCHEMES: "/equb/manager/my-schemes",
    CATCH_UP: (groupId: string, memberId: string) =>
      `/equb/manager/my-groups/${groupId}/catch-up/${memberId}`,
  },
} as const;
