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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
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

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
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
}: DataTableProps<T>) {
  const hasActions = !!actions?.length || !!renderLeadingActions;
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
      <Avatar className="h-8 w-8 shrink-0">
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
    ? cn(className)
    : cn(
        "bg-card rounded-lg border border-border overflow-hidden",
        className
      );

  // ---- Empty state -----------------------------------------------------------
  if (!isLoading && data.length === 0) {
    return (
      <div className={wrapperClass}>
        <div className="flex flex-col items-center justify-center py-12 px-4 sm:py-16 sm:px-6">
          <p className="text-lg font-medium text-foreground">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted border-b border-border">
              <TableRow className="hover:bg-muted">
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      "text-xs font-semibold text-muted-foreground uppercase",
                      col.align && alignClass[col.align],
                      col.headerClassName
                    )}
                  >
                    {col.header}
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
                : data.map((row) => (
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
          : data.map((row) => (
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
    </div>
  );
}
