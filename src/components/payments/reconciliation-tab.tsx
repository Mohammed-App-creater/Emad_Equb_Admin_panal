"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Eye } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirmPayment, useEqubs, useFeeLedger, useRounds } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import type { FeeLedgerLine } from "@/types/ekub";
import { PaymentDetailModal, type PaymentRef } from "@/components/payments/payment-detail-modal";

/**
 * Collected vs deposited, one row per Equb per round, from the live SACCO fee
 * ledger. "Total collected" is every contribution staff recorded; "Deposited"
 * is what has been confirmed into the account. The variance is what is still
 * waiting for confirmation. Click a row to see its members.
 */
interface ReconRow {
  key: string;
  equbId: string;
  equbName: string;
  roundId: string;
  roundNumber: number;
  scheduledAt: string;
  expected: number;
  collected: number;
  deposited: number;
  variance: number;
  lines: FeeLedgerLine[];
}

const isRecorded = (l: FeeLedgerLine) => l.collected || !!l.paymentId;

export function ReconciliationTab() {
  const t = useTranslations("reconciliation");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { has } = useEkubAccess();
  const canConfirm = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);

  const [equbId, setEqubId] = useState("all");
  const [roundId, setRoundId] = useState("all");
  const [open, setOpen] = useState<ReconRow | null>(null);

  const { data: equbs, isLoading: equbsLoading } = useEqubs();
  const { data: rounds, isLoading: roundsLoading } = useRounds(equbId === "all" ? "" : equbId);
  const { data: ledger, isLoading } = useFeeLedger(
    { equbId: equbId === "all" ? undefined : equbId, roundId: roundId === "all" ? undefined : roundId },
    1,
    1000
  );
  const confirm = useConfirmPayment();

  const byKey = new Map<string, ReconRow>();
  for (const l of ledger?.items ?? []) {
    const key = `${l.equbId}:${l.roundId}`;
    const row = byKey.get(key) ?? { key, equbId: l.equbId, equbName: l.equbName, roundId: l.roundId, roundNumber: l.roundNumber, scheduledAt: l.scheduledAt, expected: 0, collected: 0, deposited: 0, variance: 0, lines: [] };
    row.expected += l.total;
    if (isRecorded(l)) row.collected += l.total;
    if (l.collected) row.deposited += l.total;
    row.lines.push(l);
    byKey.set(key, row);
  }
  const rows = [...byKey.values()]
    .map((r) => ({ ...r, variance: r.collected - r.deposited }))
    .filter((r) => r.collected > 0)
    .sort((a, b) => a.equbName.localeCompare(b.equbName) || b.roundNumber - a.roundNumber);
  // Keep the open drill-down in sync after a confirmation refetches the ledger.
  const openRow = open ? rows.find((r) => r.key === open.key) ?? open : null;

  const columns: DataTableColumn<ReconRow>[] = [
    { id: "equb", sortValue: (r) => r.equbName, header: t("equb"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.equbName}</span> },
    { id: "round", sortValue: (r) => r.roundNumber, header: t("round"), mobile: "detail", cell: (r) => <span className="text-sm">#{r.roundNumber} <span className="text-xs text-muted-foreground">· {formatDate(r.scheduledAt)}</span></span> },
    { id: "collected", sortValue: (r) => r.collected, header: t("totalCollected"), mobile: "detail", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r.collected)}</span> },
    { id: "deposited", sortValue: (r) => r.deposited, header: t("deposited"), mobile: "detail", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r.deposited)}</span> },
    { id: "variance", sortValue: (r) => r.variance, header: t("variance"), mobile: "detail", align: "right", cell: (r) => <span className={cn("font-medium tabular-nums", r.variance > 0 ? "text-destructive" : "text-success")}>{formatCurrency(r.variance)}</span> },
    { id: "status", sortValue: (r) => (r.variance > 0 ? 1 : 0), header: tc("status"), mobile: "badge", cell: (r) => <Badge className={r.variance > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}>{r.variance > 0 ? t("pending") : t("reconciled")}</Badge> },
    { id: "open", header: "", align: "right", cell: () => <ChevronRight size={16} className="text-muted-foreground" /> },
  ];

  const [viewing, setViewing] = useState<PaymentRef | null>(null);
  const statusOf = (l: FeeLedgerLine) => (l.collected ? "deposited" : l.paymentId ? "pending" : "unpaid");

  return (
    <>
      <DataTable
        filters={{
          search: { keys: (r) => [r.equbName, `#${r.roundNumber}`] },
          facets: [{ id: "status", label: tc("status"), get: (r) => (r.variance > 0 ? "pending" : "reconciled"), options: [{ value: "reconciled", label: t("reconciled") }, { value: "pending", label: t("pending") }] }],
          extra: (
            <div className="flex flex-wrap gap-2">
              <Select value={equbId} onValueChange={(v) => { setEqubId(v); setRoundId("all"); }}>
                <SelectTrigger className="h-9 sm:w-55"><span className="truncate"><span className="text-muted-foreground">{t("equb")}: </span><SelectValue /></span></SelectTrigger>
                <SelectContent loading={equbsLoading}>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {(equbs ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={roundId} onValueChange={setRoundId} disabled={equbId === "all"}>
                <SelectTrigger className="h-9 sm:w-45"><span className="truncate"><span className="text-muted-foreground">{t("round")}: </span><SelectValue /></span></SelectTrigger>
                <SelectContent loading={roundsLoading} empty={!rounds?.length}>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {[...(rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber).map((r) => <SelectItem key={r.id} value={r.id}>#{r.roundNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ),
        }}
        columns={columns}
        data={rows}
        rowKey={(r) => r.key}
        isLoading={isLoading}
        onRowClick={(r) => setOpen(r)}
        emptyTitle={tc("noData")}
      />

      <Modal open={!!openRow} onOpenChange={(o) => !o && setOpen(null)} title={openRow ? `${openRow.equbName} · #${openRow.roundNumber}` : ""} className="max-w-3xl">
        {openRow && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: t("totalCollected"), value: openRow.collected, tone: "" },
                { label: t("deposited"), value: openRow.deposited, tone: "text-success" },
                { label: t("variance"), value: openRow.variance, tone: openRow.variance > 0 ? "text-destructive" : "text-success" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={cn("text-lg font-bold tabular-nums", m.tone)}>{formatCurrency(m.value)}</p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">{t("member")}</th>
                  <th className="py-2 text-right font-medium">{t("amount")}</th>
                  <th className="py-2 font-medium">{tc("status")}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {openRow.lines.map((l) => {
                  const s = statusOf(l);
                  return (
                    <tr key={l.contributionId} className="border-b border-border/60 last:border-0">
                      <td className="py-2">
                        <p className="font-medium text-foreground">{l.memberName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{l.membershipNumber}{l.isCatchUp ? ` · ${t("catchUp")}` : ""}</p>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(l.total)}</td>
                      <td className="py-2">
                        <Badge className={s === "deposited" ? "bg-success/15 text-success" : s === "pending" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}>{t(`line_${s}` as never)}</Badge>
                      </td>
                      <td className="flex items-center justify-end gap-1 py-2">
                        {l.paymentId && (
                          <Button size="sm" variant="ghost" title={tc("viewDetails")} onClick={() => setViewing({ paymentId: l.paymentId, memberId: l.memberId, equbId: l.equbId, memberName: l.memberName })}>
                            <Eye size={14} />
                          </Button>
                        )}
                        {s === "pending" && canConfirm && (
                          <Button
                            size="sm"
                            disabled={confirm.isPending}
                            onClick={() => confirm.mutate({ equbId: l.equbId, paymentId: l.paymentId }, { onSuccess: () => toast({ title: t("confirmed"), description: l.memberName }), onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }) })}
                          >
                            <Check size={14} className="mr-1" /> {t("confirm")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
      <PaymentDetailModal payment={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
