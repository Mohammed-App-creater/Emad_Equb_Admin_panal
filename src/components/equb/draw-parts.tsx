"use client";

import type { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/equb/status-badge";
import type { WheelEntry } from "@/components/equb/spin-wheel";
import { formatCurrency } from "@/lib/utils";
import type { ExcludedMember, Round, RoundWinner, Winner } from "@/types/ekub";

// Pieces shared by the round detail page and the draw page.

export interface WinnerRow { key: string; position: number; name: string; sub: string; payout: number; status: string }

/** The winners endpoint carries membership numbers and live status; round detail is the fallback. */
export function toWinnerRows(winners: Winner[] | undefined, round: Round): WinnerRow[] {
  return winners?.length
    ? winners.map((w) => ({ key: w.id, position: w.position, name: w.name, sub: w.membershipNumber || w.phone, payout: w.payoutAmount, status: w.status }))
    : round.winners.map((w) => ({ key: `${w.memberId}-${w.position}`, position: w.position, name: w.name, sub: w.phone, payout: w.payoutAmount, status: w.status }));
}

export type WheelState = { entries: WheelEntry[]; winners: string[] | null; finished?: boolean };

/** Winners in turn order; one missing from the frozen pool still gets a slice to land on. */
export function withWinners(w: WheelState, ws: RoundWinner[]): WheelState {
  const sorted = [...ws].sort((a, b) => a.position - b.position);
  const extra = sorted.filter((x) => !w.entries.some((e) => e.id === x.memberId)).map((x) => ({ id: x.memberId, label: x.name, short: x.name.slice(0, 3) }));
  return { ...w, entries: [...w.entries, ...extra], winners: sorted.map((x) => x.memberId) };
}

export function exclusionReason(m: ExcludedMember, t: ReturnType<typeof useTranslations<"rounds">>): string {
  const parts: string[] = [];
  if (!m.contributionPaid) parts.push(t("unpaidContribution"));
  if (m.previouslyWon) parts.push(t("previouslyWon"));
  if (m.isBanned) parts.push(t("banned"));
  if (m.hasUnpaidCatchUp) parts.push(t("unpaidCatchUp"));
  if (m.reason) parts.push(m.reason);
  return parts.join(" · ");
}

export function WinnerList({ title, rows, loading, empty, className }: { title: string; rows: WinnerRow[]; loading: boolean; empty: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-secondary/40 bg-secondary/5 ${className ?? ""}`}>
      <p className="flex items-center gap-1.5 border-b border-secondary/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
        <Trophy size={14} /> {title}
      </p>
      {loading ? (
        <div className="space-y-2 p-3"><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" /></div>
      ) : rows.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
          {[...rows].sort((a, b) => a.position - b.position).map((w) => (
            <li key={w.key} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-secondary-foreground">{w.position}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                {w.sub && <p className="truncate text-xs text-muted-foreground">{w.sub}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(w.payout)}</span>
                <StatusBadge status={w.status} kind="winner" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
