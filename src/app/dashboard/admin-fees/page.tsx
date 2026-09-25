"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins, CheckCircle2, Clock, Eye, ExternalLink } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { AdminFeesTab, SplitCard } from "@/components/equb/admin-fees-tab";
import { FeeLedger } from "@/components/payments/fee-ledger";
import { useEqubs, useEqubAdminFeesMany } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import type { Equb, EqubAdminFees, FeeSplit } from "@/types/ekub";

type Row = Equb & { fees?: EqubAdminFees };

/**
 * General admin-fee view: totals and the SACCO / agent / broker split across
 * every Equb, a row per Equb, and the selected Equb's full ledger underneath
 * (the same component as the Equb's own Admin fees tab).
 */
function AdminFeesInner() {
  const t = useTranslations("adminFees");
  const te = useTranslations("equbs");
  const tc = useTranslations("common");
  const router = useRouter();

  const { data: allEqubs, isLoading } = useEqubs();
  // Drafts have no rounds yet, so nothing has been charged.
  const equbs = (allEqubs ?? []).filter((e) => e.status !== "draft");
  const ledgers = useEqubAdminFeesMany(equbs.map((e) => e.id));
  const rows: Row[] = equbs.map((e, i) => ({ ...e, fees: ledgers[i]?.data }));
  const loadingFees = ledgers.some((l) => l.isLoading);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  const sum = (pick: (f: EqubAdminFees) => number) => rows.reduce((a, r) => a + (r.fees ? pick(r.fees) : 0), 0);
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

  const columns: DataTableColumn<Row>[] = [
    { id: "equb", sortValue: (r) => r.name, header: t("equb"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
      </div>
    ) },
    { id: "fee", sortValue: (r) => r.fees?.feePerMemberPerRound ?? null, header: t("feePerRound"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{r.fees ? formatCurrency(r.fees.feePerMemberPerRound) : "…"}</span> },
    { id: "charged", sortValue: (r) => r.fees?.totals.charged ?? null, header: t("charged"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{r.fees ? formatCurrency(r.fees.totals.charged) : "…"}</span> },
    { id: "collected", sortValue: (r) => r.fees?.totals.collected ?? null, header: t("collected"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm font-medium text-success">{r.fees ? formatCurrency(r.fees.totals.collected) : "…"}</span> },
    { id: "outstanding", sortValue: (r) => r.fees?.totals.outstanding ?? null, header: t("outstanding"), mobile: "detail", align: "right", cell: (r) => {
      const v = r.fees?.totals.outstanding;
      return <span className={v ? "text-sm font-medium text-warning" : "text-sm text-muted-foreground"}>{v === undefined ? "…" : formatCurrency(v)}</span>;
    } },
    { id: "split", header: t("split"), mobile: "detail", cell: (r) => (
      <span className="text-xs text-muted-foreground">
        {r.fees ? `${r.fees.split.saccoPercent} / ${r.fees.split.agentPercent} / ${r.fees.split.brokerPercent}%` : "…"}
      </span>
    ) },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="lifecycle" /> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("generalSubtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("allCharged")} value={dash(charged)} icon={Coins} tone="info" />
        <StatCard label={t("allCollected")} value={dash(collected)} hint={charged > 0 ? `${Math.round((collected / charged) * 100)}%` : undefined} icon={CheckCircle2} tone="success" />
        <StatCard label={t("allOutstanding")} value={dash(outstanding)} icon={Clock} tone={outstanding > 0 ? "warning" : "primary"} />
      </div>

      <SplitCard split={overallSplit} title={t("allSplit")} />

      <FeeLedger />

      <Card>
        <CardHeader><CardTitle className="text-base">{t("byEqub")}</CardTitle></CardHeader>
        <CardContent>
          <DataTable
        defaultSort={{ by: (r) => r.createdAt, dir: "desc" }}
        bare
            filters={{ search: { keys: (r) => [r.name, r.code, r.category?.name] }, facets: [{ id: "status", label: tc("status"), get: (r) => r.status }] }}
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            onRowClick={(r) => setSelectedId(r.id)}
            emptyTitle={tc("noData")}
            renderLeadingActions={(r) => (selected?.id === r.id ? <span className="text-xs font-semibold text-primary">●</span> : null)}
            actions={[
              { label: t("viewLedger"), icon: Eye, onClick: (r) => setSelectedId(r.id) },
              { label: t("openInEqub"), icon: ExternalLink, onClick: (r) => router.push(`/dashboard/equbs/${r.id}?tab=fees`) },
            ]}
          />
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">
              {selected.name} <span className="font-mono text-xs font-normal text-muted-foreground">· {selected.code}</span>
              {selected.category && <span className="ml-2 text-xs font-normal text-muted-foreground">{te("category")}: {selected.category.name}</span>}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/equbs/${selected.id}?tab=fees`)}>
              <ExternalLink size={14} className="mr-1" /> {t("openInEqub")}
            </Button>
          </CardHeader>
          <CardContent>
            <AdminFeesTab key={selected.id} equb={selected} />
          </CardContent>
        </Card>
      ) : (
        !isLoading && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("selectEqub")}</p>
      )}
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
