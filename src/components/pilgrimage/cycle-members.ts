"use client";

import { useMemo } from "react";
import { useProductParticipations } from "@/hooks/pilgrimage";
import type { DrawEntry, EntryOutcome, Participation, ParticipationStatus, PilgrimageCycle } from "@/types/pilgrimage";

/** One member of one Hajj/Umrah cycle, whichever source it came from. */
export interface CycleMember {
  participationId: string;
  number: string;
  memberName?: string;
  membershipNumber?: string;
  /** Live balance while registration is open; the balance frozen at lock afterwards. */
  balance: number;
  required: number;
  eligible: boolean;
  reason?: string;
  outcome?: EntryOutcome;
  pick?: number | null;
  groupId?: string | null;
  groupName?: string;
  status?: ParticipationStatus;
  /** The registration as it is today (its live balance, contract, current cycle). */
  participation?: Participation;
}

/**
 * True when the cycle's members are still the product's live registrations:
 * the backend records draw entries only when registration closes.
 */
export const isLive = (cycle: PilgrimageCycle, entries: DrawEntry[]) => cycle.status === "open" || entries.length === 0;

const fromParticipation = (p: Participation): CycleMember => ({
  participationId: p.id,
  number: p.number,
  memberName: p.member_name,
  membershipNumber: p.membership_number,
  balance: p.standing.balance,
  required: p.standing.required_contribution,
  eligible: p.standing.eligible,
  groupId: p.group?.id ?? null,
  groupName: p.group?.name,
  status: p.status,
  participation: p,
});

const fromEntry = (e: DrawEntry, p?: Participation): CycleMember => ({
  participationId: e.participation_id,
  number: e.participation_number,
  memberName: e.member_name ?? p?.member_name,
  membershipNumber: p?.membership_number,
  balance: e.balance,
  required: e.required,
  eligible: e.eligible,
  reason: e.reason,
  outcome: e.outcome,
  pick: e.pick,
  groupId: e.group_id ?? null,
  groupName: p?.group && p.group.id === e.group_id ? p.group.name : undefined,
  status: p?.status,
  participation: p,
});

/**
 * Members of a cycle. Before registration closes they are the product's
 * registrations whose current cycle is this one (or, if the backend leaves
 * current_cycle empty, every active registration of the product); afterwards
 * they are the draw entries, joined with today's registrations for contract
 * and status details.
 */
export function useCycleMembers(cycle: PilgrimageCycle | undefined, entries: DrawEntry[] | undefined) {
  const { data: participations, isLoading } = useProductParticipations(cycle?.product_id);
  const members = useMemo<CycleMember[]>(() => {
    if (!cycle) return [];
    const list = participations ?? [];
    const recorded = entries ?? [];
    if (!isLive(cycle, recorded)) {
      const byId = new Map(list.map((p) => [p.id, p]));
      return recorded.map((e) => fromEntry(e, byId.get(e.participation_id)));
    }
    if (cycle.status !== "open") return [];
    return list
      .filter((p) => (p.current_cycle ? p.current_cycle.id === cycle.id : p.status === "active"))
      .map(fromParticipation);
  }, [cycle, entries, participations]);
  return { members, isLoading };
}

/** Money and eligibility totals of a set of cycle members. */
export function summarizeMembers(members: CycleMember[]) {
  const saved = members.reduce((a, m) => a + m.balance, 0);
  const required = members.reduce((a, m) => a + m.required, 0);
  // Money only counts towards the target up to each member's own threshold.
  const towards = members.reduce((a, m) => a + Math.min(m.balance, m.required), 0);
  const remaining = members.reduce((a, m) => a + Math.max(0, m.required - m.balance), 0);
  const eligible = members.filter((m) => m.eligible).length;
  return {
    count: members.length,
    saved,
    required,
    remaining,
    eligible,
    behind: members.length - eligible,
    rate: required > 0 ? Math.round((towards / required) * 1000) / 10 : 0,
    groups: new Set(members.map((m) => m.groupId).filter(Boolean)).size,
  };
}

/** The calendar year a cycle belongs to: the year of its draw. */
export const cycleYear = (c: Pick<PilgrimageCycle, "draw_at">) => new Date(c.draw_at).getFullYear();
