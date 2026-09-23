"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PiggyBank, Gift, Undo2, Plus, Info } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/shared";
import {
  useEqubMembers,
  useTakaful,
  useTakafulBalance,
  useDistributeSurplus,
  useSubmitTakafulClaim,
  useRefundTakaful,
} from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";
import type { Equb, TakafulSettlement, TakafulTxn } from "@/types/ekub";

const typeBadge: Record<string, string> = {
  contribution: "bg-success/15 text-success",
  claim: "bg-warning/15 text-warning",
  surplus: "bg-info/15 text-info",
  refund: "bg-muted text-muted-foreground",
};

/** Takaful (tabarru') fund of one Equb: balance, ledger, claim / refund / surplus. */
export function TakafulTab({ equb }: { equb: Equb }) {
  const t = useTranslations("takaful");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.PAYOUT_APPROVE) || has(EKUB_PERMS.EQUB_MANAGE);

  const { data: txns, isLoading } = useTakaful(equb.id);
  const { data: balance } = useTakafulBalance(equb.id);
  const { data: members } = useEqubMembers(equb.id);
  const distribute = useDistributeSurplus();
  const claim = useSubmitTakafulClaim();
  const refund = useRefundTakaful();

  const [claiming, setClaiming] = useState(false);
  const [claimForm, setClaimForm] = useState({ memberId: "", amount: 0, reason: "" });
  const [refunding, setRefunding] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [distributing, setDistributing] = useState(false);

  const memberName = (id: string) => members?.find((m) => m.memberId === id)?.name ?? id;
  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
  const settled = (s: TakafulSettlement) =>
    toast({ title: t("settlementDone"), description: `${t("total")}: ${formatCurrency(s.totalAmount)} · ${t("remaining")}: ${formatCurrency(s.remainingBalance)}` });

  const columns: DataTableColumn<TakafulTxn>[] = [
    { id: "member", header: t("member"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.memberId ? memberName(r.memberId) : "—"}</span> },
    { id: "type", header: t("type"), mobile: "badge", cell: (r) => <Badge className={`capitalize ${typeBadge[r.type] ?? "bg-muted text-muted-foreground"}`}>{r.type}</Badge> },
    { id: "amount", header: t("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "ref", header: t("reference"), mobile: "detail", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
    { id: "date", header: tc("date"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDateTime(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setClaimForm({ memberId: "", amount: 0, reason: "" }); setClaiming(true); }}>
              <Plus size={15} className="mr-1" /> {t("claim")}
            </Button>
            <Button variant="outline" onClick={() => { setRefundReason(""); setRefunding(true); }}>
              <Undo2 size={15} className="mr-1" /> {t("refund")}
            </Button>
            <Button onClick={() => setDistributing(true)}>
              <Gift size={15} className="mr-1" /> {t("distribute")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={t("balance")} value={formatCurrency(balance ?? 0)} icon={PiggyBank} tone="primary" />
        <Card className="flex items-start gap-2 p-5 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("surplusNote")}</span>
        </Card>
      </div>

      <DataTable columns={columns} data={txns ?? []} rowKey={(r) => r.id} isLoading={isLoading} emptyTitle={tc("noData")} />

      {/* Submit claim */}
      <Modal open={claiming} onOpenChange={setClaiming} title={t("claim")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("member")}</Label>
            <Select value={claimForm.memberId} onValueChange={(v) => setClaimForm({ ...claimForm, memberId: v })}>
              <SelectTrigger><SelectValue placeholder={t("member")} /></SelectTrigger>
              <SelectContent>
                {(members ?? []).map((m) => <SelectItem key={m.memberId} value={m.memberId}>#{m.position} · {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t("amount")}</Label><Input type="number" min={0} value={claimForm.amount || ""} onChange={(e) => setClaimForm({ ...claimForm, amount: Number(e.target.value) || 0 })} /></div>
          <div className="space-y-1.5"><Label>{t("reason")}</Label><Input value={claimForm.reason} onChange={(e) => setClaimForm({ ...claimForm, reason: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClaiming(false)}>{tc("cancel")}</Button>
            <Button
              disabled={!claimForm.memberId || !claimForm.amount || !claimForm.reason || claim.isPending}
              onClick={() => claim.mutate({ equbId: equb.id, ...claimForm }, { onSuccess: () => { toast({ title: t("claim") }); setClaiming(false); }, onError: err })}
            >
              {tc("submit")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refund */}
      <Modal open={refunding} onOpenChange={setRefunding} title={t("refund")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("reason")}</Label><Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefunding(false)}>{tc("cancel")}</Button>
            <Button
              disabled={!refundReason || refund.isPending}
              onClick={() => refund.mutate({ equbId: equb.id, reason: refundReason }, { onSuccess: (s) => { settled(s); setRefunding(false); }, onError: err })}
            >
              {tc("confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Distribute surplus (confirm) */}
      <Modal open={distributing} onOpenChange={setDistributing} title={t("distribute")} className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("surplusNote")}</p>
          <p className="text-sm">{t("balance")}: <strong>{formatCurrency(balance ?? 0)}</strong></p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDistributing(false)}>{tc("cancel")}</Button>
            <Button
              disabled={distribute.isPending}
              onClick={() => distribute.mutate(equb.id, { onSuccess: (s) => { settled(s); setDistributing(false); }, onError: err })}
            >
              {tc("confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
