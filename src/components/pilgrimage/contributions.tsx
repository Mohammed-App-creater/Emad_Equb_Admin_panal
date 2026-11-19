"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { emptyPayment, Field, PaymentFields, paymentBody, useErrorToast, type PaymentChoice } from "@/components/pilgrimage/shared";
import { useContribute, useContributions } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";

/** What the contribute modal needs to know about a registration. */
export interface ContributeTarget {
  id: string;
  memberName?: string;
  remainingToEligibility: number;
}

type ContributionRow = { id: string; amount: number; status: string; payment_type: string; payment_method: string; reference_number?: string; created_at: string };

const tones: Record<string, string> = {
  completed: "text-success",
  confirmed: "text-success",
  paid: "text-success",
  pending: "text-warning",
  processing: "text-info",
  failed: "text-destructive",
  rejected: "text-destructive",
};

/**
 * Payments on one registration's saving contract: contributions in,
 * withdrawals and Mudarabah transfers out. The contract outlives a single
 * cycle, so this is the member's whole history.
 */
export function ContributionHistory({ id, bare, pageSize = 10 }: { id: string; bare?: boolean; pageSize?: number }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useContributions(id, page, pageSize);
  const columns: DataTableColumn<ContributionRow>[] = [
    { id: "date", header: tc("date"), mobile: "title", cell: (r) => <span className="text-sm">{formatDateTime(r.created_at)}</span> },
    { id: "type", header: t("type"), mobile: "detail", cell: (r) => <span className="text-sm">{t.has(`paymentType_${r.payment_type}` as never) ? t(`paymentType_${r.payment_type}` as never) : r.payment_type.replace(/_/g, " ")}</span> },
    { id: "method", header: t("method"), mobile: "detail", cell: (r) => <span className="text-sm capitalize">{r.payment_method?.replace(/_/g, " ") || "—"}</span> },
    { id: "ref", header: t("reference"), mobile: "detail", cell: (r) => <span className="font-mono text-xs">{r.reference_number || "—"}</span> },
    { id: "amount", header: tc("amount"), align: "right", mobile: "detail", cell: (r) => (
      <span className={r.payment_type === "savings_deposit" ? "tabular-nums" : "tabular-nums text-destructive"}>
        {r.payment_type === "savings_deposit" ? "" : "−"}{formatCurrency(r.amount)}
      </span>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <span className={`text-xs font-medium capitalize ${tones[r.status?.toLowerCase()] ?? ""}`}>{r.status}</span> },
  ];
  return (
    <DataTable
      bare={bare}
      columns={columns}
      data={data?.items ?? []}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      skeletonRows={3}
      emptyTitle={tc("noData")}
      emptyMessage={t("noContributions")}
      pagination={{ page, pageSize, total: data?.meta.total ?? 0, onPageChange: setPage }}
    />
  );
}

/** Records a contribution: a deposit on the member's own saving contract, credited when accounting confirms it. */
export function ContributeModal({ target, onClose }: { target: ContributeTarget | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const contribute = useContribute();
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<PaymentChoice>(emptyPayment());
  const close = () => { setAmount(""); setPayment(emptyPayment()); onClose(); };
  const valid = Number(amount) > 0 && !!payment.method && !!payment.accountId;
  return (
    <Modal open={!!target} onOpenChange={(o) => !o && close()} title={target?.memberName ? `${t("contribute")} · ${target.memberName}` : t("contribute")} className="max-w-xl">
      {target && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("contributeHint", { remaining: formatCurrency(target.remainingToEligibility) })}</p>
          <Field label={tc("amount")}>
            <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
          <PaymentFields value={payment} onChange={setPayment} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
            <Button disabled={!valid || contribute.isPending}
              onClick={() => {
                const pay = paymentBody(payment);
                contribute.mutate(
                  { id: target.id, body: { amount: Number(amount), payment_method: pay.payment_method!, payment_account_id: pay.payment_account_id, transaction_id: pay.transaction_id } },
                  { onSuccess: () => { toast({ title: t("contributed"), description: t("awaitingConfirmation") }); close(); }, onError },
                );
              }}>
              {contribute.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("contribute")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
