"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Check, X, HandCoins, Upload, ShieldAlert, Heart, Info, FileSignature, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useCreateGuarantee,
  useApproveGuarantee,
  useRejectGuarantee,
  useDecideHardship,
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
  const createGuarantee = useCreateGuarantee();
  const approveGuarantee = useApproveGuarantee();
  const rejectGuarantee = useRejectGuarantee();
  const decideHardship = useDecideHardship();

  const [selected, setSelected] = useState<Payout | null>(null);
  // Guarantee ids returned this session, keyed by payout/winner id.
  const [guaranteeIds, setGuaranteeIds] = useState<Record<string, string>>({});
  const [guaranteeFor, setGuaranteeFor] = useState<Payout | null>(null);
  const [gForm, setGForm] = useState({ guaranteeType: "personal", guarantorName: "", collateralType: "check", collateralReference: "", collateralValue: 0 });

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
          const gid = guaranteeIds[r.id];
          if (r.status === "pending")
            return (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => { setGuaranteeFor(r); setGForm({ guaranteeType: "personal", guarantorName: "", collateralType: r.requiresProperty ? "house_title" : "check", collateralReference: "", collateralValue: 0 }); }}>
                  <FileSignature size={14} className="mr-1" /> {t("submitGuarantee")}
                </Button>
                {gid && (
                  <>
                    <Button size="sm" onClick={() => approveGuarantee.mutate(gid, { onSuccess: () => toast({ title: t("statusApproved") }), onError: err })}>
                      <ThumbsUp size={14} className="mr-1" /> {t("approveGuarantee")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectGuarantee.mutate({ guaranteeId: gid, note: "rejected" }, { onSuccess: () => toast({ title: tc("reject") }), onError: err })}>
                      <X size={14} />
                    </Button>
                  </>
                )}
                {/* Mock convenience: single-step package approve when no guarantee flow is used */}
                <Button size="sm" onClick={() => approve.mutate(r.id, { onSuccess: () => toast({ title: t("statusApproved") }), onError: err })}>
                  <Check size={14} className="mr-1" /> {t("approvePackage")}
                </Button>
              </div>
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{h.memberHandle}</p>
                    <p className="text-xs capitalize text-muted-foreground">{h.reason.replace("_", " ")} · {h.ekubNumber}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-info/15 text-info capitalize">{h.status}</Badge>
                    {canApprove && (h.status === "requested" || h.status === "proposed") && (
                      <>
                        <Button size="sm" onClick={() => decideHardship.mutate({ id: h.id, decision: "approve" }, { onSuccess: () => toast({ title: tc("approve") }), onError: err })}>
                          <Check size={13} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decideHardship.mutate({ id: h.id, decision: "reject", note: "rejected" }, { onSuccess: () => toast({ title: tc("reject") }), onError: err })}>
                          <X size={13} />
                        </Button>
                      </>
                    )}
                  </div>
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

      {/* Submit guarantee */}
      <Modal open={!!guaranteeFor} onOpenChange={(o) => !o && setGuaranteeFor(null)} title={t("submitGuarantee")} className="max-w-md">
        {guaranteeFor && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("guaranteeType")}</Label>
              <Select value={gForm.guaranteeType} onValueChange={(v) => setGForm({ ...gForm, guaranteeType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">personal</SelectItem>
                  <SelectItem value="collateral">collateral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("guarantorName")}</Label><Input value={gForm.guarantorName} onChange={(e) => setGForm({ ...gForm, guarantorName: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>{t("collateralType")}</Label>
              <Select value={gForm.collateralType} onValueChange={(v) => setGForm({ ...gForm, collateralType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">check</SelectItem>
                  <SelectItem value="vehicle">vehicle</SelectItem>
                  <SelectItem value="house_title">house_title</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("collateralRef")}</Label><Input value={gForm.collateralReference} onChange={(e) => setGForm({ ...gForm, collateralReference: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("collateralValue")}</Label><Input type="number" value={gForm.collateralValue} onChange={(e) => setGForm({ ...gForm, collateralValue: Number(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGuaranteeFor(null)}>{tc("cancel")}</Button>
              <Button
                disabled={!gForm.guarantorName || createGuarantee.isPending}
                onClick={() =>
                  createGuarantee.mutate(
                    { winnerId: guaranteeFor.id, ...gForm },
                    {
                      onSuccess: (id) => { setGuaranteeIds((m) => ({ ...m, [guaranteeFor.id]: String(id) })); toast({ title: t("submitGuarantee") }); setGuaranteeFor(null); },
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
