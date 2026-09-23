"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PiggyBank, CircleDot, Trophy, Eye, ExternalLink, Info } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { TakafulTab } from "@/components/equb/takaful-tab";
import { useEqubs, useTakafulBalances } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

type Row = Equb & { balance: number | undefined };

/**
 * General Takaful view: every Equb's fund balance side by side, with the full
 * ledger (claims / refund / surplus) of the selected Equb underneath. The
 * per-Equb Takaful tab inside /dashboard/equbs/[id] is the same ledger.
 */
function TakafulInner() {
  const t = useTranslations("takaful");
  const te = useTranslations("equbs");
  const tc = useTranslations("common");
  const router = useRouter();

  const { data: allEqubs, isLoading } = useEqubs();
  // Draft Equbs haven't collected anything yet, so they have no fund.
  const equbs = (allEqubs ?? []).filter((e) => e.status !== "draft");
  const balances = useTakafulBalances(equbs.map((e) => e.id));
  const rows: Row[] = equbs.map((e, i) => ({ ...e, balance: balances[i]?.data }));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  const total = rows.reduce((sum, r) => sum + (r.balance ?? 0), 0);
  const largest = rows.reduce<Row | undefined>((best, r) => ((r.balance ?? 0) > (best?.balance ?? -1) ? r : best), undefined);
  const balancesLoading = balances.some((b) => b.isLoading);

  const columns: DataTableColumn<Row>[] = [
    { id: "equb", header: t("equb"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
      </div>
    ) },
    { id: "category", header: te("category"), mobile: "detail", cell: (r) => <span className="text-sm">{r.category?.name ?? "—"}</span> },
    { id: "members", header: te("members"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{r.currentMembers}</span> },
    { id: "balance", header: t("balance"), mobile: "detail", align: "right", cell: (r) => <span className="font-semibold text-primary">{r.balance === undefined ? "…" : formatCurrency(r.balance)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="lifecycle" /> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("generalSubtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalBalance")} value={balancesLoading && !total ? "…" : formatCurrency(total)} icon={PiggyBank} tone="primary" />
        <StatCard label={t("equbsWithFund")} value={rows.length} icon={CircleDot} tone="info" />
        <StatCard label={t("largestFund")} value={largest ? formatCurrency(largest.balance ?? 0) : "—"} hint={largest?.name} icon={Trophy} tone="secondary" />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("surplusNote")}</span>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("byEqub")}</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            bare
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            onRowClick={(r) => setSelectedId(r.id)}
            emptyTitle={tc("noData")}
            renderLeadingActions={(r) =>
              selected?.id === r.id ? <span className="text-xs font-semibold text-primary">●</span> : null
            }
            actions={[
              { label: t("viewLedger"), icon: Eye, onClick: (r) => setSelectedId(r.id) },
              { label: t("openInEqub"), icon: ExternalLink, onClick: (r) => router.push(`/dashboard/equbs/${r.id}?tab=takaful`) },
            ]}
          />
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">
              {selected.name} <span className="font-mono text-xs font-normal text-muted-foreground">· {selected.code}</span>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/equbs/${selected.id}?tab=takaful`)}>
              <ExternalLink size={14} className="mr-1" /> {t("openInEqub")}
            </Button>
          </CardHeader>
          <CardContent>
            <TakafulTab key={selected.id} equb={selected} />
          </CardContent>
        </Card>
      ) : (
        !isLoading && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("selectEqub")}</p>
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
