"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Standard data table — desktop table + mobile cards in one responsive
// component, modelled on the members table so every list in the app shares the
// same look. Columns are fully render-controlled; status badges, currency, etc.
// are produced by the caller's `cell` functions.
// -----------------------------------------------------------------------------

export type ColumnAlign = "left" | "right" | "center";

// Where a column appears in the stacked mobile card:
//  - "title"    → the card's heading (pick one; pairs with the avatar)
//  - "subtitle" → a muted line under the title
//  - "badge"    → top-right of the card (e.g. a status badge)
//  - "detail"   → a label/value cell in the card's grid (default)
//  - "hidden"   → omitted on mobile
export type MobileSlot = "title" | "subtitle" | "badge" | "detail" | "hidden";

export type SortValue = string | number | boolean | Date | null | undefined;
export type SortDir = "asc" | "desc";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Makes the column sortable: the value to order rows by (dates as ISO strings or Date). */
  sortValue?: (row: T) => SortValue;
  align?: ColumnAlign;
  /** Extra classes for the desktop `<td>`. */
  className?: string;
  /** Extra classes for the desktop `<th>`. */
  headerClassName?: string;
  mobile?: MobileSlot;
  /** Label for the mobile detail grid; defaults to `header`. */
  mobileLabel?: React.ReactNode;
}

export interface DataTableAction<T> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (row: T) => void;
  /** Hide the action for a given row. */
  show?: (row: T) => boolean;
  /** Disable the action for a given row. */
  disabled?: (row: T) => boolean;
  /** Visually mark a destructive action (red hover). */
  destructive?: boolean;
}

export interface DataTableAvatar {
  initials: string;
  /** Tailwind classes for the avatar fallback, e.g. "bg-primary/20 text-primary". */
  colorClass?: string;
  /** Optional picture; the initials show while it loads or if it fails. */
  src?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Tooltip icon actions rendered in the trailing actions cell. */
  actions?: DataTableAction<T>[];
  /** Custom node rendered before the icon actions (e.g. an "Approve" button). */
  renderLeadingActions?: (row: T) => React.ReactNode;
  /** Avatar shown beside the "title" column (desktop) / card header (mobile). */
  avatar?: (row: T) => DataTableAvatar | undefined;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
  /** Render without the card wrapper, for embedding inside an existing card. */
  bare?: boolean;
  /**
   * Initial ordering. `id` names a sortable column; `by` orders by a value
   * that has no column of its own (e.g. created-at). Clicking a header
   * replaces it.
   */
  defaultSort?: { id?: string; by?: (row: T) => SortValue; dir?: SortDir };
  /**
   * Paging. Omitted → local paging of the rows given (10 per page).
   * `false` → no paging. A `ServerPagination` → the rows given are one page
   * and the backend is asked for the others.
   */
  pagination?: false | { pageSize?: number } | ServerPagination;
  /** Toolbar above the table: a text search and dropdown facets, applied to the rows given. */
  filters?: DataTableFilters<T>;
}

export interface DataTableFacet<T> {
  id: string;
  label: string;
  /** Value(s) a row belongs to; rows returning empty are only shown under "All". */
  get: (row: T) => string | string[] | null | undefined;
  /** Fixed options; omitted → the distinct values found in the rows. */
  options?: { value: string; label: string }[];
  /** Label for a derived option. */
  labelOf?: (value: string) => string;
}
/** "Round" facet for any row that knows its round number; options sort #1, #2 … #10. */
export const roundFacet = <T,>(label: string, get: (row: T) => number | null | undefined): DataTableFacet<T> => ({
  id: "round",
  label,
  get: (row) => {
    const n = get(row);
    return n ? `#${n}` : null;
  },
});

export interface DataTableFilters<T> {
  search?: { placeholder?: string; keys: (row: T) => (string | number | null | undefined)[] };
  facets?: DataTableFacet<T>[];
  /** Extra controls (e.g. server-side filters) rendered at the end of the toolbar. */
  extra?: React.ReactNode;
}

export interface ServerPagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}
const isServer = (p: DataTableProps<unknown>["pagination"]): p is ServerPagination => !!p && typeof p === "object" && "onPageChange" in p;
export const PAGE_SIZES = [10, 25, 50, 100];

/** Footer: range, page size, previous / next. Shared by local and server paging. */
export function TablePager({ page, pageSize, total, onPageChange, onPageSizeChange }: ServerPagination) {
  const t = useTranslations("common");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>{t("showingRange", { from, to, total })}</span>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            {t("rowsPerPage")}
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-border bg-background px-1.5 text-xs text-foreground"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <span className="tabular-nums">{t("page")} {page} {t("of")} {pages}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t("previous")}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label={t("next")}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
function compareValues(a: SortValue, b: SortValue): number {
  const empty = (v: SortValue) => v === null || v === undefined || v === "";
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1; // blanks last in either direction
  if (empty(b)) return -1;
  if (a instanceof Date || b instanceof Date) return new Date(a as Date).getTime() - new Date(b as Date).getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  const sa = String(a), sb = String(b);
  if (ISO_DATE.test(sa) && ISO_DATE.test(sb)) return sa.localeCompare(sb); // ISO strings sort lexically
  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
}

const alignClass: Record<ColumnAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/** Build up-to-two-letter initials from a name. */
export function getInitials(name: string): string {
  return (name || "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  actions,
  renderLeadingActions,
  avatar,
  isLoading,
  skeletonRows = 5,
  emptyTitle = "Nothing to show",
  emptyMessage = "Try adjusting your search or filters",
  className,
  bare = false,
  defaultSort,
  pagination,
  filters,
}: DataTableProps<T>) {
  const hasActions = !!actions?.length || !!renderLeadingActions;

  // ---- Filtering -------------------------------------------------------------
  const t = useTranslations("common");
  const [query, setQuery] = React.useState("");
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({});
  const filteredData = React.useMemo(() => {
    if (!filters) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (q && filters.search && !filters.search.keys(row).some((k) => k !== null && k !== undefined && String(k).toLowerCase().includes(q))) return false;
      for (const f of filters.facets ?? []) {
        const want = facetValues[f.id];
        if (want && want !== "__all") {
          const got = f.get(row);
          if (Array.isArray(got) ? !got.includes(want) : (got ?? "") !== want) return false;
        }
      }
      return true;
    });
  }, [data, filters, query, facetValues]);
  const facetOptions = (f: DataTableFacet<T>) =>
    f.options ?? Array.from(new Set(data.flatMap((r) => f.get(r) ?? []).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((v) => ({ value: v, label: f.labelOf?.(v) ?? v.replace(/_/g, " ") }));
  const filtersActive = !!query || Object.values(facetValues).some((v) => v && v !== "__all");
  const toolbar = filters ? (
    <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center">
      {filters.search && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={filters.search.placeholder ?? t("search")} />
        </div>
      )}
      {(filters.facets ?? []).map((f) => (
        <Select key={f.id} value={facetValues[f.id] ?? "__all"} onValueChange={(v) => setFacetValues((s) => ({ ...s, [f.id]: v }))}>
          <SelectTrigger className="h-9 sm:w-[170px]" aria-label={f.label}>
            <span className="truncate"><span className="text-muted-foreground">{f.label}: </span><SelectValue /></span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t("all")}</SelectItem>
            {facetOptions(f).map((o) => <SelectItem key={o.value} value={o.value} className="capitalize">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}
      {filters.extra}
      {filtersActive && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setQuery(""); setFacetValues({}); }}>
          <X className="mr-1 h-3.5 w-3.5" /> {t("clear")}
        </Button>
      )}
    </div>
  ) : null;

  // ---- Sorting ---------------------------------------------------------------
  const [sort, setSort] = React.useState<{ id: string | null; dir: SortDir }>({
    id: defaultSort?.id ?? null,
    dir: defaultSort?.dir ?? "desc",
  });
  const [customDefault, setCustomDefault] = React.useState(!!defaultSort?.by && !defaultSort?.id);
  const sortedData = React.useMemo(() => {
    const dirMul = sort.dir === "asc" ? 1 : -1;
    const col = sort.id ? columns.find((c) => c.id === sort.id && c.sortValue) : undefined;
    const by = col?.sortValue ?? (customDefault ? defaultSort?.by : undefined);
    if (!by) return filteredData;
    // Stable sort: ties keep the server's order.
    return filteredData
      .map((row, i) => ({ row, i, v: by(row) }))
      .sort((a, b) => compareValues(a.v, b.v) * dirMul || a.i - b.i)
      .map((x) => x.row);
  }, [filteredData, columns, sort, customDefault, defaultSort]);
  // ---- Paging ----------------------------------------------------------------
  const server = isServer(pagination) ? pagination : null;
  const localSize = pagination === false ? 0 : !server ? (pagination as { pageSize?: number } | undefined)?.pageSize ?? 10 : 0;
  const [localPage, setLocalPage] = React.useState(1);
  const [localPageSize, setLocalPageSize] = React.useState(localSize || 10);
  const localPages = Math.max(1, Math.ceil(sortedData.length / localPageSize));
  // Data may shrink (filter, delete) below the remembered page: clamp at render.
  const curPage = Math.min(localPage, localPages);
  const pageRows = server || pagination === false ? sortedData : sortedData.slice((curPage - 1) * localPageSize, curPage * localPageSize);
  const pager: ServerPagination | null = server
    ? server
    : pagination === false || sortedData.length <= PAGE_SIZES[0]
    ? null
    : { page: curPage, pageSize: localPageSize, total: sortedData.length, onPageChange: setLocalPage, onPageSizeChange: (n) => { setLocalPageSize(n); setLocalPage(1); } };

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    setCustomDefault(false);
    setSort((s) => ({ id: col.id, dir: s.id === col.id ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
  };
  const sortIcon = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return null;
    if (sort.id !== col.id) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sort.dir === "asc" ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
  };
  const titleCol = columns.find((c) => c.mobile === "title") ?? columns[0];
  const subtitleCol = columns.find((c) => c.mobile === "subtitle");
  const badgeCol = columns.find((c) => c.mobile === "badge");
  const detailCols = columns.filter(
    (c) =>
      c !== titleCol &&
      c !== subtitleCol &&
      c !== badgeCol &&
      c.mobile !== "hidden"
  );

  const visibleActions = (row: T) =>
    (actions ?? []).filter((a) => !a.show || a.show(row));

  const renderActionsCell = (row: T) => {
    const acts = visibleActions(row);
    if (!renderLeadingActions && acts.length === 0) return null;
    return (
      <div className="flex items-center gap-1">
        {renderLeadingActions?.(row)}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {acts.map((a) => {
              const Icon = a.icon;
              return (
                <Tooltip key={a.label}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => a.onClick(row)}
                      disabled={a.disabled?.(row)}
                      aria-label={a.label}
                      className={cn(
                        a.destructive &&
                          "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{a.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    );
  };

  const Av = ({ row }: { row: T }) => {
    const a = avatar?.(row);
    if (!a) return null;
    return (
      <Avatar className={cn("h-8 w-8 shrink-0", a.src && "rounded-lg")}>
        {a.src && <AvatarImage src={a.src} alt="" className="object-cover" />}
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            a.colorClass ?? "bg-muted text-muted-foreground"
          )}
        >
          {a.initials}
        </AvatarFallback>
      </Avatar>
    );
  };

  const wrapperClass = bare
    ? cn("min-w-0 max-w-full", className)
    : cn(
        "min-w-0 max-w-full bg-card rounded-lg border border-border overflow-hidden",
        className
      );

  // ---- Empty state -----------------------------------------------------------
  if (!isLoading && filteredData.length === 0) {
    return (
      <div className={wrapperClass}>
        {toolbar}
        <div className="flex flex-col items-center justify-center py-12 px-4 sm:py-16 sm:px-6">
          <p className="text-lg font-medium text-foreground">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
        </div>
        {server && server.page > 1 && <TablePager {...server} />}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {toolbar}
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted border-b border-border">
              <TableRow className="hover:bg-muted">
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    onClick={col.sortValue ? () => toggleSort(col) : undefined}
                    aria-sort={col.sortValue && sort.id === col.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap",
                      col.sortValue && "cursor-pointer select-none hover:text-foreground",
                      col.align && alignClass[col.align],
                      col.headerClassName
                    )}
                  >
                    {col.header}
                    {sortIcon(col)}
                  </TableHead>
                ))}
                {hasActions && (
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: skeletonRows }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {columns.map((col) => (
                        <TableCell key={col.id}>
                          <Skeleton className="h-5 w-full max-w-32" />
                        </TableCell>
                      ))}
                      {hasActions && (
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                : pageRows.map((row) => (
                    <TableRow
                      key={rowKey(row)}
                      onClick={
                        onRowClick ? () => onRowClick(row) : undefined
                      }
                      className={cn(
                        "border-border hover:bg-muted transition-colors",
                        onRowClick && "cursor-pointer"
                      )}
                    >
                      {columns.map((col) => {
                        const content =
                          col === titleCol && avatar ? (
                            <div className="flex items-center gap-3">
                              <Av row={row} />
                              <span className="min-w-0">{col.cell(row)}</span>
                            </div>
                          ) : (
                            col.cell(row)
                          );
                        return (
                          <TableCell
                            key={col.id}
                            className={cn(
                              "whitespace-nowrap",
                              col.align && alignClass[col.align],
                              col.className
                            )}
                          >
                            {content}
                          </TableCell>
                        );
                      })}
                      {hasActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {renderActionsCell(row)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {isLoading
          ? Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="py-5 px-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))
          : pageRows.map((row) => (
              <div
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("py-5 px-4", onRowClick && "cursor-pointer")}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Av row={row} />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {titleCol.cell(row)}
                      </div>
                      {subtitleCol && (
                        <div className="text-sm text-muted-foreground">
                          {subtitleCol.cell(row)}
                        </div>
                      )}
                    </div>
                  </div>
                  {badgeCol && <div className="shrink-0">{badgeCol.cell(row)}</div>}
                </div>

                {detailCols.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                    {detailCols.map((col) => (
                      <div key={col.id}>
                        <p className="text-muted-foreground text-xs">
                          {col.mobileLabel ?? col.header}
                        </p>
                        <div className="font-medium text-foreground">
                          {col.cell(row)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasActions && (
                  <div
                    className="flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderActionsCell(row)}
                  </div>
                )}
              </div>
            ))}
      </div>

      {pager && <TablePager {...pager} />}
    </div>
  );
}
