"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, AlarmClockOff, Trophy, Info, RefreshCw, CheckCircle2, Hourglass } from "lucide-react";
import { DataTable, roundFacet, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/equb/status-badge";
import { useRounds, useMarkOverdue, useRefreshReadiness } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getErrorMessage, humanizeDates } from "@/lib/utils";
import type { Equb, Round } from "@/types/ekub";

/** Every round of one Equb; click through to the round detail (payments + draw). */
export function RoundsTab({ equb }: { equb: Equb }) {
  const t = useTranslations("rounds");
  const tc = useTranslations("common");
  const router = useRouter();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.PENALTY_MANAGE) || has(EKUB_PERMS.EQUB_MANAGE);

  const { data, isLoading } = useRounds(equb.id);
  const markOverdue = useMarkOverdue();
  const refresh = useRefreshReadiness();

  const go = (r: Round) => router.push(`/dashboard/equbs/${equb.id}/rounds/${r.id}`);

  const columns: DataTableColumn<Round>[] = [
    { id: "round", header: t("round"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{t("roundNo", { n: r.roundNumber })}</p>
        <p className="text-xs text-muted-foreground">{t("dueDate")}: {formatDate(r.contributionDueDate)}</p>
      </div>
    ) },
    { id: "scheduled", header: t("scheduledAt"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.scheduledAt)}</span> },
    { id: "paid", header: `${t("paid")} / ${t("unpaid")}`, mobile: "detail", align: "right", cell: (r) => (
      <span className="text-sm"><span className="text-success">{r.paidCount}</span> / <span className="text-warning">{r.unpaidCount}</span></span>
    ) },
    { id: "rate", header: t("paymentRate"), mobile: "detail", align: "right", cell: (r) => (
      <div className="flex items-center justify-end gap-2">
        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
          <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(0, Math.min(100, r.paymentPercentage))}%` }} />
        </div>
        <span className="text-sm">{Math.round(r.paymentPercentage)}%</span>
      </div>
    ) },
    { id: "adminFee", header: t("adminFee"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{formatCurrency(r.totalAdminFee)}</span> },
    { id: "payout", header: t("payout"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm font-medium">{formatCurrency(r.payoutAmount)}</span> },
    { id: "winners", header: t("winners"), mobile: "detail", align: "right", cell: (r) => (
      <span className="inline-flex items-center gap-1 text-sm"><Trophy size={13} className="text-secondary-foreground" /> {r.winners.length}</span>
    ) },
    { id: "ready", header: t("readiness"), mobile: "detail", cell: (r) => {
      if (r.status === "drawn" || r.status === "completed" || r.status === "cancelled") return <span className="text-sm text-muted-foreground">—</span>;
      // Ready only when the backend says so (status ready_for_draw or can_execute_draw);
      // the list endpoint often sends neither, so absence of a reason proves nothing.
      if (r.canExecuteDraw || r.rawStatus === "ready_for_draw")
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 size={13} /> {t("readyToDraw")}</span>;
      if (r.notReadyReason)
        return <span className="inline-flex max-w-[260px] items-start gap-1 text-xs text-warning" title={r.notReadyReason}><Hourglass size={13} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{humanizeDates(r.notReadyReason)}</span></span>;
      return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Hourglass size={13} /> {t("notReadyYet")}</span>;
    } },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="round" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("subtitle")}</span>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            title={t("refreshReadinessHint")}
            disabled={refresh.isPending}
            onClick={() => refresh.mutate(undefined, { onSuccess: () => toast({ title: t("refreshReadiness") }), onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }) })}
          >
            <RefreshCw size={15} className={`mr-1 ${refresh.isPending ? "animate-spin" : ""}`} /> {t("refreshReadiness")}
          </Button>
          <Button
            variant="outline"
            title={t("markOverdueHint")}
            disabled={markOverdue.isPending}
            onClick={() => markOverdue.mutate(undefined, { onSuccess: () => toast({ title: t("markOverdue") }), onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }) })}
          >
            <AlarmClockOff size={15} className="mr-1" /> {t("markOverdue")}
          </Button>
          </div>
        )}
      </div>

      <DataTable
        filters={{
          search: { placeholder: t("searchRound"), keys: (r) => [`#${r.roundNumber}`, t("roundNo", { n: r.roundNumber }), formatDate(r.contributionDueDate)] },
          facets: [
            roundFacet(t("round"), (r: Round) => r.roundNumber),
            { id: "status", label: tc("status"), get: (r) => r.status },
            {
              id: "readiness",
              label: t("readiness"),
              get: (r) => (r.status === "drawn" || r.status === "completed" || r.status === "cancelled" ? "done" : r.canExecuteDraw || r.rawStatus === "ready_for_draw" ? "ready" : "not_ready"),
              options: [{ value: "ready", label: t("readyToDraw") }, { value: "not_ready", label: t("notReadyYet") }, { value: "done", label: t("drawnOrClosed") }],
            },
            {
              id: "collection",
              label: t("collection"),
              get: (r) => (r.paidCount === 0 ? "none" : r.unpaidCount === 0 ? "full" : "partial"),
              options: [{ value: "none", label: t("collectionNone") }, { value: "partial", label: t("collectionPartial") }, { value: "full", label: t("collectionFull") }],
            },
            { id: "winners", label: t("winners"), get: (r) => (r.winners.length ? "with" : "without"), options: [{ value: "with", label: t("hasWinners") }, { value: "without", label: t("noWinners") }] },
          ],
        }}
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        onRowClick={go}
        emptyTitle={tc("noData")}
        emptyMessage={t("noRounds")}
        actions={[{ label: tc("view"), icon: Eye, onClick: go }]}
      />
    </div>
  );
}
