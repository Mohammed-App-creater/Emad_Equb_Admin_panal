"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import { KindIcon, PStatus } from "@/components/pilgrimage/shared";
import { OpenCycleModal } from "@/components/pilgrimage/open-cycle-modal";
import { ProductFormModal } from "@/components/pilgrimage/product-form-modal";
import type { PilgrimageProduct } from "@/types/pilgrimage";

/** Hajj and Umrah products: their terms, and opening each product's next cycle. */
export function ProductsTab() {
  const t = useTranslations("pilgrimage.product");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const canManage = has(EKUB_PERMS.PILGRIMAGE_MANAGE);
  const { data, isLoading } = usePilgrimageProducts();
  const [editing, setEditing] = useState<PilgrimageProduct | "new" | null>(null);
  const [opening, setOpening] = useState<PilgrimageProduct | null>(null);

  const columns: DataTableColumn<PilgrimageProduct>[] = [
    { id: "name", header: tc("name"), mobile: "title", sortValue: (p) => p.name, cell: (p) => (
      <div className="flex items-center gap-3">
        <KindIcon kind={p.kind} size={36} />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{p.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{p.code} · {t(`kind_${p.kind}` as never)}</p>
        </div>
      </div>
    ) },
    { id: "package", header: t("packageCost"), align: "right", mobile: "detail", sortValue: (p) => p.package_cost, cell: (p) => (
      <div className="text-right">
        <p className="tabular-nums">{formatCurrency(p.package_cost)}</p>
        <p className="text-xs text-muted-foreground">{t("eligibilityShort", { percent: p.eligibility_percent })}</p>
      </div>
    ) },
    { id: "draw", header: t("frequency"), mobile: "detail", cell: (p) => (
      <span className="text-sm">{t(`frequency_${p.cycle_frequency}` as never)} · {t("winnersShort", { count: p.winners_per_cycle })}</span>
    ) },
    { id: "fees", header: t("fees"), mobile: "detail", cell: (p) => <FeesSummary product={p} /> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (p) => <PStatus status={p.status} /> },
  ];
  const actions: DataTableAction<PilgrimageProduct>[] = canManage
    ? [
        { label: tc("edit"), icon: Pencil, onClick: setEditing },
        { label: t("openCycle"), icon: CalendarPlus, show: (p) => p.status === "active", onClick: setOpening },
      ]
    : [];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}><Plus size={16} className="mr-1" /> {t("add")}</Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        onRowClick={canManage ? setEditing : undefined}
        actions={actions}
      />
      <ProductFormModal product={editing} onClose={() => setEditing(null)} />
      <OpenCycleModal open={!!opening} product={opening} onClose={() => setOpening(null)} />
    </div>
  );
}

function FeesSummary({ product: p }: { product: PilgrimageProduct }) {
  const t = useTranslations("pilgrimage.product");
  const tb = useTranslations("pilgrimage.basis");
  const fee = (value: number, basis?: string) =>
    value > 0 && basis ? `${basis.startsWith("percent") ? `${value}%` : formatCurrency(value)} ${tb(`${basis}_short` as never)}` : "—";
  return (
    <div className="text-xs leading-5">
      <p>{t("serviceShort")}: {fee(p.service_charge_value, p.service_charge_basis)}</p>
      <p>{t("takafulShort")}: {fee(p.takaful_value, p.takaful_basis)}</p>
    </div>
  );
}
