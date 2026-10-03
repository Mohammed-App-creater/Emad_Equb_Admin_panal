"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, ImageIcon, Loader2, Paperclip, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/equb/status-badge";
import { useActiveBanks, usePaymentDetail } from "@/hooks/ekub";
import { ekubService } from "@/services/ekub";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from "@/lib/utils";
import type { ContributionAttachment } from "@/types/ekub";

const fmtSize = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

/**
 * What a caller already knows about a payment. Only `paymentId` plus a member
 * or Equb id are required; the rest is shown when given and otherwise filled
 * in from the contributions the payment covers.
 */
export interface PaymentRef {
  paymentId: string;
  memberId?: string;
  equbId?: string;
  memberName?: string;
  equbName?: string;
  categoryName?: string;
  amount?: number;
  status?: string;
  reference?: string;
  method?: string;
  /** Bank a transfer came from, when the caller already knows it. */
  bankName?: string;
  collectedAt?: string;
  collectedBy?: string;
}

/**
 * One payment in full: who paid, what it covers round by round, and the slips
 * filed as proof. Opened from every screen that lists payments.
 */
export function PaymentDetailModal({ payment, onClose }: { payment: PaymentRef | null; onClose: () => void }) {
  const t = useTranslations("paymentDetail");
  return (
    <Modal open={!!payment} onOpenChange={(o) => !o && onClose()} title={t("title")} className="max-w-2xl">
      {payment && <Body key={payment.paymentId} payment={payment} />}
    </Modal>
  );
}

function Body({ payment }: { payment: PaymentRef }) {
  const t = useTranslations("paymentDetail");
  const ta = useTranslations("attachments");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { data, isLoading } = usePaymentDetail(payment.paymentId, { memberId: payment.memberId, equbId: payment.equbId });
  const [preview, setPreview] = useState<ContributionAttachment | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const lines = data?.lines ?? [];
  const first = lines[0];
  const total = payment.amount ?? lines.reduce((a, l) => a + l.total, 0);
  const status = payment.status || (first ? (lines.every((l) => l.collected) ? "confirmed" : "pending") : "");
  const paidAt = payment.collectedAt || first?.paidAt;
  // The bank is recorded per contribution; one payment's rounds share it.
  const bankLine = lines.find((l) => l.bankName || l.bankId);
  const isBankTransfer = payment.method === "bank_transfer";
  const { data: banks } = useActiveBanks(!payment.bankName && !bankLine?.bankName && !!bankLine?.bankId);
  const bankName = payment.bankName || bankLine?.bankName || banks?.find((b) => b.id === bankLine?.bankId)?.name || "";

  const download = async (a: ContributionAttachment) => {
    setDownloading(a.id);
    try {
      const blob = await ekubService.downloadAttachment(a.contributionId, a.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.fileName || "attachment";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const facts: [string, React.ReactNode][] = [
    [t("equb"), payment.equbName || (first ? `${first.equbName}${first.equbCode ? ` · ${first.equbCode}` : ""}` : "—")],
    [t("category"), payment.categoryName || first?.categoryName || "—"],
    [t("rounds"), lines.length ? lines.map((l) => `#${l.roundNumber}`).join(", ") : "—"],
    [t("method"), payment.method ? <span className="capitalize">{payment.method.replace(/_/g, " ")}</span> : "—"],
    ...(isBankTransfer || bankName ? ([[t("bank"), bankName || "—"]] as [string, React.ReactNode][]) : []),
    [t("reference"), payment.reference || "—"],
    [t("collectedBy"), payment.collectedBy || "—"],
    [t("collectedAt"), paidAt ? formatDateTime(paidAt) : "—"],
  ];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{payment.memberName || first?.memberName || "—"}</p>
          {first?.membershipNumber && <p className="text-xs text-muted-foreground">{first.membershipNumber}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
          <div className="text-xl font-bold tabular-nums text-foreground">{isLoading && payment.amount == null ? <Skeleton className="h-6 w-24" /> : formatCurrency(total)}</div>
          {status && <StatusBadge kind="payment" status={status} />}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-border/60 pb-2 sm:block sm:border-0 sm:pb-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground sm:text-left">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Rounds covered */}
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><ReceiptText size={16} className="text-primary" /> {t("covers")}</h3>
        {isLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("noLines")}</p>
        ) : (
          <>
            {/* Mobile: one card per round */}
            <ul className="space-y-2 sm:hidden">
              {lines.map((l) => (
                <li key={l.contributionId} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t("roundNo", { n: l.roundNumber })}</span>
                    <StatusBadge kind="payment" status={l.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(l.scheduledAt)}{l.isCatchUp ? ` · ${t("catchUp")}` : ""}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">{t("contribution")}</span><span className="text-right tabular-nums">{formatCurrency(l.contribution)}</span>
                    <span className="text-muted-foreground">{t("adminFee")}</span><span className="text-right tabular-nums">{formatCurrency(l.adminFee)}</span>
                    <span className="text-muted-foreground">{t("takafulFee")}</span><span className="text-right tabular-nums">{formatCurrency(l.takafulFee)}</span>
                    <span className="font-medium text-foreground">{t("total")}</span><span className="text-right font-semibold tabular-nums">{formatCurrency(l.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("round")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("contribution")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("adminFee")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("takafulFee")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("total")}</th>
                    <th className="px-3 py-2 text-left font-medium">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.contributionId} className="border-t border-border">
                      <td className="px-3 py-2">
                        <p className="font-medium">#{l.roundNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(l.scheduledAt)}{l.isCatchUp ? ` · ${t("catchUp")}` : ""}</p>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.contribution)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.adminFee)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.takafulFee)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(l.total)}</td>
                      <td className="px-3 py-2"><StatusBadge kind="payment" status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Proof */}
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Paperclip size={16} className="text-primary" /> {ta("title")} {data && <span className="text-xs font-normal text-muted-foreground">· {data.attachments.length}</span>}
        </h3>
        {isLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : !data?.attachments.length ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("noAttachments")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <button type="button" onClick={() => setPreview(a)} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted" title={a.fileName}>
                  {a.isImage && a.fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.fileUrl} alt={a.fileName} className="h-full w-full object-cover" />
                  ) : a.isImage ? <ImageIcon size={22} className="text-muted-foreground" /> : <FileText size={22} className="text-muted-foreground" />}
                </button>
                <button type="button" onClick={() => setPreview(a)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">{a.description || a.fileName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtSize(a.fileSize)} · {formatDateTime(a.createdAt)}</p>
                </button>
                <Button size="sm" variant="ghost" title={ta("download")} disabled={downloading === a.id} onClick={() => download(a)}>
                  {downloading === a.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview?.fileName ?? ""} className="max-w-3xl">
        {preview && (
          <div className="space-y-3">
            {preview.description && <p className="text-sm text-muted-foreground">{preview.description}</p>}
            {preview.isImage && preview.fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.fileUrl} alt={preview.fileName} className="max-h-[70dvh] w-full rounded-xl object-contain" />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{ta("noPreview")}</p>
            )}
            <div className="flex justify-end">
              <Button className="w-full sm:w-auto" disabled={downloading === preview.id} onClick={() => download(preview)}>
                {downloading === preview.id ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Download size={15} className="mr-1" />} {ta("download")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
