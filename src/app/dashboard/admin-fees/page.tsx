"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { EqubFilter, RoundFilter } from "@/components/equb/equb-filter";
import { AdminFeesTab, SplitCard } from "@/components/equb/admin-fees-tab";
import { FeeLedger } from "@/components/payments/fee-ledger";
import { useEqubs, useEqubAdminFeesMany, useRounds } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import type { EqubAdminFees, FeeSplit } from "@/types/ekub";

/**
 * Admin fees with one Equb filter on top (default: all Equbs). Every section
 * follows it: with "All" the cards, split and ledger cover every Equb; with one
 * Equb picked they show that Equb's fees (the same component as the Equb's own
 * Admin fees tab) and its fee lines.
 */
function AdminFeesInner() {
  const t = useTranslations("adminFees");
  const tc = useTranslations("common");
  const router = useRouter();

  const { data: allEqubs, isLoading } = useEqubs();
  // Drafts have no rounds yet, so nothing has been charged.
  const equbs = (allEqubs ?? []).filter((e) => e.status !== "draft");
  const [equbId, setEqubId] = useState("all");
  const selected = equbs.find((e) => e.id === equbId);
  const [roundId, setRoundId] = useState("all");
  const { data: rounds, isLoading: roundsLoading } = useRounds(selected?.id ?? "");

  const ledgers = useEqubAdminFeesMany(selected ? [] : equbs.map((e) => e.id));
  const fees = ledgers.map((l) => l.data).filter((f): f is EqubAdminFees => !!f);
  const loadingFees = ledgers.some((l) => l.isLoading);

  const sum = (pick: (f: EqubAdminFees) => number) => fees.reduce((a, f) => a + pick(f), 0);
  const charged = sum((f) => f.totals.charged);
  const collected = sum((f) => f.totals.collected);
  const outstanding = sum((f) => f.totals.outstanding);
  const saccoAmount = sum((f) => f.split.saccoAmount);
  const agentAmount = sum((f) => f.split.agentAmount);
  const brokerAmount = sum((f) => f.split.brokerAmount);
  const pct = (v: number) => (collected > 0 ? Math.round((v / collected) * 1000) / 10 : 0);
  const overallSplit: FeeSplit = {
    saccoAmount, agentAmount, brokerAmount,
    saccoPercent: pct(saccoAmount), agentPercent: pct(agentAmount), brokerPercent: pct(brokerAmount),
  };
  const dash = (v: number) => (loadingFees && v === 0 ? "…" : formatCurrency(v));

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("generalSubtitle")}
        actions={selected && (
          <Button variant="outline" onClick={() => router.push(`/dashboard/equbs/${selected.id}?tab=fees`)}>
            <ExternalLink size={14} className="mr-1" /> {t("openInEqub")}
          </Button>
        )}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <EqubFilter value={equbId} onChange={(v) => { setEqubId(v); setRoundId("all"); }} equbs={equbs} loading={isLoading} label={t("equb")} allLabel={tc("all")} />
        <RoundFilter value={roundId} onChange={setRoundId} rounds={rounds ?? []} loading={roundsLoading} disabled={!selected} label={t("round")} allLabel={tc("all")} />
      </div>

      {selected ? (
        <AdminFeesTab key={selected.id} equb={selected} round={roundId} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label={t("charged")} value={dash(charged)} icon={Coins} tone="info" />
            <StatCard label={t("collected")} value={dash(collected)} hint={charged > 0 ? `${Math.round((collected / charged) * 100)}%` : undefined} icon={CheckCircle2} tone="success" />
            <StatCard label={t("outstanding")} value={dash(outstanding)} icon={Clock} tone={outstanding > 0 ? "warning" : "primary"} />
          </div>
          <SplitCard split={overallSplit} title={t("splitTitle")} />
        </>
      )}

      {/* Remounts per selection so the ledger's own Equb filter starts from it. */}
      <FeeLedger key={`${equbId}:${roundId}`} equbId={selected?.id} roundId={selected && roundId !== "all" ? roundId : undefined} />
    </div>
  );
}

export default function AdminFeesPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYOUT_READ, EKUB_PERMS.EQUB_READ, EKUB_PERMS.CATEGORY_READ]}>
      <AdminFeesInner />
    </RequirePermission>
  );
}
