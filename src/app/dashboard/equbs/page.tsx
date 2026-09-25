"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Zap, Eye, Search } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { EqubFormModal } from "@/components/equb/equb-form-modal";
import { useEqubLifecycle } from "@/components/equb/equb-lifecycle";
import { useEqubsPage, useCategories, useAutoCancel } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getErrorMessage } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

const STATUSES = ["draft", "active", "completed", "cancelled"] as const;

function EqubsInner() {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const router = useRouter();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.EQUB_MANAGE) || has(EKUB_PERMS.CATEGORY_MANAGE);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const { data: pageData, isLoading } = useEqubsPage({ search, status, categoryId: categoryId === "all" ? undefined : categoryId }, page, perPage);
  const data = pageData?.items;
  const { data: categories } = useCategories();
  const autoCancel = useAutoCancel();
  const lifecycle = useEqubLifecycle();
  const [creating, setCreating] = useState(false);

  const categoryName = (e: Equb) => e.category?.name ?? categories?.find((c) => c.id === e.categoryId)?.name ?? "—";
  const open = (e: Equb) => router.push(`/dashboard/equbs/${e.id}`);

  const columns: DataTableColumn<Equb>[] = [
    { id: "name", sortValue: (r) => r.name, header: t("name"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
      </div>
    ) },
    { id: "category", sortValue: (r) => categoryName(r), header: t("category"), mobile: "detail", cell: (r) => <span className="text-sm">{categoryName(r)}</span> },
    { id: "manager", sortValue: (r) => r.manager?.fullName ?? null, header: t("manager"), mobile: "detail", cell: (r) => (
      r.manager ? <span className="text-sm">{r.manager.fullName}</span> : <span className="text-sm text-muted-foreground">{t("noManager")}</span>
    ) },
    { id: "members", sortValue: (r) => r.currentMembers, header: t("members"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{r.currentMembers}/{r.maxMembers}</span> },
    { id: "start", sortValue: (r) => r.startDate, header: t("start"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.startDate)}</span> },
    { id: "end", sortValue: (r) => r.expectedEndDate, header: t("end"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.expectedEndDate)}</span> },
    { id: "created", sortValue: (r) => r.createdAt, header: t("createdAt"), mobile: "detail", cell: (r) => <span className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="lifecycle" /> },
  ];

  const actions: DataTableAction<Equb>[] = [
    { label: t("open"), icon: Eye, onClick: open },
    ...(canManage
      ? lifecycle.actions.map<DataTableAction<Equb>>((a) => ({ label: a.label, icon: a.icon, destructive: a.destructive, show: a.show, onClick: (r) => lifecycle.open(a.kind, r) }))
      : []),
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" disabled={autoCancel.isPending} onClick={() => autoCancel.mutate(undefined, { onSuccess: () => toast({ title: t("autoCancel") }), onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }) })}>
                <Zap size={15} className="mr-1" /> {t("autoCancel")}
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus size={16} className="mr-1" /> {t("newEqub")}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("search")} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status${s.charAt(0).toUpperCase()}${s.slice(1)}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
          <SelectTrigger className="sm:w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        defaultSort={{ id: "created", dir: "desc" }}
        pagination={{ page, pageSize: perPage, total: pageData?.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        onRowClick={open}
        avatar={(r) => ({ initials: r.code.slice(0, 2), colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        actions={actions}
      />

      <EqubFormModal open={creating} onOpenChange={setCreating} onSaved={(e) => e?.id && router.push(`/dashboard/equbs/${e.id}`)} />
      {lifecycle.modals}
    </div>
  );
}

export default function EqubsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.EQUB_READ, EKUB_PERMS.CATEGORY_READ, EKUB_PERMS.APPLICATION_READ]}>
      <EqubsInner />
    </RequirePermission>
  );
}
