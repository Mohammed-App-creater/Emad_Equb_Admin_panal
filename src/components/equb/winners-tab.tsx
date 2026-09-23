"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, HandCoins, FileSignature, ThumbsUp, Info } from "lucide-react";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/equb/status-badge";
import {
  useEqubWinners,
  useCreateGuarantee,
  useApproveGuarantee,
  useRejectGuarantee,
  useProcessPayout,
} from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";
import type { Equb, GuaranteeInput, Winner } from "@/types/ekub";

const blankGuarantee: GuaranteeInput = { guaranteeType: "member", guarantorName: "", guarantorMemberId: "", collateralType: "", collateralReference: "", collateralValue: 0 };

interface TableProps {
  equbId: string;
  /** Set when the table is scoped to one round (round detail page). */
  roundId?: string;
  winners: Winner[];
  isLoading?: boolean;
  /** Hide the round column when every row is from the same round. */
  hideRound?: boolean;
}

/**
 * Winners with their guarantee + payout workflow. Shared by the Equb-level
 * "Winners & Payouts" tab and the round detail page.
 */
export function WinnersTable({ equbId, roundId, winners, isLoading, hideRound }: TableProps) {
  const t = useTranslations("payouts");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canApprove = has(EKUB_PERMS.PAYOUT_APPROVE);

  const createGuarantee = useCreateGuarantee();
  const approveGuarantee = useApproveGuarantee();
  const rejectGuarantee = useRejectGuarantee();
  const processPayout = useProcessPayout();

  // The winners list doesn't carry the guarantee id, so remember the ones
  // created in this session to offer approve / reject right away.
  const [guaranteeIds, setGuaranteeIds] = useState<Record<string, string>>({});
  const [guaranteeFor, setGuaranteeFor] = useState<Winner | null>(null);
  const [gForm, setGForm] = useState<GuaranteeInput>(blankGuarantee);
  const [rejecting, setRejecting] = useState<Winner | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [paying, setPaying] = useState<Winner | null>(null);

  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
  const scope = { equbId, roundId };

  const columns: DataTableColumn<Winner>[] = [
    { id: "winner", header: t("winner"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.membershipNumber}{r.phone ? ` · ${r.phone}` : ""}</p>
      </div>
    ) },
    ...(hideRound ? [] : [{ id: "round", header: t("round"), mobile: "detail" as const, cell: (r: Winner) => <span className="text-sm">{r.roundNumber != null ? `#${r.roundNumber}` : "—"}</span> }]),
    { id: "position", header: "#", mobile: "detail", align: "center", cell: (r) => <span className="text-sm text-muted-foreground">{r.position}</span> },
    { id: "amount", header: t("payoutAmount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.payoutAmount)}</span> },
    { id: "guarantee", header: t("guaranteeStatus"), mobile: "detail", cell: (r) => (
      <Badge className={`capitalize ${r.guaranteeStatus === "approved" ? "bg-success/15 text-success" : r.guaranteeStatus === "rejected" ? "bg-destructive/15 text-destructive" : r.guaranteeStatus === "pending" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
        {r.guaranteeStatus.replace(/_/g, " ")}
      </Badge>
    ) },
    { id: "paidAt", header: t("paidAt"), mobile: "detail", cell: (r) => <span className="text-sm">{r.paidAt ? formatDateTime(r.paidAt) : "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="winner" /> },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={winners}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        avatar={(r) => ({ initials: getInitials(r.name), colorClass: "bg-secondary/20 text-secondary-foreground" })}
        emptyTitle={tc("noData")}
        emptyMessage={t("noWinners")}
        renderLeadingActions={(r) => {
          if (!canApprove || r.status === "paid") return null;
          const gid = guaranteeIds[r.id];
          return (
            <div className="flex flex-wrap gap-1.5">
              {r.guaranteeStatus !== "approved" && (
                <Button size="sm" variant="outline" onClick={() => { setGForm(blankGuarantee); setGuaranteeFor(r); }}>
                  <FileSignature size={14} className="mr-1" /> {t("submitGuarantee")}
                </Button>
              )}
              {gid && r.guaranteeStatus !== "approved" && (
                <>
                  <Button size="sm" onClick={() => approveGuarantee.mutate({ ...scope, guaranteeId: gid }, { onSuccess: () => toast({ title: t("approveGuarantee"), description: r.name }), onError: err })}>
                    <ThumbsUp size={14} className="mr-1" /> {t("approveGuarantee")}
                  </Button>
                  <Button size="sm" variant="outline" title={t("rejectGuarantee")} onClick={() => { setRejectNote(""); setRejecting(r); }}>
                    <X size={14} />
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => setPaying(r)}>
                <HandCoins size={14} className="mr-1" /> {t("processPayout")}
              </Button>
            </div>
          );
        }}
      />

      {/* Submit guarantee */}
      <Modal open={!!guaranteeFor} onOpenChange={(o) => !o && setGuaranteeFor(null)} title={t("submitGuarantee")} className="max-w-md">
        {guaranteeFor && (
          <div className="space-y-4">
            <p className="text-sm"><span className="font-medium text-foreground">{guaranteeFor.name}</span> · {formatCurrency(guaranteeFor.payoutAmount)}</p>
            <div className="space-y-1.5">
              <Label>{t("guaranteeType")}</Label>
              <Select value={gForm.guaranteeType} onValueChange={(v) => setGForm({ ...gForm, guaranteeType: v as GuaranteeInput["guaranteeType"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("typeMember")}</SelectItem>
                  <SelectItem value="cheque">{t("typeCheque")}</SelectItem>
                  <SelectItem value="collateral">{t("typeCollateral")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("guarantorName")}</Label><Input value={gForm.guarantorName} onChange={(e) => setGForm({ ...gForm, guarantorName: e.target.value })} /></div>
            {gForm.guaranteeType === "member" && (
              <div className="space-y-1.5"><Label>{t("guarantorMemberId")}</Label><Input value={gForm.guarantorMemberId} onChange={(e) => setGForm({ ...gForm, guarantorMemberId: e.target.value })} /></div>
            )}
            {gForm.guaranteeType !== "member" && (
              <>
                <div className="space-y-1.5"><Label>{t("collateralType")}</Label><Input value={gForm.collateralType} onChange={(e) => setGForm({ ...gForm, collateralType: e.target.value })} placeholder={gForm.guaranteeType === "cheque" ? "cheque" : "house_title / vehicle"} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>{t("collateralRef")}</Label><Input value={gForm.collateralReference} onChange={(e) => setGForm({ ...gForm, collateralReference: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("collateralValue")}</Label><Input type="number" value={gForm.collateralValue || ""} onChange={(e) => setGForm({ ...gForm, collateralValue: Number(e.target.value) || 0 })} /></div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGuaranteeFor(null)}>{tc("cancel")}</Button>
              <Button
                disabled={!gForm.guarantorName || createGuarantee.isPending}
                onClick={() =>
                  createGuarantee.mutate(
                    { ...scope, winnerId: guaranteeFor.id, input: gForm },
                    {
                      onSuccess: (g) => { setGuaranteeIds((m) => ({ ...m, [guaranteeFor.id]: g.id })); toast({ title: t("guaranteeCreated"), description: guaranteeFor.name }); setGuaranteeFor(null); },
                      onError: err,
                    }
                  )
                }
              >
                {tc("submit")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject guarantee */}
      <Modal open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} title={t("rejectGuarantee")} className="max-w-md">
        {rejecting && (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t("rejectNote")}</Label><Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejecting(null)}>{tc("cancel")}</Button>
              <Button
                variant="destructive"
                disabled={!rejectNote || rejectGuarantee.isPending}
                onClick={() => rejectGuarantee.mutate({ ...scope, guaranteeId: guaranteeIds[rejecting.id], note: rejectNote }, { onSuccess: () => { toast({ title: t("rejectGuarantee") }); setRejecting(null); }, onError: err })}
              >
                {tc("reject")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Process payout (confirm) */}
      <Modal open={!!paying} onOpenChange={(o) => !o && setPaying(null)} title={t("processPayout")} className="max-w-md">
        {paying && (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t("confirmPayout", { amount: formatCurrency(paying.payoutAmount), name: paying.name })}</p>
            <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0 text-primary" /> {t("slaTarget")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaying(null)}>{tc("cancel")}</Button>
              <Button
                disabled={processPayout.isPending}
                onClick={() => processPayout.mutate({ ...scope, winnerId: paying.id }, { onSuccess: () => { toast({ title: t("statusPaid"), description: paying.name }); setPaying(null); }, onError: err })}
              >
                <Check size={14} className="mr-1" /> {tc("confirm")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Equb-level tab: winners across every drawn round. */
export function WinnersTab({ equb }: { equb: Equb }) {
  const t = useTranslations("payouts");
  const { data, isLoading } = useEqubWinners(equb.id);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("subtitle")} · {t("slaTarget")}</span>
      </div>
      <WinnersTable equbId={equb.id} winners={data ?? []} isLoading={isLoading} />
    </div>
  );
}
