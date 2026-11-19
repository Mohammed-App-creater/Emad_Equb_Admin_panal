"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useAllPilgrimageGroups, usePilgrimageGroups } from "@/hooks/pilgrimage";
import type { PilgrimageGroup } from "@/types/pilgrimage";

const activeOf = (g: PilgrimageGroup) => (g.members ?? []).filter((m) => m.status === "active");
// Only open invitations; declined, left and removed members are history.
const invitedOf = (g: PilgrimageGroup) => (g.members ?? []).filter((m) => m.status === "invited");

function useColumns(): DataTableColumn<PilgrimageGroup>[] {
  const t = useTranslations("pilgrimage.group");
  const tc = useTranslations("common");
  return [
    { id: "name", header: tc("name"), mobile: "title", sortValue: (g) => g.name, cell: (g) => (
      <div>
        <p className="font-medium text-foreground">{g.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{g.number}</p>
      </div>
    ) },
    { id: "members", header: t("members"), mobile: "detail", sortValue: (g) => activeOf(g).length, cell: (g) => (
      <span className="text-sm">{t("membersLine", { active: activeOf(g).length, max: g.max_members, invited: invitedOf(g).length })}</span>
    ) },
    { id: "eligible", header: t("eligibleMembers"), mobile: "detail", sortValue: (g) => activeOf(g).filter((m) => m.eligible).length, cell: (g) => <span className="text-sm">{activeOf(g).filter((m) => m.eligible).length}</span> },
    { id: "admin", header: t("admin"), mobile: "detail", cell: (g) => <span className="text-sm">{(g.members ?? []).find((m) => m.role === "admin")?.member_name ?? "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (g) => (
      <span className="text-xs">{g.status === "dissolved" ? t("dissolved") : g.locked ? t("locked") : t("open")}</span>
    ) },
  ];
}

/** Lottery groups of a product (or all products), server-paged. Read-only for staff: members create and run them in the app. */
export function GroupsTab({ productId }: { productId?: string }) {
  const t = useTranslations("pilgrimage.group");
  const tc = useTranslations("common");
  const router = useRouter();
  const columns = useColumns();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = usePilgrimageGroups({ product_id: productId, page, limit: perPage });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(g) => g.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        onRowClick={(g) => router.push(`/dashboard/pilgrimage/participations/${g.admin_participation_id}`)}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
    </div>
  );
}

/** The groups that have at least one member in a given cycle. */
export function CycleGroupsTab({ productId, participationIds }: { productId: string; participationIds: Set<string> }) {
  const t = useTranslations("pilgrimage.group");
  const tc = useTranslations("common");
  const router = useRouter();
  const columns = useColumns();
  const { data, isLoading } = useAllPilgrimageGroups(productId);
  const groups = (data ?? []).filter((g) => (g.members ?? []).some((m) => participationIds.has(m.participation_id)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <DataTable
        columns={columns}
        data={groups}
        rowKey={(g) => g.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        onRowClick={(g) => router.push(`/dashboard/pilgrimage/participations/${g.admin_participation_id}`)}
        filters={{ search: { placeholder: tc("search"), keys: (g) => [g.name, g.number, ...(g.members ?? []).map((m) => m.member_name)] } }}
      />
    </div>
  );
}
