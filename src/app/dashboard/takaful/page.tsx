"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PiggyBank, CircleDot, Trophy, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { EqubFilter, RoundFilter } from "@/components/equb/equb-filter";
import { TakafulTab } from "@/components/equb/takaful-tab";
import { useEqubs, useTakafulBalances, useRounds } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";

/**
 * Takaful with one Equb filter on top (default: all Equbs). "All" shows fund
 * totals across every Equb; picking one shows that Equb's full Takaful ledger
 * (the same component as the Equb's own Takaful tab).
 */
function TakafulInner() {
  const t = useTranslations("takaful");
  const tc = useTranslations("common");
  const router = useRouter();

  const { data: allEqubs, isLoading } = useEqubs();
  // Draft Equbs haven't collected anything yet, so they have no fund.
  const equbs = (allEqubs ?? []).filter((e) => e.status !== "draft");
  const [equbId, setEqubId] = useState("all");
  const selected = equbs.find((e) => e.id === equbId);
  const [roundId, setRoundId] = useState("all");
  const { data: rounds, isLoading: roundsLoading } = useRounds(selected?.id ?? "");

  const balances = useTakafulBalances(selected ? [] : equbs.map((e) => e.id));
  const rows = equbs.map((e, i) => ({ equb: e, balance: balances[i]?.data }));
  const total = rows.reduce((sum, r) => sum + (r.balance ?? 0), 0);
  const largest = rows.reduce<(typeof rows)[number] | undefined>((best, r) => ((r.balance ?? 0) > (best?.balance ?? -1) ? r : best), undefined);
  const balancesLoading = balances.some((b) => b.isLoading);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("generalSubtitle")}
        actions={selected && (
          <Button variant="outline" onClick={() => router.push(`/dashboard/equbs/${selected.id}?tab=takaful`)}>
            <ExternalLink size={14} className="mr-1" /> {t("openInEqub")}
          </Button>
        )}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <EqubFilter value={equbId} onChange={(v) => { setEqubId(v); setRoundId("all"); }} equbs={equbs} loading={isLoading} label={t("equb")} allLabel={tc("all")} />
        <RoundFilter value={roundId} onChange={setRoundId} rounds={rounds ?? []} loading={roundsLoading} disabled={!selected} label={t("round")} allLabel={tc("all")} />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("surplusNote")}</span>
      </div>

      {selected ? (
        <TakafulTab key={selected.id} equb={selected} roundId={roundId} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label={t("totalBalance")} value={balancesLoading && !total ? "…" : formatCurrency(total)} icon={PiggyBank} tone="primary" />
          <StatCard label={t("equbsWithFund")} value={isLoading ? "…" : rows.length} icon={CircleDot} tone="info" />
          <StatCard label={t("largestFund")} value={largest ? formatCurrency(largest.balance ?? 0) : "—"} hint={largest?.equb.name} icon={Trophy} tone="secondary" />
        </div>
      )}
    </div>
  );
}

export default function TakafulPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYOUT_READ, EKUB_PERMS.EQUB_READ, EKUB_PERMS.CATEGORY_READ]}>
      <TakafulInner />
    </RequirePermission>
  );
}
