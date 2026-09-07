"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useStaff, useRoles } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import type { StaffMember, RoleDef } from "@/types/ekub";

const roleBadge: Record<StaffMember["role"], string> = {
  admin: "bg-primary/15 text-primary",
  manager: "bg-info/15 text-info",
  board_chair: "bg-secondary/20 text-secondary-foreground",
  agent: "bg-muted text-muted-foreground",
};

function StaffInner() {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const { data: staff, isLoading } = useStaff();
  const { data: roles, isLoading: rolesLoading } = useRoles();

  const roleLabel = (r: StaffMember["role"]) => r.replace("_", " ");

  const staffCols: DataTableColumn<StaffMember>[] = [
    { id: "name", header: t("name"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { id: "role", header: t("role"), mobile: "badge", cell: (r) => <Badge className={`capitalize ${roleBadge[r.role]}`}>{roleLabel(r.role)}</Badge> },
    { id: "branch", header: t("branch"), mobile: "detail", cell: (r) => <span className="text-sm">{r.branch}</span> },
    { id: "email", header: t("email"), mobile: "detail", cell: (r) => <span className="text-sm">{r.email}</span> },
    { id: "phone", header: t("phone"), mobile: "detail", cell: (r) => <span className="text-sm">{r.phone}</span> },
  ];

  const roleCols: DataTableColumn<RoleDef>[] = [
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
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("sodNote")}</span>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">{t("tabStaff")}</TabsTrigger>
          <TabsTrigger value="roles">{t("tabRoles")}</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <DataTable
            columns={staffCols}
            data={staff ?? []}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            avatar={(r) => ({ initials: getInitials(r.name), colorClass: "bg-primary/15 text-primary" })}
            emptyTitle={tc("noData")}
          />
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tabRoles")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={roleCols} data={roles ?? []} rowKey={(r) => r.id} isLoading={rolesLoading} bare emptyTitle={tc("noData")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StaffPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.STAFF_READ]}>
      <StaffInner />
    </RequirePermission>
  );
}
