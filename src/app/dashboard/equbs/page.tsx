"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Zap, Eye, Search, MoreHorizontal } from "lucide-react";
import { DataTable, TablePager, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle";
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
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const autoCancel = useAutoCancel();
  const lifecycle = useEqubLifecycle();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewMode("equbs", "table");

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
          <SelectContent loading={categoriesLoading}>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === "cards" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          ) : (data?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{tc("noData")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {(data ?? []).map((e) => <EqubCard key={e.id} equb={e} categoryName={categoryName(e)} actions={actions} onOpen={open} />)}
            </div>
          )}
          <div className="rounded-xl border border-border">
            <TablePager page={page} pageSize={perPage} total={pageData?.total ?? 0} onPageChange={setPage} onPageSizeChange={(n) => { setPerPage(n); setPage(1); }} />
          </div>
        </div>
      )}

      {view === "table" && <DataTable
        defaultSort={{ id: "created", dir: "desc" }}
        pagination={{ page, pageSize: perPage, total: pageData?.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
        filters={{
          facets: [
            { id: "manager", label: t("manager"), get: (r) => r.manager?.fullName ?? t("noManager") },
            { id: "capacity", label: t("capacity"), get: (r) => (r.currentMembers >= r.maxMembers ? "full" : "open"), options: [{ value: "open", label: t("capacityOpen") }, { value: "full", label: t("capacityFull") }] },
            { id: "cycle", label: t("cycle"), get: (r) => (r.cycleNumber > 1 ? "next" : "first"), options: [{ value: "first", label: t("cycleFirst") }, { value: "next", label: t("cycleNext") }] },
          ],
        }}
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        onRowClick={open}
        avatar={(r) => ({ initials: r.code.slice(0, 2), colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        actions={actions}
      />}

      <EqubFormModal open={creating} onOpenChange={setCreating} onSaved={(e) => e?.id && router.push(`/dashboard/equbs/${e.id}`)} />
      {lifecycle.modals}
    </div>
  );
}

/** One Equb as a card: the same facts as a table row, with the row actions in a menu. */
function EqubCard({ equb: e, categoryName, actions, onOpen }: { equb: Equb; categoryName: string; actions: DataTableAction<Equb>[]; onOpen: (e: Equb) => void }) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const fill = e.maxMembers > 0 ? Math.min(100, Math.round((e.currentMembers / e.maxMembers) * 100)) : 0;
  const visible = actions.filter((a) => !a.show || a.show(e));
  return (
    <Card className="flex cursor-pointer flex-col transition hover:shadow-md" onClick={() => onOpen(e)}>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-semibold text-primary">{e.code.slice(0, 2)}</span>
            <div className="min-w-0">
              <h3 className="truncate font-bold text-foreground">{e.name}</h3>
              <p className="truncate font-mono text-xs text-muted-foreground">{e.code}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
            <StatusBadge status={e.status} kind="lifecycle" />
            {visible.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title={tc("actions")}><MoreHorizontal size={16} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {visible.map((a) => {
                    const Icon = a.icon;
                    return (
                      <DropdownMenuItem key={a.label} disabled={a.disabled?.(e)} onClick={() => a.onClick(e)} className={a.destructive ? "text-destructive focus:text-destructive" : undefined}>
                        <Icon className="mr-2 h-4 w-4" /> {a.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <Fact label={t("category")} value={categoryName} />
          <Fact label={t("manager")} value={e.manager?.fullName ?? t("noManager")} muted={!e.manager} />
          <Fact label={t("start")} value={formatDate(e.startDate)} />
          <Fact label={t("end")} value={formatDate(e.expectedEndDate)} />
        </dl>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("members")}</span>
            <span className="font-medium tabular-nums text-foreground">{e.currentMembers}/{e.maxMembers}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={muted ? "truncate text-muted-foreground" : "truncate font-medium text-foreground"}>{value}</dd>
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
