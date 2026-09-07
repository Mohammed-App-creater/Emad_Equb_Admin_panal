"use client";

import { useTranslations } from "next-intl";
import { RotateCcw, Info } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { usePenalties, useLiftSuspension } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { Penalty, PenaltyStatus } from "@/types/ekub";

const statusBadge: Record<PenaltyStatus, string> = {
  at_risk: "bg-warning/15 text-warning",
  suspended: "bg-destructive/15 text-destructive",
  terminated: "bg-muted text-muted-foreground",
};

function PenaltiesInner() {
  const t = useTranslations("penalties");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.PENALTY_MANAGE);

  const { data, isLoading } = usePenalties();
  const lift = useLiftSuspension();

  const statusLabel = (s: PenaltyStatus) =>
    s === "at_risk" ? t("statusAtRisk") : s === "suspended" ? t("statusSuspended") : t("statusTerminated");

  const columns: DataTableColumn<Penalty>[] = [
    { id: "member", header: t("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.memberHandle}</p>
        <p className="text-xs text-muted-foreground">{r.ekubNumber}</p>
      </div>
    ) },
    { id: "trigger", header: t("trigger"), mobile: "detail", cell: (r) => (
      <span className="text-sm">{r.trigger === "missed" ? t("triggerMissed") : t("triggerTurnSale")}</span>
    ) },
    { id: "misses", header: t("consecutiveMisses"), mobile: "detail", align: "right", cell: (r) => <span>{r.consecutiveMisses}</span> },
    { id: "draws", header: t("drawsAffected"), mobile: "detail", align: "right", cell: (r) => <span>{r.drawsAffected}</span> },
    { id: "date", header: tc("date"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.createdAt)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <Badge className={statusBadge[r.status]}>{statusLabel(r.status)}</Badge> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("ladderNote")}</span>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("settlementNote")}</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        renderLeadingActions={(r) =>
          canManage && r.status === "suspended" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => lift.mutate(r.id, {
                onSuccess: () => toast({ title: t("overrideSuspension"), description: r.memberHandle }),
                onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
              })}
            >
              <RotateCcw size={14} className="mr-1" /> {t("overrideSuspension")}
            </Button>
          ) : null
        }
      />
    </div>
  );
}

export default function PenaltiesPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PENALTY_READ]}>
      <PenaltiesInner />
    </RequirePermission>
  );
}
