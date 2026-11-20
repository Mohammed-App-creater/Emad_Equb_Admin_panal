"use client";

import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Clock, Info, Target, Trophy, UsersRound, Wallet, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/shared";
import { feeTotal, PStatus } from "@/components/pilgrimage/shared";
import { cycleYear, summarizeMembers, type CycleMember } from "@/components/pilgrimage/cycle-members";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { CycleStatus, PilgrimageCycle, PilgrimageProduct } from "@/types/pilgrimage";

const STEPS: CycleStatus[] = ["open", "locked", "drawn", "approved", "closed"];

/**
 * A cycle at a glance: where it is in its lifecycle, its dates, the product
 * terms it runs on, and live money and eligibility figures from its members.
 */
export function CycleOverview({ cycle, product, members, membersLoading, live }: {
  cycle: PilgrimageCycle;
  product?: PilgrimageProduct | null;
  members: CycleMember[];
  membersLoading: boolean;
  /** Members are live registrations (registration still open) rather than frozen draw entries. */
  live: boolean;
}) {
  const t = useTranslations("pilgrimage.overview");
  const tcy = useTranslations("pilgrimage.cycle");
  const td = useTranslations("pilgrimage.cycleDates");
  const tp = useTranslations("pilgrimage.product");
  const to = useTranslations("pilgrimage.option");
  const tb = useTranslations("pilgrimage.basis");
  const tc = useTranslations("common");
  const s = summarizeMembers(members);
  const p = product ?? cycle.product ?? undefined;
  const fee = (value?: number, basis?: string) =>
    value && value > 0 && basis ? `${basis.startsWith("percent") ? `${value}%` : formatCurrency(value)} ${tb(`${basis}_short` as never)}` : "—";

  return (
    <div className="space-y-6">
      <Lifecycle cycle={cycle} />

      {membersLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={live ? t("registered") : t("entries")} value={s.count} hint={t("inGroups", { count: s.groups })} icon={UsersRound} tone="primary" />
          <StatCard label={t("eligible")} value={`${s.eligible} / ${s.count}`} hint={t("belowThreshold", { count: s.behind })} icon={CheckCircle2} tone="success" />
          <StatCard label={live ? t("saved") : t("savedAtClose")} value={formatCurrency(s.saved)} hint={t("towardsTarget", { rate: s.rate })} icon={Wallet} tone="info" />
          <StatCard label={t("stillToSave")} value={formatCurrency(s.remaining)} hint={t("forEligibility")} icon={Clock} tone={s.remaining > 0 ? "warning" : "secondary"} />
          <StatCard label={tcy("required")} value={formatCurrency(cycle.required_contribution)} hint={tcy("ofPackage", { percent: cycle.eligibility_percent, amount: formatCurrency(cycle.package_cost) })} icon={Target} tone="secondary" />
          <StatCard label={tcy("winners")} value={cycle.drawn_at ? `${cycle.winner_count} / ${cycle.winners_per_cycle}` : `— / ${cycle.winners_per_cycle}`} hint={cycle.overflow > 0 ? tcy("overflowHint", { count: cycle.overflow }) : undefined} icon={Trophy} tone={cycle.overflow > 0 ? "warning" : "primary"} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label={tc("name")} value={cycle.name} />
              <Row label={t("year")} value={cycleYear(cycle)} />
              <Row label={t("product")} value={p ? `${p.name} · ${p.code}` : cycle.product_id} />
              <Row label={tp("kind")} value={p ? tp(`kind_${p.kind}` as never) : "—"} />
              <Row label={t("number")} value={`#${cycle.number}`} />
              <Row label={tc("status")} value={<PStatus status={cycle.status} />} />
              <Row label={tcy("opensAt")} value={formatDate(cycle.opens_at)} />
              <Row label={tcy("registrationCloses")} value={formatDate(cycle.registration_closes_at)} />
              <Row label={tcy("drawAt")} value={formatDate(cycle.draw_at)} />
              <Row label={td("contract_deadline")} value={formatDate(cycle.contract_deadline)} />
              <Row label={td("closes_at")} value={formatDate(cycle.closes_at)} />
              <Row label={tcy("decisionDeadline")} value={cycle.decision_deadline ? formatDate(cycle.decision_deadline) : "—"} />
              {cycle.locked_at && <Row label={t("lockedAt")} value={formatDateTime(cycle.locked_at)} />}
              {cycle.drawn_at && <Row label={tcy("drawnAt")} value={formatDateTime(cycle.drawn_at)} />}
              {cycle.approved_at && <Row label={tcy("approvedAt")} value={formatDateTime(cycle.approved_at)} />}
              {cycle.closed_at && <Row label={t("closedAt")} value={formatDateTime(cycle.closed_at)} />}
            </dl>
            {cycle.note && <p className="mt-4 border-t border-border pt-3 text-sm"><span className="text-muted-foreground">{tcy("note")}: </span>{cycle.note}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("terms")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label={tp("packageCost")} value={<strong>{formatCurrency(cycle.package_cost)}</strong>} />
              <Row label={tp("eligibilityPercent")} value={`${cycle.eligibility_percent}%`} />
              <Row label={tcy("required")} value={<span className="font-semibold text-primary">{formatCurrency(cycle.required_contribution)}</span>} />
              <Row label={tp("winnersPerCycle")} value={cycle.winners_per_cycle} />
              {p && (
                <>
                  <Row label={tp("frequency")} value={tp(`frequency_${p.cycle_frequency}` as never)} />
                  <Row label={tp("savingPeriodMonths")} value={p.saving_period_months} />
                  <Row label={t("groupSize")} value={`${p.group_min_members}–${p.group_max_members}`} />
                  <Row label={tp("decisionWindowDays")} value={p.decision_window_days} />
                  <Row label={tp("contractDays")} value={p.winner_contract_days} />
                  <Row label={tp("adminShort")} value={tp("weeklyShort", { weekly: formatCurrency(p.admin_fee_weekly), weeks: p.fee_weeks, total: formatCurrency(feeTotal(p.admin_fee_weekly, p.fee_weeks)) })} />
                  <Row label={tp("takafulShort")} value={tp("weeklyShort", { weekly: formatCurrency(p.takaful_fee_weekly), weeks: p.fee_weeks, total: formatCurrency(feeTotal(p.takaful_fee_weekly, p.fee_weeks)) })} />
                  <Row label={tp("defaultDecision")} value={to(p.default_decision)} />
                  <Row label={tp("savingType")} value={p.saving_type?.name ?? "—"} />
                </>
              )}
            </dl>
            {p && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs text-muted-foreground">{tp("sectionFinance")}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Row label={tp("financeMonths")} value={p.finance_duration_months} />
                  <Row label={tp("repaymentInterval")} value={p.repayment_interval_months} />
                  <Row label={tp("serviceBasis")} value={fee(p.service_charge_value, p.service_charge_basis)} />
                  <Row label={tp("takafulBasis")} value={fee(p.takaful_value, p.takaful_basis)} />
                  <Row label={t("equbShare")} value={`${p.equb_service_charge_share}%`} />

                </dl>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!live && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("frozenHint")}</span>
        </div>
      )}
    </div>
  );
}

/** open → locked → drawn → approved → closed, with the current step highlighted. */
function Lifecycle({ cycle }: { cycle: PilgrimageCycle }) {
  const t = useTranslations("pilgrimage.overview");
  const ts = useTranslations("pilgrimage.status");
  const cancelled = cycle.status === "cancelled";
  // A cancelled cycle stopped at the last step it reached.
  const reached = cancelled ? (cycle.locked_at ? 1 : 0) : STEPS.indexOf(cycle.status);
  const when: Partial<Record<CycleStatus, string | null | undefined>> = {
    open: cycle.opens_at, locked: cycle.locked_at ?? cycle.registration_closes_at, drawn: cycle.drawn_at ?? cycle.draw_at, approved: cycle.approved_at, closed: cycle.closed_at,
  };
  return (
    <Card>
      <CardContent className="p-5">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((step, i) => {
            const done = i < reached || (i === reached && step === "closed");
            const current = i === reached && !done;
            return (
              <li key={step} className="flex flex-col items-center gap-1.5 text-center">
                <div className="flex w-full items-center">
                  <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= reached ? "bg-primary" : "bg-border")} />
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done ? "bg-primary text-primary-foreground" : current ? (cancelled ? "bg-destructive text-destructive-foreground" : "bg-primary/15 text-primary ring-2 ring-primary") : "bg-muted text-muted-foreground",
                  )}>
                    {done ? <Check size={14} /> : current && cancelled ? <X size={14} /> : i + 1}
                  </span>
                  <span className={cn("h-0.5 flex-1", i === STEPS.length - 1 ? "bg-transparent" : i < reached ? "bg-primary" : "bg-border")} />
                </div>
                <span className={cn("text-xs font-medium", current || done ? "text-foreground" : "text-muted-foreground")}>{t(`step_${step}`)}</span>
                <span className="text-[11px] text-muted-foreground">{when[step] ? formatDate(when[step]!) : "—"}</span>
              </li>
            );
          })}
        </ol>
        {cancelled && <p className="mt-3 text-center text-sm text-destructive">{ts("cancelled")}{cycle.note ? ` · ${cycle.note}` : ""}</p>}
      </CardContent>
    </Card>
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
