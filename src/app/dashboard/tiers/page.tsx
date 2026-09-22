"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Layers, Pencil, Info, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useTiers, useSaveTier, useCreateTier, useDeleteTier } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { Tier } from "@/types/ekub";

function TiersInner() {
  const t = useTranslations("tiers");
  const { data, isLoading } = useTiers();
  const save = useSaveTier();
  const create = useCreateTier();
  const del = useDeleteTier();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.TIER_MANAGE);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [isNew, setIsNew] = useState(false);

  const cycleWeeks = (tier: Tier) => Math.ceil(tier.groupSize / tier.winnersPerDraw);

  const blankTier = (): Tier => ({
    id: "", name: "", contribution: 1000, serviceFee: 50, participationFee: 40,
    groupSize: 200, winnersPerDraw: 7, fixedPayout: 200000,
    contributionCadence: "daily", drawCadence: "weekly", tabarruPercent: 1, requiresProperty: false,
  });

  const onSave = () => {
    if (!editing) return;
    const mut = isNew ? create : save;
    mut.mutate(editing, {
      onSuccess: () => {
        toast({ title: isNew ? "Created" : "Saved", description: editing.name });
        setEditing(null);
        setIsNew(false);
      },
      onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
    });
  };

  const onDelete = (tier: Tier) =>
    del.mutate(tier.id, {
      onSuccess: () => toast({ title: "Deleted", description: tier.name }),
      onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
    });

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage ? (
            <Button onClick={() => { setEditing(blankTier()); setIsNew(true); }}>
              <Plus size={16} className="mr-1" /> {t("createTier")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("advanceNote")}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {isLoading || !data
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)
          : data.map((tier) => (
              <Card key={tier.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Layers size={20} />
                      </span>
                      <h3 className="font-bold text-foreground">{tier.name}</h3>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(tier); setIsNew(false); }}>
                          <Pencil size={15} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(tier)}>
                          <Trash2 size={15} className="text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">{t("fixedPayout")}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(tier.fixedPayout)}</p>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <Row label={t("contribution")} value={formatCurrency(tier.contribution)} />
                    <Row label={t("serviceFee")} value={formatCurrency(tier.serviceFee)} />
                    <Row label={t("participationFee")} value={formatCurrency(tier.participationFee)} />
                    <Row
                      label={t("totalPerRound")}
                      value={formatCurrency(tier.contribution + tier.serviceFee + tier.participationFee)}
                      strong
                    />
                    <Row label={t("groupSize")} value={String(tier.groupSize)} />
                    <Row label={t("winnersPerDraw")} value={String(tier.winnersPerDraw)} />
                    <Row label={t("contributionCadence")} value={t(tier.contributionCadence)} />
                    <Row label={t("drawCadence")} value={t(tier.drawCadence)} />
                    <Row label={t("tabarruPercent")} value={`${tier.tabarruPercent}%`} />
                    <Row label={t("cycleLength")} value={`≈ ${cycleWeeks(tier)} ${t("weeks")}`} />
                  </dl>
                </CardContent>
              </Card>
            ))}
      </div>

      <Modal open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setIsNew(false); } }} title={isNew ? t("createTier") : t("editTier")} className="max-w-lg">
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("name")} className="col-span-2">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label={t("contribution")}>
              <Input type="number" value={editing.contribution} onChange={(e) => setEditing({ ...editing, contribution: num(e.target.value) })} />
            </Field>
            <Field label={t("serviceFee")}>
              <Input type="number" value={editing.serviceFee} onChange={(e) => setEditing({ ...editing, serviceFee: num(e.target.value) })} />
            </Field>
            <Field label={t("participationFee")}>
              <Input type="number" value={editing.participationFee} onChange={(e) => setEditing({ ...editing, participationFee: num(e.target.value) })} />
            </Field>
            <Field label={t("fixedPayout")}>
              <Input type="number" value={editing.fixedPayout} onChange={(e) => setEditing({ ...editing, fixedPayout: num(e.target.value) })} />
            </Field>
            <Field label={t("groupSize")}>
              <Input type="number" value={editing.groupSize} onChange={(e) => setEditing({ ...editing, groupSize: num(e.target.value) })} />
            </Field>
            <Field label={t("winnersPerDraw")}>
              <Input type="number" value={editing.winnersPerDraw} onChange={(e) => setEditing({ ...editing, winnersPerDraw: num(e.target.value) })} />
            </Field>
            <Field label={t("tabarruPercent")}>
              <Input type="number" value={editing.tabarruPercent} onChange={(e) => setEditing({ ...editing, tabarruPercent: num(e.target.value) })} />
            </Field>
            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</Button>
              <Button onClick={onSave} disabled={save.isPending || create.isPending}>
                {save.isPending || create.isPending ? "…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-bold text-foreground" : "font-medium text-foreground"}>{value}</dd>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function TiersPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.TIER_READ]}>
      <TiersInner />
    </RequirePermission>
  );
}
