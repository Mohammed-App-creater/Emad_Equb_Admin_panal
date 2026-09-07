"use client";

import { useTranslations } from "next-intl";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useRoles } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import type { RoleDef } from "@/types/ekub";

function RolesInner() {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const { data, isLoading } = useRoles();

  const columns: DataTableColumn<RoleDef>[] = [
    { id: "name", header: t("roleName"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { id: "perms", header: t("permissions"), mobile: "detail", cell: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.permissions.map((p) => (
          <span key={p} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{p}</span>
        ))}
      </div>
    ) },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={`${t("tabRoles")} & ${t("permissions")}`} subtitle={t("sodNote")} />
      <DataTable columns={columns} data={data ?? []} rowKey={(r) => r.id} isLoading={isLoading} emptyTitle={tc("noData")} />
    </div>
  );
}

export default function RolePermissionsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.ROLE_READ]}>
      <RolesInner />
    </RequirePermission>
  );
}
