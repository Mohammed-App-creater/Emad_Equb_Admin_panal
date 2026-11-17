"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useOpenCycle, usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency } from "@/lib/utils";
import { Field, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
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
      <div>
        <p className="font-medium text-foreground">{p.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{p.code} · {t(`kind_${p.kind}` as never)}</p>
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
      <OpenCycleModal product={opening} onClose={() => setOpening(null)} />
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

/** Opens a product's next cycle; dates default from the product when left empty. */
function OpenCycleModal({ product, onClose }: { product: PilgrimageProduct | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const open = useOpenCycle();
  const [name, setName] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [drawAt, setDrawAt] = useState("");
  const close = () => { setName(""); setOpensAt(""); setDrawAt(""); onClose(); };
  const badDates = !!opensAt && !!drawAt && drawAt <= opensAt;

  const submit = () =>
    product &&
    open.mutate(
      { productId: product.id, name: name.trim() || undefined, opens_at: opensAt || undefined, draw_at: drawAt || undefined },
      { onSuccess: (c) => { toast({ title: t("opened"), description: c.name }); close(); }, onError },
    );

  return (
    <Modal open={!!product} onOpenChange={(o) => !o && close()} title={t("openTitle", { product: product?.name ?? "" })} className="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("openHint")}</p>
        <Field label={`${tc("name")} (${tc("optional")})`}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={`${t("opensAt")} (${tc("optional")})`}>
            <Input type="date" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </Field>
          <Field label={`${t("drawAt")} (${tc("optional")})`} error={badDates ? t("drawAfterOpen") : undefined}>
            <Input type="date" value={drawAt} onChange={(e) => setDrawAt(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
          <Button onClick={submit} disabled={open.isPending || badDates}>
            {open.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("open")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
