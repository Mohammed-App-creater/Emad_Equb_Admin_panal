"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarPlus, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useOpenCycle, usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import { feeTotal, Field, PStatus, splitAmounts, useErrorToast, useShareLabel } from "@/components/pilgrimage/shared";
import { ProductFormModal } from "@/components/pilgrimage/product-form-modal";
import { cycleDateProblems, CycleDatesFields, defaultCycleDates, type CycleDates } from "@/components/pilgrimage/cycle-dates";
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
      <div>
        <p className="font-medium text-foreground">{p.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{p.code} · {t(`kind_${p.kind}` as never)}</p>
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
      <OpenCycleModal product={opening} onClose={() => setOpening(null)} />
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

/**
 * Opens a product's next cycle. Every date is shown prefilled with the
 * product's default; changing the opening or draw date moves the dates that
 * follow from it, unless they were set by hand.
 */
function OpenCycleModal({ product, onClose }: { product: PilgrimageProduct | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycle");
  return (
    <Modal open={!!product} onOpenChange={(o) => !o && onClose()} title={t("openTitle", { product: product?.name ?? "" })} className="max-w-lg">
      {product && <OpenCycleBody key={product.id} product={product} onClose={onClose} />}
    </Modal>
  );
}

function OpenCycleBody({ product, onClose }: { product: PilgrimageProduct; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const open = useOpenCycle();
  const [name, setName] = useState("");
  const [given, setGiven] = useState<Partial<CycleDates>>({});
  const dates = defaultCycleDates(product, given);
  const valid = Object.keys(cycleDateProblems(dates)).length === 0;

  const submit = () =>
    open.mutate(
      { productId: product.id, name: name.trim() || undefined, dates },
      { onSuccess: (c) => { toast({ title: t("opened"), description: c.name }); onClose(); }, onError },
    );

  return (
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
      <p className="text-sm text-muted-foreground">{t("openHint")}</p>
      <Field label={`${tc("name")} (${tc("optional")})`}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
      </Field>
      <CycleDatesFields value={dates} onChange={(k, v) => setGiven((g) => ({ ...g, [k]: v || undefined }))} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button onClick={submit} disabled={open.isPending || !valid}>
          {open.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("open")}
        </Button>
      </div>
    </div>
  );
}
