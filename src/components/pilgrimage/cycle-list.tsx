"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, Eye, MoreHorizontal, Search } from "lucide-react";
import { DataTable, TablePager, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle";
import { KindIcon, PStatus, kindIconSrc } from "@/components/pilgrimage/shared";
import { OpenCycleModal } from "@/components/pilgrimage/open-cycle-modal";
import { cycleYear } from "@/components/pilgrimage/cycle-members";
import { useAllPilgrimageCycles, usePilgrimageProducts, useProductsParticipations } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CycleStatus, Participation, PilgrimageCycle, PilgrimageKind, PilgrimageProduct } from "@/types/pilgrimage";

const STATUSES: CycleStatus[] = ["open", "locked", "drawn", "approved", "closed", "cancelled"];

/** What the list knows about each cycle beyond the cycle itself. */
interface Row {
  cycle: PilgrimageCycle;
  product?: PilgrimageProduct;
  year: number;
  /** Registered members, known while registration is open. */
  registered?: number;
  /** Members over the threshold right now (open) or at close (afterwards). */
  eligible: number;
  saved?: number;
}

/**
 * Every Hajj (or Umrah) Equb: one per product per year, listed the way the
 * Equbs page lists rotating Equbs. A row opens the cycle's detail page.
 */
export function CycleList({ kind }: { kind: PilgrimageKind }) {
  const t = useTranslations("pilgrimage.list");
  const tcy = useTranslations("pilgrimage.cycle");
  const ts = useTranslations("pilgrimage.status");
  const tc = useTranslations("common");
  const router = useRouter();
  const { has } = useEkubAccess();
  const canManage = has(EKUB_PERMS.PILGRIMAGE_MANAGE);

  const { data: allProducts, isLoading: productsLoading } = usePilgrimageProducts();
  const products = useMemo(() => (allProducts ?? []).filter((p) => p.kind === kind), [allProducts, kind]);
  const { data: allCycles, isLoading: cyclesLoading } = useAllPilgrimageCycles();
  const participationQueries = useProductsParticipations(products.map((p) => p.id));

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [productId, setProductId] = useState("all");
  const [year, setYear] = useState("all");
  const [view, setView] = useViewMode("pilgrimage", "table");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [creating, setCreating] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const byProduct = new Map(products.map((p) => [p.id, p]));
    const registrations = new Map<string, Participation[]>(products.map((p, i) => [p.id, participationQueries[i]?.data ?? []]));
    return (allCycles ?? [])
      .filter((c) => byProduct.has(c.product_id))
      .map((c) => {
        // Same rule as the cycle page (useCycleMembers): registrations whose current cycle is this one.
        const mine = c.status === "open"
          ? (registrations.get(c.product_id) ?? []).filter((p) => (p.current_cycle ? p.current_cycle.id === c.id : p.status === "active"))
          : undefined;
        return {
          cycle: c,
          product: byProduct.get(c.product_id),
          year: cycleYear(c),
          registered: mine?.length,
          eligible: mine ? mine.filter((p) => p.standing.eligible).length : c.eligible_count,
          saved: mine?.reduce((a, p) => a + p.standing.balance, 0),
        };
      })
      .sort((a, b) => b.cycle.draw_at.localeCompare(a.cycle.draw_at));
  }, [allCycles, products, participationQueries]);

  const years = useMemo(() => [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a), [rows]);
  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (status === "all" || r.cycle.status === status) &&
    (productId === "all" || r.cycle.product_id === productId) &&
    (year === "all" || String(r.year) === year) &&
    (!q || r.cycle.name.toLowerCase().includes(q) || (r.product?.name ?? "").toLowerCase().includes(q) || (r.product?.code ?? "").toLowerCase().includes(q) || String(r.year).includes(q)),
  );
  const isLoading = productsLoading || cyclesLoading;
  const open = (r: Row) => router.push(`/dashboard/pilgrimage/cycles/${r.cycle.id}`);
  const resetPage = () => setPage(1);

  const columns: DataTableColumn<Row>[] = [
    { id: "name", header: tc("name"), mobile: "title", sortValue: (r) => r.cycle.name, cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.cycle.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{r.product?.code} · #{r.cycle.number}</p>
      </div>
    ) },
    { id: "year", header: t("year"), mobile: "detail", sortValue: (r) => r.year, cell: (r) => <span className="text-sm font-semibold tabular-nums">{r.year}</span> },
    { id: "product", header: t("product"), mobile: "detail", sortValue: (r) => r.product?.name ?? "", cell: (r) => <span className="text-sm">{r.product?.name ?? "—"}</span> },
    { id: "members", header: t("members"), mobile: "detail", align: "right", sortValue: (r) => r.registered ?? r.eligible, cell: (r) => (
      <div className="text-right text-sm">
        {r.registered !== undefined ? <p className="tabular-nums">{r.registered}</p> : <p className="text-muted-foreground">—</p>}
        <p className="text-xs text-muted-foreground">{tcy("eligibleCount", { count: r.eligible })}</p>
      </div>
    ) },
    { id: "package", header: t("package"), mobile: "detail", align: "right", sortValue: (r) => r.cycle.package_cost, cell: (r) => (
      <div className="text-right text-sm tabular-nums">
        <p>{formatCurrency(r.cycle.package_cost)}</p>
        <p className="text-xs text-muted-foreground">{t("toQualify", { amount: formatCurrency(r.cycle.required_contribution) })}</p>
      </div>
    ) },
    { id: "registration", header: tcy("registrationCloses"), mobile: "detail", sortValue: (r) => r.cycle.registration_closes_at, cell: (r) => <span className="text-sm">{formatDate(r.cycle.registration_closes_at)}</span> },
    { id: "draw", header: tcy("drawAt"), mobile: "detail", sortValue: (r) => r.cycle.draw_at, cell: (r) => <span className="text-sm">{formatDate(r.cycle.draw_at)}</span> },
    { id: "winners", header: tcy("winners"), mobile: "detail", align: "right", sortValue: (r) => r.cycle.winner_count, cell: (r) => (
      <span className="text-sm tabular-nums">{r.cycle.drawn_at ? r.cycle.winner_count : "—"} / {r.cycle.winners_per_cycle}</span>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", sortValue: (r) => r.cycle.status, cell: (r) => <PStatus status={r.cycle.status} /> },
  ];
  const actions: DataTableAction<Row>[] = [{ label: t("open"), icon: Eye, onClick: open }];

  const kindLabel = t(`kind_${kind}`);
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder={t("search", { kind: kindLabel })} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={year} onValueChange={(v) => { setYear(v); resetPage(); }}>
            <SelectTrigger className="sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allYears")}</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); resetPage(); }}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          {products.length > 1 && (
            <Select value={productId} onValueChange={(v) => { setProductId(v); resetPage(); }}>
              <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allProducts")}</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <ViewToggle value={view} onChange={setView} />
          {canManage && (
            <Button onClick={() => setCreating(true)} disabled={!products.some((p) => p.status === "active")} title={products.some((p) => p.status === "active") ? undefined : tcy("noActiveProduct")}>
              <CalendarPlus size={16} className="mr-1" /> {t("new", { kind: kindLabel })}
            </Button>
          )}
        </div>
      </div>

      {!isLoading && products.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("noProduct", { kind: kindLabel })}</p>
      )}

      {view === "cards" && products.length > 0 && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("empty", { kind: kindLabel })}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((r) => <CycleCard key={r.cycle.id} row={r} kind={kind} actions={actions} onOpen={open} />)}
            </div>
          )}
          <div className="rounded-xl border border-border">
            <TablePager page={page} pageSize={perPage} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPerPage(n); resetPage(); }} />
          </div>
        </div>
      )}

      {view === "table" && products.length > 0 && (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.cycle.id}
          isLoading={isLoading}
          onRowClick={open}
          actions={actions}
          avatar={(r) => ({ initials: String(r.year).slice(-2), colorClass: kind === "hajj" ? "bg-primary/15 text-primary" : "bg-info/15 text-info", src: kindIconSrc(kind) })}
          defaultSort={{ id: "draw", dir: "desc" }}
          emptyTitle={tc("noData")}
          emptyMessage={t("empty", { kind: kindLabel })}
        />
      )}

      <OpenCycleModal open={creating} products={products} title={t("new", { kind: kindLabel })} onClose={() => setCreating(false)} onOpened={(c) => router.push(`/dashboard/pilgrimage/cycles/${c.id}`)} />
    </div>
  );
}

/** One cycle as a card: the same facts as a table row, with the row actions in a menu. */
function CycleCard({ row: r, kind, actions, onOpen }: { row: Row; kind: PilgrimageKind; actions: DataTableAction<Row>[]; onOpen: (r: Row) => void }) {
  const t = useTranslations("pilgrimage.list");
  const tcy = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const c = r.cycle;
  // While open: share of registered members already eligible. Afterwards: packages filled.
  const [num, den] = c.status === "open" ? [r.eligible, r.registered ?? 0] : [c.winner_count, c.winners_per_cycle];
  const fill = den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;
  return (
    <Card className="flex cursor-pointer flex-col transition hover:shadow-md" onClick={() => onOpen(r)}>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <KindIcon kind={kind} size={44} />
            <div className="min-w-0">
              <h3 className="truncate font-bold text-foreground">{c.name}</h3>
              <p className="truncate font-mono text-xs text-muted-foreground">{r.year} · {r.product?.code} · #{c.number}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
            <PStatus status={c.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title={tc("actions")}><MoreHorizontal size={16} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((a) => {
                  const Icon = a.icon;
                  return <DropdownMenuItem key={a.label} onClick={() => a.onClick(r)}><Icon className="mr-2 h-4 w-4" /> {a.label}</DropdownMenuItem>;
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <Fact label={t("product")} value={r.product?.name ?? "—"} />
          <Fact label={t("package")} value={formatCurrency(c.package_cost)} />
          <Fact label={tcy("required")} value={formatCurrency(c.required_contribution)} />
          <Fact label={tcy("registrationCloses")} value={formatDate(c.registration_closes_at)} />
          <Fact label={tcy("drawAt")} value={formatDate(c.draw_at)} />
          {r.saved !== undefined && <Fact label={t("saved")} value={formatCurrency(r.saved)} />}
        </dl>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{c.status === "open" ? t("eligibleOfRegistered") : tcy("winners")}</span>
            <span className="font-medium tabular-nums text-foreground">{num}/{den}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${c.status === "open" ? "bg-success" : "bg-primary"}`} style={{ width: `${fill}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
