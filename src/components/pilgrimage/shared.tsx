"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAgentsPage } from "@/hooks/ekub";
import { useSetPaymentOutcome } from "@/hooks/pilgrimage";
import { cn, formatCurrency, getErrorMessage } from "@/lib/utils";
import type { AdminFeeAmounts, AdminFeeSplit, FeeShare, ParticipationFees } from "@/types/pilgrimage";

/** Artwork for each pilgrimage, the same tiles the member app shows. */
export const KIND_ICON_SRC = {
  hajj: "/images/hajj-icon.png",
  umrah: "/images/umrah-icon.png",
} as const;

export function kindIconSrc(kind?: string | null): string {
  return kind === "umrah" ? KIND_ICON_SRC.umrah : KIND_ICON_SRC.hajj;
}

/** Rounded Hajj / Umrah tile; decorative, so the label beside it names it. */
export function KindIcon({ kind, size = 20, className }: { kind?: string | null; size?: number; className?: string }) {
  return (
    <Image
      src={kindIconSrc(kind)}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-[22%] object-cover", className)}
    />
  );
}

/** Tone of every Hajj & Umrah status value; unknown values fall back to muted. */
const tones: Record<string, string> = {
  // cycles
  open: "bg-info/15 text-info",
  locked: "bg-warning/15 text-warning",
  drawn: "bg-secondary/20 text-secondary-foreground",
  approved: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
  // participations
  active: "bg-success/15 text-success",
  deciding: "bg-warning/15 text-warning",
  won: "bg-primary/15 text-primary",
  withdrawn: "bg-muted text-muted-foreground",
  inactive: "bg-muted text-muted-foreground",
  // draw outcomes
  ineligible: "bg-muted text-muted-foreground",
  group_win: "bg-primary/15 text-primary",
  group_ineligible: "bg-warning/15 text-warning",
  not_selected: "bg-muted text-muted-foreground",
  // contributions and payments
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  // winners
  awaiting_terms: "bg-warning/15 text-warning",
  contract_pending: "bg-info/15 text-info",
  transferring: "bg-secondary/20 text-secondary-foreground",
  finance_pending: "bg-warning/15 text-warning",
  finance_opened: "bg-success/15 text-success",
  // decisions
  awaiting_choice: "bg-warning/15 text-warning",
  pending_approval: "bg-info/15 text-info",
  processing: "bg-secondary/20 text-secondary-foreground",
  completed: "bg-success/15 text-success",
};

/**
 * Localised, colour-coded status pill (labels in `pilgrimage.status.*`).
 * `outcome` marks a draw entry's outcome, whose "drawn" reads differently
 * from a draw's "drawn" status.
 */
export function PStatus({ status, outcome, className }: { status: string; outcome?: boolean; className?: string }) {
  const t = useTranslations("pilgrimage.status");
  const key = outcome && status === "drawn" ? "drawn_outcome" : status;
  const label = t.has(key as never) ? t(key as never) : status.replace(/_/g, " ");
  return <Badge className={cn(tones[status] ?? "bg-muted text-muted-foreground", className)}>{label}</Badge>;
}

export function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Toast for a failed request, with the backend's message when it gives one. */
export function useErrorToast() {
  const { toast } = useToast();
  return (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
}

/** A label/value line for detail cards. */
export function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

/** A small titled panel used across the module. */
export function Panel({ title, action, className, children }: { title: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface MethodChoice {
  method: PaymentMethod | "";
  reference: string;
}
export const emptyMethod = (): MethodChoice => ({ method: "", reference: "" });

/**
 * How an Equb ledger payment is made: its method and reference. Equb
 * payments touch no accounting account, so no receiving account is asked.
 */
export function MethodFields({ value, onChange }: { value: MethodChoice; onChange: (v: MethodChoice) => void }) {
  const t = useTranslations("pilgrimage.payment");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={t("method")}>
        <Select value={value.method} onValueChange={(m) => onChange({ ...value, method: m as PaymentMethod })}>
          <SelectTrigger><SelectValue placeholder={t("selectMethod")} /></SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{t(`method_${m}` as never)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label={`${t("reference")} (${t("optional")})`}>
        <Input value={value.reference} maxLength={100} onChange={(e) => onChange({ ...value, reference: e.target.value })} placeholder="FT2611170001" />
      </Field>
    </div>
  );
}

/**
 * Confirm / fail a pending payment. Equb ledger payments are confirmed by
 * staff, as rotating Equb payments are; a winner's savings transfer is
 * normally confirmed by accounting and can be confirmed here when testing.
 */
export function PaymentOutcomeButtons({ paymentId, onDone }: { paymentId: string; onDone?: () => void }) {
  const t = useTranslations("pilgrimage.payment");
  const { toast } = useToast();
  const onError = useErrorToast();
  const set = useSetPaymentOutcome();
  const run = (status: "completed" | "failed") =>
    set.mutate({ paymentId, status }, {
      onSuccess: () => { toast({ title: status === "completed" ? t("confirmed") : t("markedFailed") }); onDone?.(); },
      onError,
    });
  return (
    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" disabled={set.isPending} onClick={() => run("completed")}>
        {set.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />} {t("confirm")}
      </Button>
      <Button size="sm" variant="outline" disabled={set.isPending} onClick={() => run("failed")}>
        <X size={14} className="mr-1" /> {t("fail")}
      </Button>
    </div>
  );
}

const cents = (v: number) => Math.round(v * 100) / 100;

/** What a participant owes of a weekly fee over the fee term. */
export const feeTotal = (weekly: number, weeks: number) => cents((weekly || 0) * (weeks || 0));

/** One party's share of an admin fee of fee, as the backend works it out. */
export const shareOf = (share: FeeShare | undefined, fee: number) => {
  if (!share || !(share.value > 0)) return 0;
  return cents(share.basis === "percent" ? (fee * share.value) / 100 : share.value);
};

/**
 * An admin fee divided between the parties, as the backend divides it: the
 * agent and broker take their share (never more than the fee) and the SACCO
 * gets the rest, so the three always add up to the fee.
 */
export function splitAmounts(split: AdminFeeSplit | undefined, fee: number): AdminFeeAmounts {
  fee = cents(fee);
  if (!(fee > 0)) return { agent: 0, broker: 0, sacco: 0 };
  const agent = Math.min(shareOf(split?.agent, fee), fee);
  const broker = Math.min(shareOf(split?.broker, fee), cents(fee - agent));
  return { agent, broker, sacco: cents(fee - agent - broker) };
}

/** How a share reads: "1,000.00 ETB" or "10%". */
export function useShareLabel() {
  const t = useTranslations("pilgrimage.fee");
  return (share: FeeShare | undefined) =>
    !share || !(share.value > 0) ? t("none") : share.basis === "percent" ? t("sharePercent", { value: share.value }) : t("shareFixed", { value: formatCurrency(share.value) });
}

/** A payment's savings, admin fee, Takaful and total, laid out as a receipt. */
export function FeeBreakdown({ savings, adminFee, takaful }: { savings: number; adminFee: number; takaful: number }) {
  const t = useTranslations("pilgrimage.fee");
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-sm">
      <Row label={t("savings")} value={formatCurrency(savings)} />
      <Row label={t("adminFee")} value={formatCurrency(adminFee)} />
      <Row label={t("takaful")} value={formatCurrency(takaful)} />
      <div className="mt-1.5 border-t border-border pt-1.5">
        <Row label={t("memberPays")} value={formatCurrency(cents(savings + adminFee + takaful))} strong />
      </div>
    </div>
  );
}

/** A participant's fees: owed, paid, outstanding, and who gets the admin fee. */
export function FeeStatus({ fees }: { fees: ParticipationFees | null | undefined }) {
  const t = useTranslations("pilgrimage.fee");
  if (!fees || fees.admin_fee_due + fees.takaful_fee_due === 0) return <span className="text-muted-foreground">{t("noneOwed")}</span>;
  return (
    <span className="block text-xs leading-5">
      <span className="block">{t("adminFee")}: {formatCurrency(fees.admin_fee_paid)} / {formatCurrency(fees.admin_fee_due)}</span>
      <span className="block">{t("takaful")}: {formatCurrency(fees.takaful_fee_paid)} / {formatCurrency(fees.takaful_fee_due)}</span>
      {fees.settled
        ? <span className="block text-success">{t("settled")}</span>
        : <span className="block text-warning">{t("outstanding", { amount: formatCurrency(fees.outstanding) })}</span>}
      <span className="block text-muted-foreground">
        {t("splitAmounts", { agent: formatCurrency(fees.admin_fee_split.agent), broker: formatCurrency(fees.admin_fee_split.broker), sacco: formatCurrency(fees.admin_fee_split.sacco) })}
      </span>
    </span>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between py-0.5", strong ? "font-semibold text-foreground" : "text-muted-foreground")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Picks an agent (or none). */
export function AgentSelect({ value, onChange, allowNone = true }: { value: string; onChange: (id: string) => void; allowNone?: boolean }) {
  const t = useTranslations("pilgrimage.agent");
  const { data, isLoading } = useAgentsPage({}, 1, 100);
  const agents = (data?.items ?? []).filter((a) => a.active);
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={t("select")} /></SelectTrigger>
      <SelectContent loading={isLoading}>
        {allowNone && <SelectItem value="none">{t("none")}</SelectItem>}
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name || a.email}{a.phone && <span className="text-muted-foreground"> · {a.phone}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
