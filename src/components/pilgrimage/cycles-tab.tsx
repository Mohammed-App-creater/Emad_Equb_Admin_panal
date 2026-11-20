"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { usePilgrimageCycles } from "@/hooks/pilgrimage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PStatus } from "@/components/pilgrimage/shared";
import type { PilgrimageCycle } from "@/types/pilgrimage";

/** Every cycle (Hajj year / Umrah round); a row opens its draw page. */
export function CyclesTab({ productId }: { productId?: string }) {
  const t = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const td = useTranslations("pilgrimage.cycleDates");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = usePilgrimageCycles({ product_id: productId, page, limit: perPage });

  const columns: DataTableColumn<PilgrimageCycle>[] = [
    { id: "name", header: tc("name"), mobile: "title", cell: (c) => (
      <div>
        <p className="font-medium text-foreground">{c.name}</p>
        <p className="text-xs text-muted-foreground">#{c.number}</p>
      </div>
    ) },
    { id: "dates", header: t("schedule"), mobile: "detail", cell: (c) => (
      <div className="text-xs leading-5">
        <p className="text-muted-foreground">{td("opens_at")}: {formatDate(c.opens_at)}</p>
        <p>{td("registration_closes_at")}: {formatDate(c.registration_closes_at)}</p>
        <p className="font-medium text-foreground">{td("draw_at")}: {formatDate(c.draw_at)}</p>
        <p>{td("contract_deadline")}: {formatDate(c.contract_deadline)}</p>
        <p className="text-muted-foreground">{td("closes_at")}: {formatDate(c.closes_at)}</p>
      </div>
    ) },
    { id: "package", header: t("required"), align: "right", mobile: "detail", cell: (c) => (
      <div className="text-right text-sm tabular-nums">
        <p>{formatCurrency(c.required_contribution)}</p>
        <p className="text-xs text-muted-foreground">{t("ofPackage", { percent: c.eligibility_percent, amount: formatCurrency(c.package_cost) })}</p>
      </div>
    ) },
    { id: "result", header: t("result"), mobile: "detail", cell: (c) => (
      <span className="text-sm">
        {c.status === "open" ? "—" : t("resultLine", { eligible: c.eligible_count, winners: c.winner_count, slots: c.winners_per_cycle })}
      </span>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", cell: (c) => <PStatus status={c.status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.items ?? []}
      rowKey={(c) => c.id}
      isLoading={isLoading}
      emptyTitle={tc("noData")}
      emptyMessage={t("empty")}
      onRowClick={(c) => router.push(`/dashboard/pilgrimage/cycles/${c.id}`)}
      pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
    />
  );
}
