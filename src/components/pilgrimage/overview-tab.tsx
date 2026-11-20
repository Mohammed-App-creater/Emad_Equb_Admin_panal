"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, CalendarClock, Clock, HandCoins, PiggyBank, Trophy, UserRoundCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/shared";
import {
  useContributionLedger, useParticipations, usePilgrimageCycles, usePilgrimageDecisions, usePilgrimageProducts, usePilgrimageWinners,
} from "@/hooks/pilgrimage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PStatus } from "@/components/pilgrimage/shared";

/**
 * Where the module stands: money on the Equb ledger, who is saving, the
 * running draws, and every queue waiting for a person.
 */
export function OverviewTab({ productId, onOpenTab }: { productId?: string; onOpenTab: (tab: string) => void }) {
  const t = useTranslations("pilgrimage.overview");
  const product = { product_id: productId };
  const ledger = useContributionLedger({ ...product, limit: 1 });
  const pendingContributions = useContributionLedger({ ...product, status: "pending", limit: 1 });
  const saving = useParticipations({ ...product, status: "active", limit: 1 });
  const cycles = usePilgrimageCycles({ ...product, limit: 10 });
  const awaitingTerms = usePilgrimageWinners({ status: "awaiting_terms", limit: 5 });
  const transferring = usePilgrimageWinners({ status: "transferring", limit: 1 });
  const stuck = usePilgrimageWinners({ status: "finance_pending", limit: 1 });
  const pendingDecisions = usePilgrimageDecisions({ status: "pending_approval", limit: 1 });
  const refunds = usePilgrimageDecisions({ status: "processing", limit: 1 });
  const { data: products } = usePilgrimageProducts();

  const running = (cycles.data?.items ?? []).filter((c) => c.status !== "closed" && c.status !== "cancelled");
  const unconfigured = (products ?? []).filter((p) => p.status === "active" && !p.holding_bank_id && !p.holding_payment_account_id);
  const totals = ledger.data?.totals;

  const queue = [
    { key: "contributions", count: pendingContributions.data?.meta.total ?? 0, tab: "contributions", icon: PiggyBank },
    { key: "terms", count: awaitingTerms.data?.meta.total ?? 0, tab: "winners", icon: HandCoins },
    { key: "transfers", count: transferring.data?.meta.total ?? 0, tab: "winners", icon: Clock },
    { key: "finances", count: stuck.data?.meta.total ?? 0, tab: "winners", icon: AlertTriangle },
    { key: "withdrawals", count: pendingDecisions.data?.meta.total ?? 0, tab: "decisions", icon: UserRoundCheck },
    { key: "refunds", count: refunds.data?.meta.total ?? 0, tab: "decisions", icon: HandCoins },
  ];

  return (
    <div className="space-y-6">
      {unconfigured.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">{t("holdingMissing", { products: unconfigured.map((p) => p.name).join(", ") })}</p>
            <button type="button" className="text-primary hover:underline" onClick={() => onOpenTab("products")}>{t("configure")}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("onLedger")} value={formatCurrency(totals?.saved_amount ?? 0)} hint={t("onLedgerHint")} icon={PiggyBank} tone="primary" />
        <StatCard label={t("saving")} value={saving.data?.meta.total ?? 0} hint={t("savingHint")} icon={UserRoundCheck} tone="info" />
        <StatCard label={t("fees")} value={formatCurrency((totals?.admin_fee_collected ?? 0) + (totals?.takaful_fee_collected ?? 0))}
          hint={t("feesHint", { admin: formatCurrency(totals?.admin_fee_collected ?? 0), takaful: formatCurrency(totals?.takaful_fee_collected ?? 0) })} icon={HandCoins} tone="success" />
        <StatCard label={t("runningDraws")} value={running.length} hint={running[0] ? t("nextDraw", { date: formatDate(running[0].draw_at) }) : t("noDraw")} icon={CalendarClock} tone="secondary" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("queueTitle")}</h3>
          <ul className="divide-y divide-border">
            {queue.map((q) => {
              const Icon = q.icon;
              return (
                <li key={q.key}>
                  <button type="button" onClick={() => onOpenTab(q.tab)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-muted/40">
                    <span className={q.count > 0 ? "flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary" : "flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{t(`queue_${q.key}` as never)}</span>
                      <span className="block text-xs text-muted-foreground">{t(`queueHint_${q.key}` as never)}</span>
                    </span>
                    <span className={q.count > 0 ? "rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground" : "text-xs text-muted-foreground"}>{q.count}</span>
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-semibold text-foreground">{t("drawsTitle")}</h3>
          {cycles.isLoading ? <Skeleton className="h-24 w-full" /> : running.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noDraw")}</p>
          ) : running.map((c) => (
            <Link key={c.id} href={`/dashboard/pilgrimage/cycles/${c.id}`} className="block rounded-xl border border-border p-3 hover:bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <PStatus status={c.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("drawLine", { closes: formatDate(c.registration_closes_at), draw: formatDate(c.draw_at) })}</p>
              <p className="text-xs text-muted-foreground">{t("requiredLine", { amount: formatCurrency(c.required_contribution), slots: c.winners_per_cycle })}</p>
            </Link>
          ))}
          {(awaitingTerms.data?.items ?? []).length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Trophy size={13} className="text-primary" /> {t("awaitingTerms")}</p>
              {awaitingTerms.data!.items.map((w) => (
                <Link key={w.id} href={`/dashboard/pilgrimage/participations/${w.participation_id}`} className="flex justify-between text-xs hover:underline">
                  <span>{w.member?.full_name}</span>
                  <span className="tabular-nums text-muted-foreground">{formatCurrency(w.recognised_savings)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
