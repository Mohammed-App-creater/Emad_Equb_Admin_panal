"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Gavel } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useDisputes, useEscalateDispute, useResolveDispute } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { Dispute, DisputeStatus } from "@/types/ekub";

const statusBadge: Record<DisputeStatus, string> = {
  open: "bg-info/15 text-info",
  escalated: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
};

function DisputesInner() {
  const t = useTranslations("disputes");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canResolve = has(EKUB_PERMS.DISPUTE_RESOLVE);

  const { data, isLoading } = useDisputes();
  const escalate = useEscalateDispute();
  const resolve = useResolveDispute();

  const [resolving, setResolving] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [decision, setDecision] = useState("");

  const statusLabel = (s: DisputeStatus) =>
    s === "open" ? t("statusOpen") : s === "escalated" ? t("statusEscalated") : t("statusResolved");

  const columns: DataTableColumn<Dispute>[] = [
    { id: "member", header: t("member"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.memberHandle}</span> },
    { id: "subject", header: t("subject"), mobile: "subtitle", cell: (r) => <span className="text-sm text-foreground">{r.subject}</span> },
    { id: "opened", header: t("openedAt"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.openedAt)}</span> },
    { id: "decision", header: t("boardDecision"), mobile: "detail", cell: (r) => <span className="text-sm text-muted-foreground">{r.boardDecision ?? "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <Badge className={statusBadge[r.status]}>{statusLabel(r.status)}</Badge> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        renderLeadingActions={(r) => {
          if (!canResolve) return null;
          if (r.status === "open")
            return (
              <Button size="sm" variant="outline" onClick={() => escalate.mutate(r.id, { onSuccess: () => toast({ title: t("statusEscalated") }) })}>
                <ArrowUpRight size={14} className="mr-1" /> {t("escalate")}
              </Button>
            );
          if (r.status === "escalated")
            return (
              <Button size="sm" onClick={() => { setResolving(r); setResolution(""); setDecision(""); }}>
                <Gavel size={14} className="mr-1" /> {t("markFinal")}
              </Button>
            );
          return null;
        }}
      />

      <Modal open={!!resolving} onOpenChange={(o) => !o && setResolving(null)} title={t("boardDecision")} className="max-w-md">
        {resolving && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("resolution")}</Label>
              <Input value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("boardDecision")}</Label>
              <Input value={decision} onChange={(e) => setDecision(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolving(null)}>{tc("cancel")}</Button>
              <Button
                disabled={!resolution || !decision || resolve.isPending}
                onClick={() =>
                  resolve.mutate(
                    { id: resolving.id, resolution, boardDecision: decision },
                    { onSuccess: () => { toast({ title: t("statusResolved") }); setResolving(null); } }
                  )
                }
              >
                {t("markFinal")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function DisputesPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.DISPUTE_READ]}>
      <DisputesInner />
    </RequirePermission>
  );
}
