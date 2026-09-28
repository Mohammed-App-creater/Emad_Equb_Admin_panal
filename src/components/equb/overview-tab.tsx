"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
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
  // What the Equb actually runs on; the category is only the template.
  const terms = equb.effectiveTerms ?? (cat ? { ...cat, totalPerRound: cat.contribution + cat.adminFee + cat.takafulFee } : undefined);
  const o = equb.overrides ?? {};
  const custom = (key: keyof typeof o) => (o[key] !== undefined ? <span className="ml-1 rounded bg-primary/10 px-1 py-px text-[10px] font-semibold uppercase text-primary">{t("custom")}</span> : null);

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
              <Row
                label={t("manager")}
                value={equb.manager ? <span title={[equb.manager.email, equb.manager.phone].filter(Boolean).join(" · ")}>{equb.manager.fullName}</span> : <span className="italic text-muted-foreground">{t("noManager")}</span>}
              />
              <Row label={t("createdAt")} value={formatDate(equb.createdAt)} />
              <Row label={t("start")} value={formatDate(equb.startDate)} />
              <Row label={t("end")} value={formatDate(equb.expectedEndDate)} />
              <Row label={t("members")} value={t("membersOf", { current: equb.currentMembers, max: equb.maxMembers })} />
              <Row label={t("cycle")} value={equb.previousEqubId ? <Link href={`/dashboard/equbs/${equb.previousEqubId}`} className="hover:underline">{t("cycleOf", { n: equb.cycleNumber })} · {t("previousCycle")}</Link> : t("cycleOf", { n: equb.cycleNumber })} />
              {equb.manager?.phone && <Row label={t("managerContact")} value={equb.manager.phone} />}
              <Row label={tc("status")} value={<StatusBadge status={equb.status} kind="lifecycle" />} />
            </dl>
          </CardContent>
        </Card>

        {/* Category terms */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t("termsInForce")}</CardTitle>
            {Object.keys(o).length > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t("customTerms")}</span>}
          </CardHeader>
          <CardContent className="space-y-4">
            {terms ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Row label={t("contribution")} value={<>{formatCurrency(terms.contribution)}{custom("contribution")}</>} />
                <Row label={t("adminFee")} value={<>{formatCurrency(terms.adminFee)}{custom("adminFee")}</>} />
                <Row label={t("takafulFee")} value={<>{formatCurrency(terms.takafulFee)}{custom("takafulFee")}</>} />
                <Row label={t("totalPerRound")} value={<strong>{formatCurrency(terms.totalPerRound)}</strong>} />
                <Row label={t("payout")} value={<><span className="font-semibold text-primary">{formatCurrency(terms.payout)}</span>{custom("payout")}</>} />
                <Row label={t("frequency")} value={<>{tcat.has(terms.frequency) ? tcat(terms.frequency) : terms.frequency}{custom("frequency")}</>} />
                <Row label={t("winnersPerRound")} value={<>{terms.winnersPerRound}{custom("winnersPerRound")}</>} />
                <Row label={t("totalRounds")} value={<>{terms.totalRounds}{custom("totalRounds")}</>} />
                <Row label={t("guaranteeRequired")} value={<>{terms.guaranteeRequired ? (terms.acceptedGuaranteeTypes.length ? terms.acceptedGuaranteeTypes.map((g) => tcat(`guarantee_${g}`)).join(", ") : tc("yes")) : tc("no")}{custom("guaranteeRequired")}</>} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {equb.feeShares && (
              <div className="border-t border-border pt-3 text-sm">
                <p className="text-xs text-muted-foreground">{t("feeSplit")}</p>
                <p className="font-medium text-foreground">
                  {t("shareSacco")} {equb.feeShares.sacco}% · {t("shareAgent")} {equb.feeShares.agent}% · {t("shareBroker")} {equb.feeShares.broker}%
                </p>
              </div>
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
                  {/* The live dashboard does not send next_due_date yet. */}
                  {dashboard.nextDueDate && <span className="flex items-center gap-1.5">
                    <CalendarClock size={14} /> {t("nextDueDate")}: <strong className="text-foreground">{formatDate(dashboard.nextDueDate)}</strong>
                  </span>}
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
