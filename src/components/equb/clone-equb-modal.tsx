"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Repeat, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useCloneEqub } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

/**
 * Start the next cycle of a finished Equb (POST /equb/admin/groups/{id}/clone):
 * a new draft with the same terms, fee split, manager and (by default) the
 * same members. The new Equb still has to be activated with a start date.
 */
export function CloneEqubModal({ equb, onOpenChange }: { equb: Equb | null; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("equbs");
  return (
    <Modal open={!!equb} onOpenChange={onOpenChange} title={t("nextCycle")} className="max-w-lg">
      {equb && <Body key={equb.id} equb={equb} onClose={() => onOpenChange(false)} />}
    </Modal>
  );
}

function Body({ equb, onClose }: { equb: Equb; onClose: () => void }) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const clone = useCloneEqub();
  const nextNo = (equb.cycleNumber || 1) + 1;
  const [form, setForm] = useState({
    name: `${equb.name.replace(/ · Cycle \d+$/, "")} · Cycle ${nextNo}`,
    code: "",
    maxMembers: equb.maxMembers,
    startDate: "",
    copyMembers: true,
    carryOverMissedPayments: true,
  });

  const submit = () =>
    clone.mutate(
      { id: equb.id, input: { name: form.name, code: form.code, maxMembers: form.maxMembers, startDate: form.startDate || undefined, copyMembers: form.copyMembers, carryOverMissedPayments: form.carryOverMissedPayments } },
      {
        onSuccess: (r) => {
          toast({ title: t("nextCycleStarted"), description: t("nextCycleResult", { members: r.membersCopied, bans: r.bansCarriedOver }) });
          onClose();
          router.push(`/dashboard/equbs/${r.equb.id}`);
        },
        onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
      }
    );

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0 text-primary" /> {t("nextCycleHint", { code: equb.code })}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>{t("name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>{t("code")} <span className="font-normal text-muted-foreground">({tc("optional")})</span></Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder={t("codeAutoPlaceholder")} /></div>
        <div className="space-y-1.5"><Label>{t("maxMembers")}</Label><Input type="number" min={1} value={form.maxMembers || ""} onChange={(e) => setForm({ ...form, maxMembers: Number(e.target.value) || 0 })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>{t("start")} <span className="font-normal text-muted-foreground">({tc("optional")})</span></Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
      </div>
      <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
        <span><span className="block text-sm font-medium text-foreground">{t("copyMembers")}</span><span className="block text-xs text-muted-foreground">{t("copyMembersHint", { count: equb.currentMembers })}</span></span>
        <Switch checked={form.copyMembers} onCheckedChange={(v) => setForm({ ...form, copyMembers: v })} />
      </label>
      <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
        <span><span className="block text-sm font-medium text-foreground">{t("carryOver")}</span><span className="block text-xs text-muted-foreground">{t("carryOverHint")}</span></span>
        <Switch checked={form.carryOverMissedPayments} onCheckedChange={(v) => setForm({ ...form, carryOverMissedPayments: v })} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!form.name || form.maxMembers < 1 || clone.isPending} onClick={submit}>
          {clone.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Repeat size={15} className="mr-1" />} {t("nextCycle")}
        </Button>
      </div>
    </div>
  );
}
