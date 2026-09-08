"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Layers } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useGroups } from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatDate } from "@/lib/utils";
import type { Group } from "@/types/ekub";

const statusBadge: Record<string, string> = {
  active: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
  completed: "bg-info/15 text-info",
  cancelled: "bg-destructive/15 text-destructive",
};

function CyclesInner() {
  const t = useTranslations("cycles");
  const tc = useTranslations("common");
  const { data, isLoading } = useGroups();
  const { activeGroupId, setActiveGroup } = useEqubStore();

  const columns: DataTableColumn<Group>[] = [
    { id: "name", header: t("name"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.code}</p>
      </div>
    ) },
    { id: "members", header: t("members"), mobile: "detail", align: "right", cell: (r) => <span>{r.currentMembers}/{r.maxMembers}</span> },
    { id: "start", header: t("start"), mobile: "detail", cell: (r) => <span className="text-sm">{r.startDate ? formatDate(r.startDate) : "—"}</span> },
    { id: "end", header: t("end"), mobile: "detail", cell: (r) => <span className="text-sm">{r.expectedEndDate ? formatDate(r.expectedEndDate) : "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (
      <Badge className={`capitalize ${statusBadge[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status}</Badge>
    ) },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        avatar={() => ({ initials: "", colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        renderLeadingActions={(r) =>
          activeGroupId === r.id ? (
            <Badge className="bg-primary/15 text-primary">
              <CheckCircle2 size={13} className="mr-1" /> {t("active")}
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setActiveGroup(r.id, r.name)}>
              <Layers size={13} className="mr-1" /> {t("setActive")}
            </Button>
          )
        }
      />
    </div>
  );
}

export default function CyclesPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.TIER_READ, EKUB_PERMS.APPLICATION_READ]}>
      <CyclesInner />
    </RequirePermission>
  );
}
