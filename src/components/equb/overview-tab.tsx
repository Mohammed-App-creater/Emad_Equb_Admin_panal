"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  UserX,
  HandCoins,
  PiggyBank,
  Coins,
  Trophy,
  Wallet,
  Info,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/shared";
import { StatusBadge } from "@/components/equb/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Equb, EqubDashboard } from "@/types/ekub";

interface Props {
  equb: Equb;
  dashboard?: EqubDashboard;
  dashboardLoading?: boolean;
}

/**
 * Equb overview: who owns it, the category terms it was created from, and the
 * live admin-dashboard figures (round progress, this round's collection,
 * financial totals). Reused by the Dashboard page and the Equb detail page.
 */
export function EqubOverview({ equb, dashboard, dashboardLoading }: Props) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const tcat = useTranslations("categories");
  const cat = equb.category;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label={t("code")} value={<span className="font-mono">{equb.code}</span>} />
              <Row label={t("category")} value={cat ? `${cat.name} · ${cat.code}` : equb.categoryId || "—"} />
              <Row label={t("owner")} value={<span className="break-all font-mono text-xs">{equb.createdBy || "—"}</span>} />
              <Row label={t("createdAt")} value={formatDate(equb.createdAt)} />
              <Row label={t("start")} value={formatDate(equb.startDate)} />
              <Row label={t("end")} value={formatDate(equb.expectedEndDate)} />
              <Row label={t("members")} value={t("membersOf", { current: equb.currentMembers, max: equb.maxMembers })} />
              <Row label={tc("status")} value={<StatusBadge status={equb.status} kind="lifecycle" />} />
            </dl>
          </CardContent>
        </Card>

        {/* Category terms */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("categoryDetails")}</CardTitle></CardHeader>
          <CardContent>
            {cat ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Row label={t("contribution")} value={formatCurrency(cat.contribution)} />
                <Row label={t("adminFee")} value={formatCurrency(cat.adminFee)} />
                <Row label={t("takafulFee")} value={formatCurrency(cat.takafulFee)} />
                <Row label={t("totalPerRound")} value={<strong>{formatCurrency(cat.contribution + cat.adminFee + cat.takafulFee)}</strong>} />
                <Row label={t("payout")} value={<span className="font-semibold text-primary">{formatCurrency(cat.payout)}</span>} />
                <Row label={t("frequency")} value={tcat.has(cat.frequency) ? tcat(cat.frequency) : cat.frequency} />
                <Row label={t("winnersPerRound")} value={String(cat.winnersPerRound)} />
                <Row label={t("totalRounds")} value={String(cat.totalRounds)} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live dashboard */}
      {dashboardLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{t("progress")}</CardTitle>
                <StatusBadge status={dashboard.drawStatus || "scheduled"} kind="round" />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold text-foreground">
                  {t("roundOf", { current: dashboard.currentRound, total: dashboard.totalRounds })}
                </p>
                <Bar value={dashboard.progressPercent} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{Math.round(dashboard.progressPercent)}%</span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock size={14} /> {t("nextDueDate")}: <strong className="text-foreground">{formatDate(dashboard.nextDueDate)}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("currentRound")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const total = dashboard.paidThisRound + dashboard.unpaidThisRound;
                  const pct = total > 0 ? (dashboard.paidThisRound / total) * 100 : 0;
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <Mini label={t("paidThisRound")} value={dashboard.paidThisRound} tone="text-success" />
                        <Mini label={t("unpaidThisRound")} value={dashboard.unpaidThisRound} tone="text-warning" />
                        <Mini label={t("eligibleForDraw")} value={dashboard.eligibleForDraw} tone="text-primary" />
                      </div>
                      <Bar value={pct} tone="bg-success" />
                      <p className="text-xs text-muted-foreground">{Math.round(pct)}%</p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("totalCollected")} value={formatCurrency(dashboard.totalCollected)} icon={Wallet} tone="primary" />
            <StatCard label={t("totalPayouts")} value={formatCurrency(dashboard.totalPayouts)} icon={HandCoins} tone="secondary" />
            <StatCard label={t("totalAdminFees")} value={formatCurrency(dashboard.totalAdminFees)} icon={Coins} tone="info" />
            <StatCard label={t("totalTakafulFees")} value={formatCurrency(dashboard.totalTakafulFees)} icon={PiggyBank} tone="success" />
            <StatCard label={t("takafulBalance")} value={formatCurrency(dashboard.takafulBalance)} icon={PiggyBank} tone="primary" />
            <StatCard label={t("winsDistributed")} value={dashboard.winsDistributed} icon={Trophy} tone="secondary" />
            <StatCard label={t("activeMembers")} value={dashboard.activeMembers} hint={`${t("totalMembers")}: ${dashboard.totalMembers}`} icon={Users} tone="success" />
            <StatCard label={t("suspendedMembers")} value={dashboard.suspendedMembers} icon={UserX} tone="destructive" />
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("noDashboard")}</span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Bar({ value, tone = "bg-primary" }: { value: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
