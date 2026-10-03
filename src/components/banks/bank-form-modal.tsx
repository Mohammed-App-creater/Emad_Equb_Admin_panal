"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useCreateBank, useUpdateBank } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { Bank, BankInput } from "@/types/ekub";

const blank = (): BankInput => ({ name: "", code: "", address: "", city: "", country: "Ethiopia", phone: "", active: true });
const toInput = (b: Bank): BankInput => ({ name: b.name, code: b.code, address: b.address, city: b.city, country: b.country, phone: b.phone, active: b.active });

/**
 * Add or edit a bank (POST /banks, PUT /banks/{id}). Used by the Banks page
 * and from the record-payment modal when the member's bank isn't listed yet.
 * `bank` is "new" to add one, a Bank to edit it, null when closed.
 */
export function BankFormModal({ bank, onClose, onSaved }: { bank: Bank | "new" | null; onClose: () => void; onSaved?: (b: Bank) => void }) {
  const t = useTranslations("banks");
  return (
    <Modal open={!!bank} onOpenChange={(o) => !o && onClose()} title={bank === "new" ? t("add") : t("edit")} className="max-w-lg">
      {bank && <Body key={bank === "new" ? "new" : bank.id} bank={bank} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function Body({ bank, onClose, onSaved }: { bank: Bank | "new"; onClose: () => void; onSaved?: (b: Bank) => void }) {
  const t = useTranslations("banks");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const isNew = bank === "new";
  const [form, setForm] = useState<BankInput>(isNew ? blank() : toInput(bank));
  const create = useCreateBank();
  const update = useUpdateBank();
  const pending = create.isPending || update.isPending;
  const set = <K extends keyof BankInput>(k: K, v: BankInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Mirrors BankCreateRequest: name/code required (2+ chars); optional fields 2+ chars when given, phone 9+.
  const short = (v: string) => v.trim().length > 0 && v.trim().length < 2;
  const phoneBad = form.phone.trim().length > 0 && form.phone.trim().length < 9;
  const valid = form.name.trim().length >= 2 && form.code.trim().length >= 2 && !short(form.address) && !short(form.city) && !short(form.country) && !phoneBad;

  const save = () => {
    const done = {
      onSuccess: (b: Bank) => { toast({ title: isNew ? t("added") : t("saved"), description: b.name }); onSaved?.(b); onClose(); },
      onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
    };
    if (isNew) create.mutate(form, done);
    else update.mutate({ id: bank.id, input: form }, done);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("name")} className="sm:col-span-2" error={short(form.name) ? t("nameRule") : undefined}>
          <Input value={form.name} maxLength={100} onChange={(e) => set("name", e.target.value)} placeholder="Commercial Bank of Ethiopia" autoFocus />
        </Field>
        <Field label={t("code")} hint={t("codeHint")} error={short(form.code) ? t("nameRule") : undefined}>
          <Input value={form.code} maxLength={20} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))} placeholder="CBE" className="font-mono" />
        </Field>
        <Field label={`${t("phone")} (${tc("optional")})`} error={phoneBad ? t("phoneRule") : undefined}>
          <Input type="tel" value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} placeholder="+251 11 551 5004" />
        </Field>
        <Field label={`${t("city")} (${tc("optional")})`} error={short(form.city) ? t("nameRule") : undefined}>
          <Input value={form.city} maxLength={100} onChange={(e) => set("city", e.target.value)} placeholder="Addis Ababa" />
        </Field>
        <Field label={`${t("country")} (${tc("optional")})`} error={short(form.country) ? t("nameRule") : undefined}>
          <Input value={form.country} maxLength={100} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label={`${t("address")} (${tc("optional")})`} className="sm:col-span-2" error={short(form.address) ? t("nameRule") : undefined}>
          <Input value={form.address} maxLength={200} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <span>
          <span className="block text-sm font-medium text-foreground">{t("active")}</span>
          <span className="block text-xs text-muted-foreground">{t("activeHint")}</span>
        </span>
        <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button onClick={save} disabled={!valid || pending}>
          {pending && <Loader2 size={15} className="mr-1 animate-spin" />} {pending ? tc("saving") : isNew ? t("add") : tc("save")}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
