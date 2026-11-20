"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Hand, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useChooseOnBehalf, useParticipation, usePilgrimageDecisions, useReviewDecision } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Detail, emptyMethod, Field, MethodFields, PaymentOutcomeButtons, PStatus, useErrorToast, type MethodChoice } from "@/components/pilgrimage/shared";
import { NON_WINNER_OPTIONS, type NonWinnerOption, type PilgrimageDecision } from "@/types/pilgrimage";

const STATUSES = ["awaiting_choice", "pending_approval", "processing", "completed"] as const;

/**
 * Non-winners' decisions. Each member decides alone: carry the savings to the
 * next draw, or withdraw them. A withdrawal is approved by staff and paid back
 * from the Equb ledger (never posted to accounting); it completes once the
 * refund is confirmed.
 */
export function DecisionsTab({ cycleId }: { cycleId?: string }) {
  const t = useTranslations("pilgrimage.decision");
  const to = useTranslations("pilgrimage.option");
  const tc = useTranslations("common");
  const ts = useTranslations("pilgrimage.status");
  const { has } = useEkubAccess();
  const [status, setStatus] = useState<string>(cycleId ? "all" : "pending_approval");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = usePilgrimageDecisions({ cycle_id: cycleId, status: status === "all" ? undefined : status, page, limit: perPage });
  const [reviewing, setReviewing] = useState<PilgrimageDecision | null>(null);
  const [choosing, setChoosing] = useState<PilgrimageDecision | null>(null);

  const columns: DataTableColumn<PilgrimageDecision>[] = [
    { id: "member", header: tc("member"), mobile: "title", cell: (d) => (
      <Link href={`/dashboard/pilgrimage/participations/${d.participation_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
        <p className="font-medium text-foreground">{d.participation?.member?.full_name ?? tc("unknownMember")}</p>
        <p className="font-mono text-xs text-muted-foreground">{d.participation?.number}</p>
      </Link>
    ) },
    { id: "option", header: t("option"), mobile: "detail", cell: (d) => (
      <div className="text-sm">
        <p>{d.option ? to(d.option) : "—"}</p>
        {d.defaulted && <p className="text-xs text-warning">{t("defaulted")}</p>}
      </div>
    ) },
    { id: "deadline", header: t("deadline"), mobile: "detail", cell: (d) => <span className="text-sm">{formatDate(d.deadline)}</span> },
    { id: "amount", header: tc("amount"), align: "right", mobile: "detail", cell: (d) => <span className="tabular-nums">{d.amount > 0 ? formatCurrency(d.amount) : "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (d) => (
      d.status === "processing" && d.payment_id && has(EKUB_PERMS.PILGRIMAGE_APPROVE) ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("confirmRefund")}</p>
          <PaymentOutcomeButtons paymentId={d.payment_id} />
        </div>
      ) : (
        <div>
          <PStatus status={d.status} />
          {d.failure_reason && <p className="mt-1 max-w-xs text-xs text-destructive">{d.failure_reason}</p>}
        </div>
      )
    ) },
  ];
  const actions: DataTableAction<PilgrimageDecision>[] = [
    ...(has(EKUB_PERMS.PILGRIMAGE_APPROVE) ? [{ label: t("review"), icon: CheckCircle2, show: (d: PilgrimageDecision) => d.status === "pending_approval", onClick: setReviewing }] : []),
    ...(has(EKUB_PERMS.PILGRIMAGE_REGISTER) ? [{ label: t("chooseForMember"), icon: Hand, show: (d: PilgrimageDecision) => d.status === "awaiting_choice", onClick: setChoosing }] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        actions={actions}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
      <ReviewModal decision={reviewing} onClose={() => setReviewing(null)} />
      <ChooseModal decision={choosing} onClose={() => setChoosing(null)} />
    </div>
  );
}

/** Approves a withdrawal (raising the refund of the whole Equb balance) or rejects it. */
function ReviewModal({ decision, onClose }: { decision: PilgrimageDecision | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.decision");
  const to = useTranslations("pilgrimage.option");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const review = useReviewDecision();
  const { data: participation } = useParticipation(decision?.participation_id ?? "");
  const [payment, setPayment] = useState<MethodChoice>(emptyMethod());
  const [note, setNote] = useState("");
  const close = () => { setPayment(emptyMethod()); setNote(""); onClose(); };

  const submit = (approve: boolean) =>
    decision &&
    review.mutate(
      {
        id: decision.id,
        body: approve
          ? { approve, note: note.trim() || undefined, payment_method: payment.method || undefined, transaction_id: payment.reference.trim() || undefined }
          : { approve, note: note.trim() },
      },
      { onSuccess: () => { toast({ title: approve ? t("approved") : t("rejected") }); close(); }, onError },
    );

  return (
    <Modal open={!!decision} onOpenChange={(o) => !o && close()} title={t("reviewTitle")} className="max-w-xl">
      {decision && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-3">
            <Detail label={tc("member")}>{decision.participation?.member?.full_name ?? "—"}</Detail>
            <Detail label={t("participation")}>{decision.participation?.number ?? "—"}</Detail>
            <Detail label={t("option")}>{decision.option ? to(decision.option) : "—"}</Detail>
            <Detail label={t("refundAmount")}>{participation ? formatCurrency(participation.balance) : "…"}</Detail>
          </div>
          <p className="text-sm text-muted-foreground">{t("withdrawHint")}</p>
          <MethodFields value={payment} onChange={setPayment} />
          <Field label={`${t("note")} (${t("noteRequiredToReject")})`}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={review.isPending || note.trim().length < 3} onClick={() => submit(false)}>
              <XCircle size={15} className="mr-1" /> {tc("reject")}
            </Button>
            <Button disabled={review.isPending || !payment.method} onClick={() => submit(true)}>
              {review.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <CheckCircle2 size={15} className="mr-1" />} {tc("approve")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ChooseModal({ decision, onClose }: { decision: PilgrimageDecision | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.decision");
  const to = useTranslations("pilgrimage.option");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const choose = useChooseOnBehalf();
  const [option, setOption] = useState<NonWinnerOption | "">("");
  const close = () => { setOption(""); onClose(); };

  return (
    <Modal open={!!decision} onOpenChange={(o) => !o && close()} title={t("chooseTitle")} className="max-w-md">
      {decision && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("chooseHint", { name: decision.participation?.member?.full_name ?? "" })}</p>
          <div className="grid gap-2">
            {NON_WINNER_OPTIONS.map((o) => (
              <button key={o} type="button" onClick={() => setOption(o)}
                className={cn("rounded-xl border p-3 text-left transition-colors", option === o ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                <p className="text-sm font-medium text-foreground">{to(o)}</p>
                <p className="text-xs text-muted-foreground">{t(`optionHint_${o}` as never)}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
            <Button disabled={!option || choose.isPending}
              onClick={() => option && choose.mutate({ id: decision.id, option }, { onSuccess: () => { toast({ title: t("chosen") }); close(); }, onError })}>
              {tc("confirm")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
