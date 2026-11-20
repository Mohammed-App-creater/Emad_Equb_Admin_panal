"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  emptyMethod, FeeBreakdown, Field, MethodFields, PaymentOutcomeButtons, PStatus, useErrorToast, type MethodChoice,
} from "@/components/pilgrimage/shared";
import { useContribute, useContributions, useParticipation } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Contribution } from "@/types/pilgrimage";

/** Which registration the payment modal is for; feesOnly opens it for the fees alone. */
export interface ContributeTarget {
  id: string;
  memberName?: string;
  remainingToEligibility: number;
  feesOnly?: boolean;
}

/**
 * Payments on one registration's Equb ledger: savings, and the admin fee and
 * Takaful (paid once). Pending ones can be confirmed or failed here. The
 * registration outlives a single cycle, so this is the member's whole history.
 */
export function ContributionHistory({ id, bare, pageSize = 10 }: { id: string; bare?: boolean; pageSize?: number }) {
  const t = useTranslations("pilgrimage.ledger");
  const tp = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useContributions(id, page, pageSize);
  const columns: DataTableColumn<Contribution>[] = [
    { id: "date", header: tc("date"), mobile: "title", cell: (c) => <span className="text-sm">{formatDateTime(c.created_at)}</span> },
    { id: "savings", header: t("savings"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums">{formatCurrency(c.amount)}</span> },
    { id: "fees", header: t("fees"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums text-muted-foreground">{formatCurrency(c.admin_fee + c.takaful_fee)}</span> },
    { id: "total", header: t("paid"), align: "right", mobile: "detail", cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.total_amount)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (c) => (
      c.status === "pending" && c.payment_id ? <PaymentOutcomeButtons paymentId={c.payment_id} /> : <PStatus status={c.status} />
    ) },
  ];
  return (
    <DataTable
      bare={bare}
      columns={columns}
      data={data?.items ?? []}
      rowKey={(c) => c.id}
      isLoading={isLoading}
      skeletonRows={3}
      emptyTitle={tc("noData")}
      emptyMessage={tp("noContributions")}
      pagination={{ page, pageSize, total: data?.meta.total ?? 0, onPageChange: setPage }}
    />
  );
}

/**
 * Records a payment in one Equb ledger payment confirmed by staff: savings,
 * and (when owed and chosen) the whole of the outstanding admin fee and
 * Takaful. The fees are paid once, whenever the member chooses; a winner pays
 * them before their contract is opened.
 */
export function ContributeModal({ target, onClose }: { target: ContributeTarget | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.participation");
  const title = target?.feesOnly ? t("payFees") : t("contribute");
  return (
    <Modal open={!!target} onOpenChange={(o) => !o && onClose()} title={target?.memberName ? `${title} · ${target.memberName}` : title} className="max-w-xl">
      {target && <ContributeBody key={`${target.id}-${!!target.feesOnly}`} target={target} onClose={onClose} />}
    </Modal>
  );
}

function ContributeBody({ target, onClose }: { target: ContributeTarget; onClose: () => void }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const contribute = useContribute();
  const { data: p, isLoading } = useParticipation(target.id);
  const [amount, setAmount] = useState("");
  const [payFees, setPayFees] = useState<boolean | null>(null);
  const [payment, setPayment] = useState<MethodChoice>(emptyMethod());
  if (isLoading || !p) return <Skeleton className="h-48 w-full" />;

  const feesOnly = !!target.feesOnly;
  const feesOwed = !!p.fees?.accepts_payment;
  const savingsAllowed = !feesOnly && p.accepts_contributions;
  // Fees default on when they are owed: most members pay them with their first contribution.
  const withFees = feesOwed && (feesOnly || (payFees ?? true));
  const savings = savingsAllowed ? Number(amount) || 0 : 0;
  const adminFee = withFees ? Math.max(0, (p.fees?.admin_fee_due ?? 0) - (p.fees?.admin_fee_paid ?? 0)) : 0;
  const takaful = withFees ? Math.max(0, (p.fees?.takaful_fee_due ?? 0) - (p.fees?.takaful_fee_paid ?? 0)) : 0;
  const valid = (savings > 0 || withFees) && !(Number(amount) < 0) && !!payment.method;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {feesOnly ? t("payFeesHint", { amount: formatCurrency(p.fees?.outstanding ?? 0) }) : t("contributeHint", { remaining: formatCurrency(p.standing.remaining_to_eligibility) })}
      </p>
      {savingsAllowed && (
        <Field label={t("savingsAmount")} hint={withFees ? t("savingsOptional") : undefined}>
          <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
      )}
      {!feesOnly && feesOwed && (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span>
            <span className="block text-sm font-medium text-foreground">{t("includeFees", { amount: formatCurrency(p.fees?.outstanding ?? 0) })}</span>
            <span className="block text-xs text-muted-foreground">{t("includeFeesHint")}</span>
          </span>
          <Switch checked={withFees} onCheckedChange={setPayFees} />
        </label>
      )}
      {(savings > 0 || withFees) && <FeeBreakdown savings={savings} adminFee={adminFee} takaful={takaful} />}
      <MethodFields value={payment} onChange={setPayment} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!valid || contribute.isPending}
          onClick={() => contribute.mutate(
            { id: p.id, body: { amount: savings, pay_fees: withFees || undefined, payment_method: payment.method, transaction_id: payment.reference.trim() || undefined } },
            { onSuccess: () => { toast({ title: savings > 0 ? t("contributed") : t("feesRecorded"), description: t("awaitingConfirmation") }); onClose(); }, onError },
          )}>
          {contribute.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {feesOnly ? t("payFees") : t("contribute")}
        </Button>
      </div>
    </div>
  );
}
