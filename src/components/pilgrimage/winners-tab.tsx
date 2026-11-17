"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { usePilgrimageWinners, useRetryWinnerFinance } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import { PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import type { PilgrimageWinner } from "@/types/pilgrimage";

/**
 * Winners and their individual Murabaha finances. A finance that could not be
 * opened (product limits, the member's financing eligibility) shows why and
 * can be retried once fixed; it never affects other winners.
 */
export function WinnersTab({ cycleId }: { cycleId?: string }) {
  const t = useTranslations("pilgrimage.winner");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const retry = useRetryWinnerFinance();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = usePilgrimageWinners({ cycle_id: cycleId, page, limit: perPage });

  const columns: DataTableColumn<PilgrimageWinner>[] = [
    { id: "member", header: tc("member"), mobile: "title", cell: (w) => (
      <Link href={`/dashboard/pilgrimage/participations/${w.participation_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
        <p className="font-medium text-foreground">{w.member?.full_name ?? tc("unknownMember")}</p>
        <p className="font-mono text-xs text-muted-foreground">{w.participation?.number}</p>
      </Link>
    ) },
    { id: "how", header: t("how"), mobile: "detail", cell: (w) => <PStatus status={w.outcome} outcome /> },
    { id: "savings", header: t("savings"), align: "right", mobile: "detail", cell: (w) => <span className="tabular-nums">{formatCurrency(w.recognised_savings)}</span> },
    { id: "financed", header: t("financed"), align: "right", mobile: "detail", cell: (w) => (
      <div className="text-right">
        <p className="tabular-nums">{w.loan_application ? formatCurrency(w.loan_application.financed_amount) : formatCurrency(w.package_cost - w.recognised_savings)}</p>
        {w.loan_application && <p className="font-mono text-xs text-muted-foreground">{w.loan_application.finance_number} · {w.loan_application.status}</p>}
      </div>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", cell: (w) => (
      <div>
        <PStatus status={w.status} />
        {w.failure_reason && <p className="mt-1 max-w-xs text-xs text-destructive">{w.failure_reason}</p>}
      </div>
    ) },
  ];
  const actions: DataTableAction<PilgrimageWinner>[] = has(EKUB_PERMS.PILGRIMAGE_MANAGE)
    ? [{
        label: t("retry"), icon: RotateCw, show: (w) => w.status === "finance_failed", disabled: () => retry.isPending,
        onClick: (w) => retry.mutate(w.id, { onSuccess: (r) => toast({ title: r.status === "finance_opened" ? t("retried") : t("stillFailing") }), onError }),
      }]
    : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(w) => w.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        actions={actions}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
    </div>
  );
}
