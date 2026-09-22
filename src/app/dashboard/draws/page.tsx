"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, Lock, CalendarClock } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useDraws, useTiers, usePublishDraw, useRescheduleDraw } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import type { Draw, DrawStatus } from "@/types/ekub";

const statusBadge: Record<DrawStatus, string> = {
  scheduled: "bg-info/15 text-info",
  live: "bg-secondary/20 text-secondary-foreground",
  completed: "bg-success/15 text-success",
  postponed: "bg-warning/15 text-warning",
};

function DrawsInner() {
  const t = useTranslations("draws");
  const tc = useTranslations("common");
  const router = useRouter();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canExecute = has(EKUB_PERMS.DRAW_EXECUTE);

  const { data: draws, isLoading } = useDraws();
  const { data: tiers } = useTiers();
  const publish = usePublishDraw();
  const reschedule = useRescheduleDraw();

  const [rescheduling, setRescheduling] = useState<Draw | null>(null);
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");

  const tierName = (id: string) => tiers?.find((x) => x.id === id)?.name ?? id;
  const statusLabel = (s: DrawStatus) => t(("status" + s.charAt(0).toUpperCase() + s.slice(1)) as string);

  const columns: DataTableColumn<Draw>[] = [
    { id: "tier", header: t("tier"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{tierName(r.tierId)}</p>
        <p className="text-xs text-muted-foreground">Round #{r.round}</p>
      </div>
    ) },
    { id: "scheduled", header: t("scheduledAt"), mobile: "detail", cell: (r) => (
      <span className="flex items-center gap-1.5 text-sm">
        {formatDateTime(r.scheduledAt)}
        {r.locked && <Lock size={12} className="text-muted-foreground" />}
      </span>
    ) },
    { id: "eligible", header: t("eligibleCount"), mobile: "detail", align: "right", cell: (r) => <span>{r.eligibleCount}</span> },
    { id: "winners", header: t("winnersCount"), mobile: "detail", align: "right", cell: (r) => <span>{r.winners.length}/{r.winnersPerDraw}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <Badge className={statusBadge[r.status]}>{statusLabel(r.status)}</Badge> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <DataTable
        columns={columns}
        data={draws ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        onRowClick={(r) => router.push(`/dashboard/draws/${r.id}`)}
        emptyTitle={tc("noData")}
        renderLeadingActions={(r) =>
          canExecute && r.status === "scheduled" && !r.locked ? (
            <Button size="sm" variant="outline" onClick={() => publish.mutate(r.id, { onSuccess: () => toast({ title: t("locked") }) })}>
              <Lock size={13} className="mr-1" /> {t("publish")}
            </Button>
          ) : null
        }
        actions={[
          { label: tc("view"), icon: Eye, onClick: (r) => router.push(`/dashboard/draws/${r.id}`) },
          {
            label: t("reschedule"),
            icon: CalendarClock,
            show: (r) => canExecute && r.status !== "completed",
            onClick: (r) => {
              setRescheduling(r);
              setWhen(r.scheduledAt.slice(0, 16));
              setReason("");
            },
          },
        ]}
      />

      <Modal open={!!rescheduling} onOpenChange={(o) => !o && setRescheduling(null)} title={t("reschedule")} className="max-w-md">
        {rescheduling && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("scheduledAt")}</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("rescheduleReason")}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRescheduling(null)}>{tc("cancel")}</Button>
              <Button
                disabled={!reason || reschedule.isPending}
                onClick={() =>
                  reschedule.mutate(
                    { id: rescheduling.id, scheduledAt: new Date(when).toISOString(), reason },
                    {
                      onSuccess: () => { toast({ title: t("reschedule"), description: rescheduling.id }); setRescheduling(null); },
                      onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
                    }
                  )
                }
              >
                {tc("save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function DrawsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.DRAW_READ]}>
      <DrawsInner />
    </RequirePermission>
  );
}
