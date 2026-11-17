"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePaymentAccounts } from "@/hooks/pilgrimage";
import { cn, getErrorMessage } from "@/lib/utils";

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
  invested: "bg-info/15 text-info",
  inactive: "bg-muted text-muted-foreground",
  // draw outcomes
  pending: "bg-muted text-muted-foreground",
  ineligible: "bg-muted text-muted-foreground",
  group_win: "bg-primary/15 text-primary",
  group_ineligible: "bg-warning/15 text-warning",
  not_selected: "bg-muted text-muted-foreground",
  // winners
  confirmed: "bg-info/15 text-info",
  finance_opened: "bg-success/15 text-success",
  finance_failed: "bg-destructive/15 text-destructive",
  // decisions
  awaiting_choice: "bg-warning/15 text-warning",
  pending_approval: "bg-info/15 text-info",
  processing: "bg-secondary/20 text-secondary-foreground",
  completed: "bg-success/15 text-success",
  // mudarabah
  pending_funding: "bg-warning/15 text-warning",
  matured: "bg-info/15 text-info",
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

export const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentChoice {
  method: PaymentMethod | "";
  accountId: string;
  reference: string;
}
export const emptyPayment = (): PaymentChoice => ({ method: "", accountId: "", reference: "" });

/**
 * Method, receiving account and reference of a SACCO payment. The account is
 * one of the accounts synced from accounting for that method, sent as
 * payment_account_id (the backend derives the journal from it).
 */
export function PaymentFields({ value, onChange, methods = PAYMENT_METHODS }: { value: PaymentChoice; onChange: (v: PaymentChoice) => void; methods?: readonly PaymentMethod[] }) {
  const t = useTranslations("pilgrimage.payment");
  const { data: accounts, isLoading } = usePaymentAccounts(value.method || undefined, !!value.method);
  const active = (accounts ?? []).filter((a) => a.active);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={t("method")}>
        <Select value={value.method} onValueChange={(m) => onChange({ ...value, method: m as PaymentMethod, accountId: "" })}>
          <SelectTrigger><SelectValue placeholder={t("selectMethod")} /></SelectTrigger>
          <SelectContent>
            {methods.map((m) => <SelectItem key={m} value={m}>{t(`method_${m}` as never)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("account")} hint={t("accountHint")}>
        <Select value={value.accountId} onValueChange={(id) => onChange({ ...value, accountId: id })} disabled={!value.method}>
          <SelectTrigger><SelectValue placeholder={t("selectAccount")} /></SelectTrigger>
          <SelectContent loading={isLoading} empty={!isLoading && active.length === 0}>
            {active.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.account.name || a.account.code || a.id}
                {a.journal.name && <span className="text-muted-foreground"> · {a.journal.name}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={`${t("reference")} (${t("optional")})`} className="sm:col-span-2">
        <Input value={value.reference} maxLength={100} onChange={(e) => onChange({ ...value, reference: e.target.value })} placeholder="FT2611170001" />
      </Field>
    </div>
  );
}

/** The payment_* fields of a request body for a PaymentChoice. */
export const paymentBody = (p: PaymentChoice) => ({
  payment_method: p.method || undefined,
  payment_account_id: p.accountId || undefined,
  transaction_id: p.reference.trim() || undefined,
});
