"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { BankFormModal } from "@/components/banks/bank-form-modal";
import { useBanks, useDeleteBank, useUpdateBank } from "@/hooks/ekub";
import { useDebounce } from "@/hooks/use-debounce";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { Bank } from "@/types/ekub";

/**
 * The banks members can transfer from (SACCO-wide; the API has no per-Equb
 * list). Equb managers add and edit them so a bank-transfer payment can name
 * its source bank. Banks already named on a payment can only be deactivated.
 */
function BanksInner() {
  const t = useTranslations("banks");
  const tc = useTranslations("common");
  const { hasAny } = useEkubAccess();
  const { toast } = useToast();
  const canManage = hasAny([EKUB_PERMS.EQUB_MANAGE, EKUB_PERMS.PAYMENT_RECONCILE]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const debounced = useDebounce(search, 300);
  const { data, isLoading } = useBanks(debounced.trim() || undefined);
  const shown = (data ?? []).filter((b) => status === "all" || (status === "active") === b.active);

  const [editing, setEditing] = useState<Bank | "new" | null>(null);
  const [deleting, setDeleting] = useState<Bank | null>(null);
  const update = useUpdateBank();
  const del = useDeleteBank();
  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });

  const toggle = (b: Bank) =>
    update.mutate(
      { id: b.id, input: { name: b.name, code: b.code, address: b.address, city: b.city, country: b.country, phone: b.phone, active: !b.active } },
      { onSuccess: () => toast({ title: b.active ? t("deactivate") : t("activate"), description: b.name }), onError: err }
    );

  const columns: DataTableColumn<Bank>[] = [
    { id: "name", sortValue: (b) => b.name, header: t("name"), mobile: "title", cell: (b) => (
      <div>
        <p className="font-medium text-foreground">{b.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
      </div>
    ) },
    { id: "city", sortValue: (b) => b.city, header: t("city"), mobile: "detail", cell: (b) => <span className="text-sm">{[b.city, b.country].filter(Boolean).join(", ") || "—"}</span> },
    { id: "address", header: t("address"), mobile: "detail", cell: (b) => <span className="text-sm">{b.address || "—"}</span> },
    { id: "phone", header: t("phone"), mobile: "detail", cell: (b) => <span className="text-sm tabular-nums">{b.phone || "—"}</span> },
    { id: "status", sortValue: (b) => (b.active ? 1 : 0), header: tc("status"), mobile: "badge", cell: (b) => (b.active ? <Badge className="bg-success/15 text-success">{t("active")}</Badge> : <Badge className="bg-muted text-muted-foreground">{t("inactive")}</Badge>) },
  ];
  const actions: DataTableAction<Bank>[] = canManage
    ? [
        { label: tc("edit"), icon: Pencil, onClick: (b) => setEditing(b) },
        { label: t("deactivate"), icon: Power, show: (b) => b.active, onClick: toggle },
        { label: t("activate"), icon: Power, show: (b) => !b.active, onClick: toggle },
        { label: tc("delete"), icon: Trash2, destructive: true, onClick: (b) => setDeleting(b) },
      ]
    : [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={canManage ? <Button onClick={() => setEditing("new")}><Plus size={16} className="mr-1" /> {t("add")}</Button> : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="active">{t("active")}</SelectItem>
            <SelectItem value="inactive">{t("inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={shown}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        avatar={(b) => ({ initials: b.code.slice(0, 2), colorClass: b.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground" })}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        onRowClick={canManage ? (b) => setEditing(b) : undefined}
        actions={actions}
      />

      <BankFormModal bank={editing} onClose={() => setEditing(null)} />

      <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={tc("delete")} className="max-w-md">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t("deleteConfirm")} <strong>{deleting.name}</strong></p>
            <p className="text-xs text-muted-foreground">{t("deleteHint")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id, { onSuccess: () => { toast({ title: t("deleted"), description: deleting.name }); setDeleting(null); }, onError: err })}>
                {tc("delete")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function BanksPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYMENT_READ, EKUB_PERMS.EQUB_MANAGE]}>
      <BanksInner />
    </RequirePermission>
  );
}
