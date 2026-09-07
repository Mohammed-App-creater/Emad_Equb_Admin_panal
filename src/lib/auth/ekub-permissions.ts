"use client";

import { useAuthStore } from "@/lib/auth/auth-store";

/**
 * Equb-specific permission slugs. Segregation of duties (NFR-4, FR-7.4) is
 * enforced by these: Agents never hold the *:approve / draw:execute /
 * payout:approve slugs, so the corresponding controls are absent for them.
 *
 * Runtime checks are plain string membership against the auth store's
 * `permissions: string[]`, so these slugs work without extending the copied
 * Sacco `Permissions` map.
 */
export const EKUB_PERMS = {
  APPLICATION_READ: "application:read",
  APPLICATION_APPROVE: "application:approve",
  TIER_READ: "tier:read",
  TIER_MANAGE: "tier:manage",
  PAYMENT_READ: "payment:read",
  PAYMENT_RECONCILE: "payment:reconcile",
  DRAW_READ: "draw:read",
  DRAW_EXECUTE: "draw:execute",
  PAYOUT_READ: "payout:read",
  PAYOUT_APPROVE: "payout:approve",
  PENALTY_READ: "penalty:read",
  PENALTY_MANAGE: "penalty:manage",
  DISPUTE_READ: "dispute:read",
  DISPUTE_RESOLVE: "dispute:resolve",
  STAFF_READ: "staff:read",
  STAFF_MANAGE: "staff:manage",
  ROLE_READ: "role:read",
} as const;

export type EkubPerm = (typeof EKUB_PERMS)[keyof typeof EKUB_PERMS];

export function useEkubAccess() {
  const { permissions, isLoading, isInitialized } = useAuthStore();
  const has = (p: string) => permissions.includes(p);
  const hasAny = (ps: string[]) => ps.some((p) => permissions.includes(p));
  return { has, hasAny, permissions, isLoading, isReady: isInitialized };
}
