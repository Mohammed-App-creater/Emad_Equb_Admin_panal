"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarPlus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import { feeTotal, KindIcon, PStatus, splitAmounts, useShareLabel } from "@/components/pilgrimage/shared";
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
        <p className="text-xs text-muted-foreground">{t("maxFinanceShort", { amount: formatCurrency(p.max_finance_amount) })}</p>
      </div>
    ) },
    { id: "draw", header: t("frequency"), mobile: "detail", cell: (p) => (
      <span className="text-sm">{t(`frequency_${p.cycle_frequency}` as never)} · {t("winnersShort", { count: p.winners_per_cycle })}</span>
    ) },
    { id: "fees", header: t("contributionFees"), mobile: "detail", cell: (p) => <FeesSummary product={p} /> },
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
  const share = useShareLabel();
  const admin = feeTotal(p.admin_fee_weekly, p.fee_weeks);
  const takaful = feeTotal(p.takaful_fee_weekly, p.fee_weeks);
  const split = splitAmounts(p.admin_fee_split, admin);
  return (
    <div className="space-y-0.5 text-xs leading-5">
      <p>{t("adminShort")}: {t("weeklyShort", { weekly: formatCurrency(p.admin_fee_weekly), weeks: p.fee_weeks, total: formatCurrency(admin) })}</p>
      <p>{t("takafulShort")}: {t("weeklyShort", { weekly: formatCurrency(p.takaful_fee_weekly), weeks: p.fee_weeks, total: formatCurrency(takaful) })}</p>
      <p className="text-muted-foreground">
        {t("splitShort", {
          agent: `${share(p.admin_fee_split?.agent)} (${formatCurrency(split.agent)})`,
          broker: `${share(p.admin_fee_split?.broker)} (${formatCurrency(split.broker)})`,
          sacco: `${share(p.admin_fee_split?.sacco)} (${formatCurrency(split.sacco)})`,
        })}
      </p>
      {!p.holding_bank_id && !p.holding_payment_account_id && (
        <p className="flex items-center gap-1 text-warning"><AlertTriangle size={12} /> {t("holdingMissingShort")}</p>
      )}
    </div>
  );
}
