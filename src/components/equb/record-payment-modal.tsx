"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wallet, AlertTriangle, CheckCircle2, Info, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEqubs, useEqub, useEqubMembers, useRounds, useMemberStanding, useRecordPayment, useCatchUp, useConfirmPayment } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import type { RecordedPayment } from "@/types/ekub";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types/equb-api";

export interface RecordPaymentTarget {
  /** Fixed Equb; omit to let the user pick one (Payments page). */
  equbId?: string;
  /** Fixed member; omit to let the user pick one. */
  memberId?: string;
  /** Rounds ticked when the modal opens. */
  roundIds?: string[];
}

/**
 * The one "record a payment" modal used everywhere (round detail, Members tab,
 * Payments page). Staff collect a member's contribution for one or more
 * unpaid rounds via POST /equb/manager/my-groups/{id}/members/{member}/collect;
 * the server works out the amount and settles it once the payment confirms.
 */
export function RecordPaymentModal({ target, onClose }: { target: RecordPaymentTarget | null; onClose: () => void }) {
  const t = useTranslations("recordPayment");
  return (
    <Modal open={!!target} onOpenChange={(o) => !o && onClose()} title={t("title")} className="max-w-xl">
      {target && <Body key={`${target.equbId}-${target.memberId}-${target.roundIds?.join(",")}`} target={target} onClose={onClose} />}
    </Modal>
  );
}

function Body({ target, onClose }: { target: RecordPaymentTarget; onClose: () => void }) {
  const t = useTranslations("recordPayment");
  const tc = useTranslations("common");
  const { toast } = useToast();

  const [equbId, setEqubId] = useState(target.equbId ?? "");
  const [memberId, setMemberId] = useState(target.memberId ?? "");
  const [selected, setSelected] = useState<string[]>(target.roundIds ?? []);
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<RecordedPayment | null>(null);
  const { has } = useEkubAccess();
  const canConfirm = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);
  const confirm = useConfirmPayment();

  const { data: equbs } = useEqubs({ status: "active" });
  const { data: equb } = useEqub(equbId);
  const { data: members } = useEqubMembers(equbId);
  const { data: rounds, isLoading: roundsLoading } = useRounds(equbId);
  const { data: standing, isLoading: standingLoading } = useMemberStanding(equbId, memberId || null);
  const { data: catchUp } = useCatchUp(equbId, memberId || null);
  const record = useRecordPayment();

  // Rounds this member still owes: open or past rounds whose payment row isn't paid.
  const owed = (rounds ?? [])
    .map((r) => ({ round: r, pay: r.memberPayments.find((p) => p.memberId === memberId) }))
    .filter(({ pay }) => pay && pay.status?.toLowerCase() !== "paid" && !pay.paidAt);
  const perRound = equb?.effectiveTerms?.totalPerRound ?? (equb?.category ? equb.category.contribution + equb.category.adminFee + equb.category.takafulFee : 0);
  const estimate = owed.filter(({ round }) => selected.includes(round.id)).reduce((a, { pay }) => a + (pay?.amount || perRound), 0);
  const member = members?.find((m) => m.memberId === memberId);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const needsReference = method !== "cash";
  const valid = !!equbId && !!memberId && selected.length > 0 && (!needsReference || reference.trim().length > 0);

  const isSettled = (s: string) => ["completed", "confirmed", "paid", "success"].includes((s || "").toLowerCase());

  const submit = () =>
    record.mutate(
      { equbId, memberId, input: { roundIds: selected, method, reference } },
      {
        onSuccess: (r) => {
          toast({ title: isSettled(r.status) ? t("recorded") : t("recordedPending"), description: `${member?.name ?? ""} · ${formatCurrency(r.totalAmount || estimate)}` });
          setResult({ ...r, totalAmount: r.totalAmount || estimate });
        },
        onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
      }
    );

  const confirmNow = () =>
    result &&
    confirm.mutate(
      { equbId, paymentId: result.paymentId },
      {
        onSuccess: () => { toast({ title: t("confirmed"), description: `${member?.name ?? ""} · ${formatCurrency(result.totalAmount)}` }); onClose(); },
        onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
      }
    );

  // ---- result step: the payment was raised; confirm it now or leave it pending
  if (result) {
    const settled = isSettled(result.status);
    return (
      <div className="space-y-4">
        <div className={cn("rounded-xl border p-4", settled ? "border-success/30 bg-success/10" : "border-info/30 bg-info/10")}>
          <p className={cn("flex items-center gap-2 font-medium", settled ? "text-success" : "text-info")}>
            {settled ? <CheckCircle2 size={18} /> : <Clock size={18} />} {settled ? t("recorded") : t("awaitingConfirmation")}
          </p>
          <p className="mt-1 text-sm text-foreground">{member?.name ?? "…"} · <strong>{formatCurrency(result.totalAmount)}</strong> · {t(`method_${method}` as never)}{reference ? ` · ${reference}` : ""}</p>
          <p className="mt-2 text-xs text-muted-foreground">{settled ? t("completedNote") : t("pendingConfirmNote")}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{settled || !canConfirm ? t("done") : t("later")}</Button>
          {!settled && canConfirm && (
            <Button disabled={confirm.isPending} onClick={confirmNow}>
              {confirm.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <CheckCircle2 size={15} className="mr-1" />} {t("confirmNow")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
      {/* Who */}
      {!target.equbId && (
        <div className="space-y-1.5">
          <Label>{t("equb")}</Label>
          <Select value={equbId} onValueChange={(v) => { setEqubId(v); setMemberId(""); setSelected([]); }}>
            <SelectTrigger><SelectValue placeholder={t("selectEqub")} /></SelectTrigger>
            <SelectContent>
              {(equbs ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name} <span className="text-muted-foreground">· {e.code}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {!target.memberId ? (
        <div className="space-y-1.5">
          <Label>{t("member")}</Label>
          <Select value={memberId} onValueChange={(v) => { setMemberId(v); setSelected([]); }} disabled={!equbId}>
            <SelectTrigger><SelectValue placeholder={t("selectMember")} /></SelectTrigger>
            <SelectContent>
              {(members ?? []).map((m) => <SelectItem key={m.memberId} value={m.memberId}>#{m.position} · {m.name} <span className="text-muted-foreground">· {m.membershipNumber}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">{member?.name ?? "…"}</p>
          <p className="text-xs text-muted-foreground">{member?.membershipNumber}{equb ? ` · ${equb.name}` : ""}</p>
        </div>
      )}

      {/* Standing */}
      {memberId && (
        standingLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : standing ? (
          <div className={cn("rounded-xl border p-3 text-sm", standing.good ? "border-success/30 bg-success/10" : standing.banned ? "border-destructive/30 bg-destructive/10" : "border-warning/30 bg-warning/10")}>
            <p className={cn("flex items-center gap-1.5 font-medium", standing.good ? "text-success" : standing.banned ? "text-destructive" : "text-warning")}>
              {standing.good ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {t(`standing_${standing.status}` as never) || standing.status}
              {standing.unpaidRounds > 0 && <span className="font-normal"> · {t("owes", { rounds: standing.unpaidRounds, amount: formatCurrency(standing.unpaidAmount) })}</span>}
            </p>
            {standing.whatToDo.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-foreground/80">{standing.whatToDo.map((w) => <li key={w}>{w}</li>)}</ul>
            )}
            {catchUp && catchUp.roundsMissed > 0 && (
              <p className="mt-2 rounded-lg bg-background/60 px-2 py-1.5 text-xs text-foreground">
                {t("catchUpLine", { rounds: catchUp.roundsMissed, per: formatCurrency(catchUp.perRoundAmount), total: formatCurrency(catchUp.totalCatchUp), next: catchUp.nextRoundNumber })}
              </p>
            )}
          </div>
        ) : null
      )}

      {/* Rounds */}
      {memberId && (
        <div className="space-y-1.5">
          <Label>{t("rounds")}</Label>
          {roundsLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : owed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("nothingOwed")}</p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {owed.map(({ round, pay }) => {
                const on = selected.includes(round.id);
                return (
                  <label key={round.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition", on ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
                    <input type="checkbox" checked={on} onChange={() => toggle(round.id)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    <span className="flex-1 text-sm">
                      <span className="font-medium text-foreground">#{round.roundNumber}</span>
                      <span className="text-muted-foreground"> · {t("due")} {formatDate(round.contributionDueDate)}</span>
                      {pay?.status === "overdue" && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-px text-[10px] font-semibold uppercase text-destructive">{t("overdue")}</span>}
                    </span>
                    <span className="text-sm font-medium">{formatCurrency(pay?.amount || perRound)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* How */}
      {memberId && owed.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("method")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{t(`method_${m}` as never)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("reference")} {!needsReference && <span className="font-normal text-muted-foreground">({tc("optional")})</span>}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={needsReference ? t("referencePlaceholder") : ""} />
            </div>
          </div>

          <div className="flex items-baseline justify-between rounded-xl bg-primary/5 p-3">
            <span className="text-sm text-muted-foreground">{t("estimate", { count: selected.length })}</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(estimate)}</span>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0 text-primary" /> {t("serverAmountNote")}</p>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!valid || record.isPending} onClick={submit}>
          {record.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Wallet size={15} className="mr-1" />} {record.isPending ? tc("saving") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
