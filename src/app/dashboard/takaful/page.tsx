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
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  useTakaful,
  useTakafulBalance,
  useDistributeSurplus,
  useSubmitTakafulClaim,
  useRefundTakaful,
} from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { TakafulTxn } from "@/types/ekub";

const typeBadge: Record<string, string> = {
  contribution: "bg-success/15 text-success",
  claim: "bg-warning/15 text-warning",
  surplus: "bg-info/15 text-info",
  refund: "bg-muted text-muted-foreground",
};

function TakafulInner() {
  const t = useTranslations("takaful");
  const tc = useTranslations("common");
  const { activeGroupName } = useEqubStore();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.PAYOUT_APPROVE) || has(EKUB_PERMS.TIER_MANAGE);

  const { data: txns, isLoading } = useTakaful();
  const { data: balance } = useTakafulBalance();
  const distribute = useDistributeSurplus();
  const claim = useSubmitTakafulClaim();
  const refund = useRefundTakaful();

  const [claiming, setClaiming] = useState(false);
  const [claimForm, setClaimForm] = useState({ memberId: "", amount: 0, reason: "" });
  const [refunding, setRefunding] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const err = (e: unknown) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" });

  const columns: DataTableColumn<TakafulTxn>[] = [
    { id: "member", header: t("member"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.memberHandle}</span> },
    { id: "type", header: t("type"), mobile: "badge", cell: (r) => <Badge className={`capitalize ${typeBadge[r.type] ?? "bg-muted text-muted-foreground"}`}>{r.type}</Badge> },
    { id: "amount", header: t("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "ref", header: t("reference"), mobile: "detail", cell: (r) => <span className="text-sm">{r.reference}</span> },
    { id: "date", header: tc("date"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDateTime(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={activeGroupName ? `${t("subtitle")} · ${activeGroupName}` : t("subtitle")}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setClaimForm({ memberId: "", amount: 0, reason: "" }); setClaiming(true); }}>
                <Plus size={15} className="mr-1" /> {t("claim")}
              </Button>
              <Button variant="outline" onClick={() => { setRefundReason(""); setRefunding(true); }}>
                <Undo2 size={15} className="mr-1" /> {t("refund")}
              </Button>
              <Button onClick={() => distribute.mutate(undefined, { onSuccess: () => toast({ title: t("distribute") }), onError: err })}>
                <Gift size={15} className="mr-1" /> {t("distribute")}
              </Button>
            </div>
          ) : undefined
        }
      />

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
          <div className="space-y-1.5"><Label>{t("member")}</Label><Input value={claimForm.memberId} onChange={(e) => setClaimForm({ ...claimForm, memberId: e.target.value })} placeholder="member id" /></div>
          <div className="space-y-1.5"><Label>{t("amount")}</Label><Input type="number" value={claimForm.amount} onChange={(e) => setClaimForm({ ...claimForm, amount: Number(e.target.value) || 0 })} /></div>
          <div className="space-y-1.5"><Label>{t("reason")}</Label><Input value={claimForm.reason} onChange={(e) => setClaimForm({ ...claimForm, reason: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClaiming(false)}>{tc("cancel")}</Button>
            <Button disabled={!claimForm.memberId || !claimForm.amount || claim.isPending} onClick={() => claim.mutate(claimForm, { onSuccess: () => { toast({ title: t("claim") }); setClaiming(false); }, onError: err })}>{tc("submit")}</Button>
          </div>
        </div>
      </Modal>

      {/* Refund */}
      <Modal open={refunding} onOpenChange={setRefunding} title={t("refund")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("reason")}</Label><Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefunding(false)}>{tc("cancel")}</Button>
            <Button disabled={!refundReason || refund.isPending} onClick={() => refund.mutate(refundReason, { onSuccess: () => { toast({ title: t("refund") }); setRefunding(false); }, onError: err })}>{tc("confirm")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function TakafulPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYOUT_READ, EKUB_PERMS.TIER_READ]}>
      <TakafulInner />
    </RequirePermission>
  );
}
