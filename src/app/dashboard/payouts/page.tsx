"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Check, HandCoins, Upload, ShieldAlert, Heart, Info } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  usePayouts,
  useHardship,
  useApprovePackage,
  useReleasePayout,
  useAttachTitle,
} from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { Payout, PayoutStatus, Guarantor } from "@/types/ekub";

const statusBadge: Record<PayoutStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-info/15 text-info",
  released: "bg-success/15 text-success",
};

function PayoutsInner() {
  const t = useTranslations("payouts");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canApprove = has(EKUB_PERMS.PAYOUT_APPROVE);

  const { data: payouts, isLoading } = usePayouts();
  const { data: hardship } = useHardship();
  const approve = useApprovePackage();
  const release = useReleasePayout();
  const attach = useAttachTitle();

  const [selected, setSelected] = useState<Payout | null>(null);

  const statusLabel = (s: PayoutStatus) =>
    s === "pending" ? t("statusPending") : s === "approved" ? t("statusApproved") : t("statusReleased");

  const err = (e: unknown) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" });

  const columns: DataTableColumn<Payout>[] = [
    { id: "winner", header: t("winner"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.winnerHandle}</p>
        <p className="text-xs text-muted-foreground">{r.ekubNumber}</p>
      </div>
    ) },
    { id: "amount", header: t("payoutAmount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "collateral", header: t("collateral"), mobile: "detail", cell: (r) =>
      r.requiresProperty ? (
        <Badge className={r.propertyTitleUrl ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
          {t("collateralProperty")}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground capitalize">{r.primaryGuarantor?.collateralType.replace("_", " ")}</span>
      ),
    },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <Badge className={statusBadge[r.status]}>{statusLabel(r.status)}</Badge> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("requiresProperty")} · {t("slaTarget")}</span>
      </div>

      <DataTable
        columns={columns}
        data={payouts ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        actions={[{ label: tc("view"), icon: Eye, onClick: (r) => setSelected(r) }]}
        renderLeadingActions={(r) => {
          if (!canApprove) return null;
          if (r.status === "pending")
            return (
              <Button size="sm" onClick={() => approve.mutate(r.id, { onSuccess: () => toast({ title: t("statusApproved") }), onError: err })}>
                <Check size={14} className="mr-1" /> {t("approvePackage")}
              </Button>
            );
          if (r.status === "approved")
            return (
              <Button size="sm" onClick={() => release.mutate(r.id, { onSuccess: () => toast({ title: t("statusReleased") }), onError: err })}>
                <HandCoins size={14} className="mr-1" /> {t("releasePayout")}
              </Button>
            );
          return null;
        }}
      />

      {/* Hardship early-turn requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart size={18} className="text-secondary-foreground" /> {t("hardship")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-primary" /> {t("hardshipNote")}
          </p>
          {(hardship ?? []).map((h) => {
            const pct = Math.round((h.consentReceived / h.consentRequired) * 100);
            return (
              <div key={h.id} className="rounded-2xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{h.memberHandle}</p>
                    <p className="text-xs capitalize text-muted-foreground">{h.reason.replace("_", " ")} · {h.ekubNumber}</p>
                  </div>
                  <Badge className="bg-info/15 text-info capitalize">{h.status}</Badge>
                </div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {t("consentProgress")}: {h.consentReceived}/{h.consentRequired}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Modal open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected?.winnerHandle} className="max-w-2xl">
        {selected && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="rounded-2xl bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">{t("payoutAmount")}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(selected.amount)}</p>
            </div>

            <GuarantorCard title={t("primaryGuarantor")} g={selected.primaryGuarantor} />
            {selected.backupGuarantor && <GuarantorCard title={t("backupGuarantor")} g={selected.backupGuarantor} />}

            {selected.requiresProperty && (
              <div className="rounded-2xl border border-border p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">{t("collateralProperty")}</p>
                {selected.propertyTitleUrl ? (
                  <Badge className="bg-success/15 text-success">✓ {t("collateralProperty")}</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => attach.mutate(selected.id, { onSuccess: () => { toast({ title: "Uploaded" }); setSelected(null); } })}>
                    <Upload size={14} className="mr-1" /> {t("collateralProperty")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function GuarantorCard({ title, g }: { title: string; g?: Guarantor }) {
  if (!g) return null;
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Field label="Name" value={g.fullName} />
        <Field label="Fayda ID" value={g.faydaId} />
        <Field label="Phone" value={g.phone} />
        <Field label="Relationship" value={g.relationship} />
        <Field label="Collateral" value={g.collateralType.replace("_", " ")} />
        <Field label="Consent" value={g.consentSigned ? "Signed" : "Pending"} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize text-foreground">{value}</p>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYOUT_READ]}>
      <PayoutsInner />
    </RequirePermission>
  );
}
