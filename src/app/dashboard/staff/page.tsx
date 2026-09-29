"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Info, Eye } from "lucide-react";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useAgentsPage, useEqubs, useStaffPage } from "@/hooks/ekub";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatDate } from "@/lib/utils";
import type { Agent, StaffMember } from "@/types/ekub";

const roleBadge: Record<StaffMember["role"], string> = {
  admin: "bg-primary/15 text-primary",
  manager: "bg-info/15 text-info",
  board_chair: "bg-secondary/20 text-secondary-foreground",
  agent: "bg-muted text-muted-foreground",
};

/** Agents come from GET /agents, staff from GET /users; each has its own table. */
function StaffInner() {
  const t = useTranslations("staff");
  const ta = useTranslations("agents");
  const tc = useTranslations("common");
  const router = useRouter();

  const [tab, setTab] = useState("agents");

  // ---- agents ----
  const [aPage, setAPage] = useState(1);
  const [aPerPage, setAPerPage] = useState(10);
  const [aSearch, setASearch] = useState("");
  const { data: agentsPage, isLoading: agentsLoading } = useAgentsPage(aSearch || undefined, aPage, aPerPage);
  const { data: equbs } = useEqubs();
  const managedCount = (id: string) => (equbs ?? []).filter((e) => e.manager?.userId === id).length;

  const agentCols: DataTableColumn<Agent>[] = [
    { id: "name", sortValue: (r) => r.name, header: t("name"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { id: "email", sortValue: (r) => r.email, header: t("email"), mobile: "detail", cell: (r) => <span className="text-sm">{r.email || "—"}</span> },
    { id: "phone", sortValue: (r) => r.phone, header: t("phone"), mobile: "detail", cell: (r) => <span className="text-sm">{r.phone || "—"}</span> },
    { id: "equbs", sortValue: (r) => managedCount(r.id), header: ta("equbsManaged"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm tabular-nums">{equbs ? managedCount(r.id) : "…"}</span> },
    { id: "joined", sortValue: (r) => r.createdAt, header: ta("joined"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.createdAt)}</span> },
    { id: "status", sortValue: (r) => (r.active ? 1 : 0), header: tc("status"), mobile: "badge", cell: (r) => <Badge className={r.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>{r.active ? ta("active") : ta("inactive")}</Badge> },
  ];

  // ---- staff ----
  const [sPage, setSPage] = useState(1);
  const [sPerPage, setSPerPage] = useState(10);
  const [sSearch, setSSearch] = useState("");
  const { data: staffPage, isLoading: staffLoading } = useStaffPage(sSearch || undefined, sPage, sPerPage);
  const roleLabel = (r: StaffMember["role"]) => r.replace("_", " ");

  const staffCols: DataTableColumn<StaffMember>[] = [
    { id: "name", sortValue: (r) => r.name, header: t("name"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { id: "role", sortValue: (r) => r.role, header: t("role"), mobile: "badge", cell: (r) => <Badge className={`capitalize ${roleBadge[r.role]}`}>{roleLabel(r.role)}</Badge> },
    { id: "branch", sortValue: (r) => r.branch, header: t("branch"), mobile: "detail", cell: (r) => <span className="text-sm">{r.branch}</span> },
    { id: "email", sortValue: (r) => r.email, header: t("email"), mobile: "detail", cell: (r) => <span className="text-sm">{r.email}</span> },
    { id: "phone", sortValue: (r) => r.phone, header: t("phone"), mobile: "detail", cell: (r) => <span className="text-sm">{r.phone}</span> },
  ];

  const searchBox = (value: string, set: (v: string) => void, reset: () => void) => (
    <div className="relative sm:w-64"><Input className="h-9" value={value} onChange={(e) => { set(e.target.value); reset(); }} placeholder={tc("search")} /></div>
  );

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={ta("title")} subtitle={ta("subtitle")} />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("sodNote")}</span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="agents">{ta("tabAgents")}{agentsPage ? ` · ${agentsPage.total}` : ""}</TabsTrigger>
          <TabsTrigger value="staff">{ta("tabStaff")}{staffPage ? ` · ${staffPage.total}` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <DataTable
            pagination={{ page: aPage, pageSize: aPerPage, total: agentsPage?.total ?? 0, onPageChange: setAPage, onPageSizeChange: (n) => { setAPerPage(n); setAPage(1); } }}
            filters={{ extra: searchBox(aSearch, setASearch, () => setAPage(1)) }}
            columns={agentCols}
            data={agentsPage?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={agentsLoading}
            onRowClick={(r) => router.push(`/dashboard/staff/agents/${r.id}`)}
            actions={[{ label: tc("view"), icon: Eye, onClick: (r) => router.push(`/dashboard/staff/agents/${r.id}`) }]}
            avatar={(r) => ({ initials: getInitials(r.name), colorClass: "bg-primary/15 text-primary" })}
            emptyTitle={tc("noData")}
          />
        </TabsContent>

        <TabsContent value="staff">
          <DataTable
            pagination={{ page: sPage, pageSize: sPerPage, total: staffPage?.total ?? 0, onPageChange: setSPage, onPageSizeChange: (n) => { setSPerPage(n); setSPage(1); } }}
            filters={{ facets: [{ id: "role", label: t("role"), get: (r) => r.role, labelOf: (v) => roleLabel(v as StaffMember["role"]) }], extra: searchBox(sSearch, setSSearch, () => setSPage(1)) }}
            columns={staffCols}
            data={staffPage?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={staffLoading}
            avatar={(r) => ({ initials: getInitials(r.name), colorClass: "bg-info/15 text-info" })}
            emptyTitle={tc("noData")}
            emptyMessage={sSearch ? undefined : ta("staffEmptyHint")}
          />
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
