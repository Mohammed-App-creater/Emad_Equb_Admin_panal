"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, HandCoins, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { usePilgrimageCycle, usePilgrimageWinners, useRetryWinner, useSetWinnerTerms } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Detail, Field, PaymentOutcomeButtons, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { WINNER_STEPS, type PilgrimageWinner } from "@/types/pilgrimage";

/**
 * Winners leave the Equb one step at a time: staff agree the finance amount,
 * a saving contract is opened for savings + finance, Odoo activates it, the
 * savings move onto it, and a draft Murabaha finance is opened for the member
 * to sign. Each winner is processed on their own.
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
  const [agreeing, setAgreeing] = useState<PilgrimageWinner | null>(null);
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
        <p>{t("finance")}: <span className="tabular-nums font-medium">{w.finance_amount > 0 ? formatCurrency(w.finance_amount) : "—"}</span></p>
        {w.loan_application && <p className="font-mono text-muted-foreground">{w.loan_application.finance_number} · {w.loan_application.status}</p>}
      </div>
    ) },
    { id: "deadline", header: t("contractDeadline"), mobile: "detail", cell: (w) => <DeadlineCell winner={w} /> },
    { id: "journey", header: t("journey"), mobile: "detail", cell: (w) => <Journey winner={w} /> },
    { id: "next", header: t("next"), mobile: "badge", cell: (w) => <NextStep winner={w} canManage={canManage} onAgree={() => setAgreeing(w)} /> },
  ];
  const actions: DataTableAction<PilgrimageWinner>[] = canManage
    ? [
        { label: t("agree"), icon: HandCoins, show: (w) => w.status === "awaiting_terms", onClick: setAgreeing },
        {
          label: t("retry"), icon: RotateCw, show: (w) => w.status !== "awaiting_terms" && w.status !== "finance_opened", disabled: () => retry.isPending,
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
      <AgreeTermsModal winner={agreeing} onClose={() => setAgreeing(null)} />
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
        const done = i < at || w.status === "finance_opened";
        const current = i === at && w.status !== "finance_opened";
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

/** What has to happen next for a winner, as a button where staff can act. */
export function NextStep({ winner: w, canManage, onAgree }: { winner: PilgrimageWinner; canManage: boolean; onAgree: () => void }) {
  const t = useTranslations("pilgrimage.winner");
  const owed = winnerFeesOwed(w);
  if (w.status === "awaiting_terms" && owed > 0) {
    // The contract is opened only once the fees are paid (on the participation page).
    return (
      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
        <p className="max-w-xs text-xs text-warning">{t("feesDue", { amount: formatCurrency(owed) })}</p>
        <Link href={`/dashboard/pilgrimage/participations/${w.participation_id}`} className="text-xs font-medium text-primary hover:underline">{t("collectFees")}</Link>
      </div>
    );
  }
  if (w.status === "awaiting_terms" && canManage) {
    return <Button size="sm" onClick={(e) => { e.stopPropagation(); onAgree(); }}><HandCoins size={14} className="mr-1" /> {t("agree")}</Button>;
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

/** A winner's contract deadline, flagged once it has passed without a contract. */
export function DeadlineCell({ winner: w }: { winner: PilgrimageWinner }) {
  const t = useTranslations("pilgrimage.winner");
  if (!w.contract_deadline) return <span className="text-muted-foreground">—</span>;
  if (w.status !== "awaiting_terms") return <span className="text-xs text-muted-foreground">{formatDate(w.contract_deadline)}</span>;
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

/** Records the Murabaha finance agreed with a winner, which opens their saving contract. */
export function AgreeTermsModal({ winner, onClose }: { winner: PilgrimageWinner | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.winner");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const setTerms = useSetWinnerTerms();
  const { data: cycle } = usePilgrimageCycle(winner?.cycle_id ?? "");
  const max = cycle?.product?.max_finance_amount ?? 0;
  const suggested = winner ? Math.max(0, winner.package_cost - winner.recognised_savings) : 0;
  const [amount, setAmount] = useState("");
  const close = () => { setAmount(""); onClose(); };
  const value = Number(amount || suggested);
  const tooMuch = max > 0 && value > max;

  return (
    <Modal open={!!winner} onOpenChange={(o) => !o && close()} title={t("agreeTitle")} className="max-w-lg">
      {winner && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("agreeHint", { name: winner.member?.full_name ?? "" })}</p>
          <Field label={t("financeAmount")} hint={max > 0 ? t("maxHint", { max: formatCurrency(max) }) : undefined} error={tooMuch ? t("aboveMax", { max: formatCurrency(max) }) : undefined}>
            <Input type="number" min={0} step="any" value={amount} placeholder={String(suggested)} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
          <div className="rounded-xl border border-border p-3">
            <Detail label={t("savingsMoved")}>{formatCurrency(winner.recognised_savings)}</Detail>
            <Detail label={t("financeAmount")}>{formatCurrency(value)}</Detail>
            <div className="border-t border-border">
              <Detail label={t("contractTotal")}>{formatCurrency(winner.recognised_savings + value)}</Detail>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">{t("packageRef", { amount: formatCurrency(winner.package_cost) })}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
            <Button disabled={!(value > 0) || tooMuch || setTerms.isPending}
              onClick={() => setTerms.mutate({ id: winner.id, financeAmount: value }, {
                onSuccess: () => { toast({ title: t("agreed"), description: t("agreedHint") }); close(); }, onError,
              })}>
              {setTerms.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("agreeAndOpen")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
