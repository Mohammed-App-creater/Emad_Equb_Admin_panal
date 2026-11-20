"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, ExternalLink, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { usePilgrimageWinners, useRetryWinner } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PaymentOutcomeButtons, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { WINNER_STEPS, type PilgrimageWinner } from "@/types/pilgrimage";

/**
 * Winners leave the Equb one step at a time: once their fees are paid a
 * draft contract is created in EMAD SACCO; SACCO staff complete it and send
 * it to Odoo; once Odoo confirms it their savings move onto it, and the
 * SACCO's own saving and finance flow takes over. Each winner on their own.
 */
export function WinnersTab({ cycleId }: { cycleId?: string }) {
  const t = useTranslations("pilgrimage.winner");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const retry = useRetryWinner();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = usePilgrimageWinners({ cycle_id: cycleId, status, page, limit: perPage });
  const canManage = has(EKUB_PERMS.PILGRIMAGE_MANAGE);

  const columns: DataTableColumn<PilgrimageWinner>[] = [
    { id: "member", header: tc("member"), mobile: "title", cell: (w) => (
      <Link href={`/dashboard/pilgrimage/participations/${w.participation_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
        <p className="font-medium text-foreground">{w.member?.full_name ?? tc("unknownMember")}</p>
        <p className="font-mono text-xs text-muted-foreground">{w.participation?.number} · <PStatus status={w.outcome} outcome className="px-1.5 py-0 text-[10px]" /></p>
      </Link>
    ) },
    { id: "money", header: t("money"), mobile: "detail", cell: (w) => (
      <div className="text-xs leading-5">
        <p>{t("savings")}: <span className="tabular-nums font-medium">{formatCurrency(w.recognised_savings)}</span></p>
        {w.saving_contract && (
          <p className="text-muted-foreground">
            {t("contract")}: <span className="font-mono">{w.saving_contract.contract_number || t("draftNumber")}</span> · {w.saving_contract.status}
          </p>
        )}
      </div>
    ) },
    { id: "deadline", header: t("contractDeadline"), mobile: "detail", cell: (w) => <DeadlineCell winner={w} /> },
    { id: "journey", header: t("journey"), mobile: "detail", cell: (w) => <Journey winner={w} /> },
    { id: "next", header: t("next"), mobile: "badge", cell: (w) => <NextStep winner={w} canManage={canManage} /> },
  ];
  const actions: DataTableAction<PilgrimageWinner>[] = canManage
    ? [
        {
          label: t("retry"), icon: RotateCw, show: (w) => w.status !== "completed", disabled: () => retry.isPending,
          onClick: (w) => retry.mutate(w.id, { onSuccess: (r) => toast({ title: r.failure_reason ? t("stillWaiting") : t("retried"), description: r.failure_reason }), onError }),
        },
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <div className="flex flex-wrap gap-1.5">
          {[undefined, ...WINNER_STEPS].map((s) => (
            <Button key={s ?? "all"} size="sm" variant={status === s ? "default" : "outline"} onClick={() => { setStatus(s); setPage(1); }}>
              {s ? t(`step_${s}` as never) : tc("all")}
            </Button>
          ))}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(w) => w.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        actions={actions}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
    </div>
  );
}

/** The five steps as dots; the current one is highlighted, a failed one red. */
export function Journey({ winner: w, vertical }: { winner: PilgrimageWinner; vertical?: boolean }) {
  const t = useTranslations("pilgrimage.winner");
  const at = WINNER_STEPS.indexOf(w.status);
  return (
    <ol className={cn(vertical ? "space-y-3" : "flex items-center gap-1")}>
      {WINNER_STEPS.map((s, i) => {
        const done = i < at || w.status === "completed";
        const current = i === at && w.status !== "completed";
        const failed = current && !!w.failure_reason;
        const dot = (
          <span className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
            done && "border-success bg-success text-success-foreground",
            current && !failed && "border-primary bg-primary/15 text-primary",
            failed && "border-destructive bg-destructive/15 text-destructive",
            !done && !current && "border-border text-muted-foreground",
          )}>
            {done ? <Check size={11} /> : i + 1}
          </span>
        );
        if (!vertical) {
          return (
            <li key={s} className="flex items-center gap-1" title={t(`step_${s}` as never)}>
              {dot}
              {i < WINNER_STEPS.length - 1 && <span className={cn("h-px w-3", done ? "bg-success" : "bg-border")} />}
            </li>
          );
        }
        return (
          <li key={s} className="flex gap-3">
            {dot}
            <div className="min-w-0">
              <p className={cn("text-sm", current ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>{t(`step_${s}` as never)}</p>
              <p className="text-xs text-muted-foreground">{t(`stepHint_${s}` as never)}</p>
              {failed && <p className="mt-0.5 text-xs text-destructive">{w.failure_reason}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Where the SACCO portal is, to open a winner's draft contract there (unset: no link). */
const SACCO_PORTAL_URL = process.env.NEXT_PUBLIC_SACCO_PORTAL_URL?.replace(/\/$/, "");

/** A link to a winner's contract in the SACCO portal, where staff complete and send it. */
export function SaccoContractLink({ winner: w }: { winner: PilgrimageWinner }) {
  const t = useTranslations("pilgrimage.winner");
  if (!w.saving_contract_id || !SACCO_PORTAL_URL) return null;
  return (
    <a href={`${SACCO_PORTAL_URL}/dashboard/saving-contracts/${w.saving_contract_id}`} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
      {t("openInSacco")} <ExternalLink size={12} />
    </a>
  );
}

/** What has to happen next for a winner, and who does it. */
export function NextStep({ winner: w, canManage }: { winner: PilgrimageWinner; canManage: boolean }) {
  const t = useTranslations("pilgrimage.winner");
  const owed = winnerFeesOwed(w);
  if (w.status === "awaiting_fees") {
    return (
      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
        <p className="max-w-xs text-xs text-warning">{owed > 0 ? t("feesDue", { amount: formatCurrency(owed) }) : t("paymentClearing")}</p>
        {owed > 0 && <Link href={`/dashboard/pilgrimage/participations/${w.participation_id}`} className="text-xs font-medium text-primary hover:underline">{t("collectFees")}</Link>}
        {w.failure_reason && <p className="max-w-xs text-xs text-destructive">{w.failure_reason}</p>}
      </div>
    );
  }
  if (w.status === "contract_draft") {
    return (
      <div className="space-y-1">
        <p className="max-w-xs text-xs text-muted-foreground">{t("draftInSacco")}</p>
        <SaccoContractLink winner={w} />
        {w.failure_reason && <p className="max-w-xs text-xs text-destructive">{w.failure_reason}</p>}
      </div>
    );
  }
  if (w.status === "transferring" && w.transfer_payment_id && canManage) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t("confirmTransfer")}</p>
        <PaymentOutcomeButtons paymentId={w.transfer_payment_id} />
      </div>
    );
  }
  return (
    <div>
      <PStatus status={w.status} />
      {w.failure_reason && <p className="mt-1 max-w-xs text-xs text-destructive">{w.failure_reason}</p>}
    </div>
  );
}

/** A winner's contract deadline, flagged once it has passed without the contract sent to Odoo. */
export function DeadlineCell({ winner: w }: { winner: PilgrimageWinner }) {
  const t = useTranslations("pilgrimage.winner");
  if (!w.contract_deadline) return <span className="text-muted-foreground">—</span>;
  if (w.status !== "awaiting_fees" && w.status !== "contract_draft") return <span className="text-xs text-muted-foreground">{formatDate(w.contract_deadline)}</span>;
  return (
    <span className="flex flex-col gap-0.5 text-sm">
      <span className={cn("tabular-nums", w.contract_overdue && "font-medium text-destructive")}>{formatDate(w.contract_deadline)}</span>
      {w.contract_overdue && <Badge className="w-fit bg-destructive/15 text-destructive">{t("overdue")}</Badge>}
    </span>
  );
}

/** What a winner still owes of the admin fee and Takaful (0 when unknown or paid). */
function winnerFeesOwed(w: PilgrimageWinner) {
  const p = w.participation;
  if (!p) return 0;
  const owed = Math.max(0, (p.admin_fee_due ?? 0) - (p.admin_fee_paid ?? 0)) + Math.max(0, (p.takaful_fee_due ?? 0) - (p.takaful_fee_paid ?? 0));
  return Math.round(owed * 100) / 100;
}
