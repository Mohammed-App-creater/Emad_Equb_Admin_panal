"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useCreateEqub, useUpdateEqub, useStaffUserSearch } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency, formatDateForInput, getErrorMessage } from "@/lib/utils";
import { EQUB_FREQUENCIES } from "@/types/equb-api";
import type { AdminFeeShares, Equb, EqubCategory, EqubOverrides, Frequency } from "@/types/ekub";

// The Equb endpoints validate dates as plain YYYY-MM-DD (a timestamp is
// rejected with "start_date must be in YYYY-MM-DD format"), so send the
// date input's value through untouched and drop anything after the date.
export const toApiDate = (d: string) => (d ? d.slice(0, 10) : undefined);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the modal edits this Equb (drafts only); otherwise it creates a new one. */
  equb?: Equb | null;
  /** Pre-select a category when creating (e.g. from the Categories page). */
  defaultCategoryId?: string;
  onSaved?: (equb: Equb) => void;
}

interface TermsForm {
  contribution: number;
  adminFee: number;
  takafulFee: number;
  frequency: Frequency;
  totalRounds: number;
  winnersPerRound: number;
  guaranteeRequired: boolean;
  acceptedGuaranteeTypes: string[];
}

const termsFrom = (cat?: EqubCategory, equb?: Equb | null): TermsForm => {
  const t = equb?.effectiveTerms;
  return {
    contribution: t?.contribution ?? cat?.contribution ?? 0,
    adminFee: t?.adminFee ?? cat?.adminFee ?? 0,
    takafulFee: t?.takafulFee ?? cat?.takafulFee ?? 0,
    frequency: t?.frequency ?? cat?.frequency ?? "weekly",
    totalRounds: t?.totalRounds ?? cat?.totalRounds ?? 1,
    winnersPerRound: t?.winnersPerRound ?? cat?.winnersPerRound ?? 1,
    guaranteeRequired: t?.guaranteeRequired ?? cat?.guaranteeRequired ?? true,
    acceptedGuaranteeTypes: t?.acceptedGuaranteeTypes ?? cat?.acceptedGuaranteeTypes ?? ["member", "cheque", "collateral"],
  };
};

/**
 * Create / edit an Equb. Mirrors Create/UpdateEqubGroupRequest: optional code,
 * optional per-Equb term overrides, and the admin-fee split (SACCO / agent /
 * broker, totalling 100%).
 */
export function EqubFormModal({ open, onOpenChange, equb, defaultCategoryId, onSaved }: Props) {
  const t = useTranslations("equbs");
  const isEdit = !!equb;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEdit ? t("editEqub") : t("newEqub")} className="max-w-2xl">
      {/* The body mounts fresh each time the dialog opens, so its initial
          state is derived from props without an effect. */}
      {open && <EqubFormBody key={equb?.id ?? "new"} equb={equb} defaultCategoryId={defaultCategoryId} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
    </Modal>
  );
}

function EqubFormBody({ equb, defaultCategoryId, onClose, onSaved }: { equb?: Equb | null; defaultCategoryId?: string; onClose: () => void; onSaved?: (equb: Equb) => void }) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const tcat = useTranslations("categories");
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: staff } = useStaffUserSearch("");
  const create = useCreateEqub();
  const update = useUpdateEqub();
  const isEdit = !!equb;

  const initialCat = equb?.category ?? categories?.find((c) => c.id === (equb?.categoryId ?? defaultCategoryId)) ?? categories?.[0];

  const [form, setForm] = useState(() => ({
    categoryId: equb?.categoryId ?? initialCat?.id ?? "",
    name: equb?.name ?? "",
    code: equb?.code ?? "",
    maxMembers: equb?.maxMembers ?? initialCat?.membersPerEqub ?? 0,
    startDate: formatDateForInput(equb?.startDate),
    expectedEndDate: formatDateForInput(equb?.expectedEndDate),
  }));
  const [maxTouched, setMaxTouched] = useState(isEdit);
  const [customize, setCustomize] = useState(() => !!equb && Object.keys(equb.overrides ?? {}).length > 0);
  const [terms, setTerms] = useState<TermsForm>(() => termsFrom(initialCat, equb));
  const [shares, setShares] = useState<AdminFeeShares>(() => equb?.feeShares ?? { sacco: 100, agent: 0, broker: 0 });
  const [brokerUserId, setBrokerUserId] = useState(equb?.brokerUserId ?? "");

  const category = categories?.find((c) => c.id === form.categoryId) ?? initialCat;
  const payout = terms.contribution * form.maxMembers;
  const shareTotal = Math.round((shares.sacco + shares.agent + shares.broker) * 100) / 100;

  const selectCategory = (id: string) => {
    const cat = categories?.find((c) => c.id === id);
    setForm((f) => ({ ...f, categoryId: id, maxMembers: !maxTouched && cat ? cat.membersPerEqub : f.maxMembers }));
    if (cat) setTerms(termsFrom(cat));
  };

  const errors: string[] = [];
  if (Math.abs(shareTotal - 100) > 0.001) errors.push(t("sharesMustTotal", { total: shareTotal }));
  if (shares.broker > 0 && !brokerUserId) errors.push(t("brokerRequired"));
  if (customize && terms.winnersPerRound > form.maxMembers) errors.push(t("winnersMustFit"));
  if (customize && (terms.contribution <= 0 || terms.totalRounds <= 0 || terms.winnersPerRound <= 0)) errors.push(t("termsPositive"));

  const pending = create.isPending || update.isPending;
  const valid = !!form.name && (isEdit || !!form.categoryId) && form.maxMembers > 0 && errors.length === 0;

  const submit = () => {
    const overrides: EqubOverrides | undefined = customize
      ? { contribution: terms.contribution, adminFee: terms.adminFee, takafulFee: terms.takafulFee, payout, frequency: terms.frequency, totalRounds: terms.totalRounds, winnersPerRound: terms.winnersPerRound, guaranteeRequired: terms.guaranteeRequired, acceptedGuaranteeTypes: terms.guaranteeRequired ? terms.acceptedGuaranteeTypes : [] }
      : undefined;
    const common = {
      name: form.name,
      code: form.code,
      maxMembers: form.maxMembers,
      startDate: toApiDate(form.startDate),
      expectedEndDate: toApiDate(form.expectedEndDate),
      overrides,
      feeShares: shares,
      brokerUserId: shares.broker > 0 ? brokerUserId : undefined,
    };
    const done = {
      onSuccess: (e: Equb) => {
        toast({ title: isEdit ? tc("save") : tc("create"), description: e?.code ? `${e.name} · ${e.code}` : form.name });
        onClose();
        onSaved?.(e);
      },
      onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
    };
    // On edit, customizing always sends the full set after clearing the old
    // one; turning customizing off returns the Equb to its category.
    if (isEdit && equb) update.mutate({ id: equb.id, input: { ...common, clearOverrides: customize || Object.keys(equb.overrides ?? {}).length > 0 } }, done);
    else create.mutate({ ...common, categoryId: form.categoryId }, done);
  };

  const n = (v: string) => (v === "" ? 0 : Number(v));
  const staffName = (id: string) => staff?.find((u) => u.id === id)?.fullName ?? "—";

  return (
    <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
      {/* Basics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("category")}</Label>
          <Select value={form.categoryId} onValueChange={selectCategory} disabled={isEdit}>
            <SelectTrigger><SelectValue placeholder={t("category")} /></SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} <span className="text-muted-foreground">· {c.code}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("name")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("code")} <span className="font-normal text-muted-foreground">({tc("optional")})</span></Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder={t("codeAutoPlaceholder")} />
          <p className="text-xs text-muted-foreground">{isEdit ? t("codeKeepHint") : t("codeAutoHint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label>{t("maxMembers")}</Label>
          <Input type="number" min={1} value={form.maxMembers || ""} onChange={(e) => { setMaxTouched(true); setForm({ ...form, maxMembers: n(e.target.value) }); }} />
          {!isEdit && <p className="text-xs text-muted-foreground">{t("maxMembersHint")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t("start")}</Label>
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("end")}</Label>
          <Input type="date" value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} />
        </div>
      </div>

      {/* Terms */}
      <section className="space-y-3 rounded-2xl border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("customizeTerms")}</p>
            <p className="text-xs text-muted-foreground">{customize ? t("customizeOnHint") : t("customizeOffHint")}</p>
          </div>
          <Switch
            checked={customize}
            onCheckedChange={(v) => { setCustomize(v); if (!v && category) setTerms(termsFrom(category)); }}
          />
        </div>

        {customize ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TermField label={t("contribution")} value={terms.contribution} base={category?.contribution} onChange={(v) => setTerms({ ...terms, contribution: v })} />
            <TermField label={t("adminFee")} value={terms.adminFee} base={category?.adminFee} onChange={(v) => setTerms({ ...terms, adminFee: v })} />
            <TermField label={t("takafulFee")} value={terms.takafulFee} base={category?.takafulFee} onChange={(v) => setTerms({ ...terms, takafulFee: v })} />
            <div className="space-y-1.5">
              <Label className="text-xs">{t("frequency")}</Label>
              <Select value={terms.frequency} onValueChange={(v) => setTerms({ ...terms, frequency: v as Frequency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQUB_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{tcat(f)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <TermField label={t("totalRounds")} value={terms.totalRounds} base={category?.totalRounds} integer onChange={(v) => setTerms({ ...terms, totalRounds: v })} />
            <TermField label={t("winnersPerRound")} value={terms.winnersPerRound} base={category?.winnersPerRound} integer onChange={(v) => setTerms({ ...terms, winnersPerRound: v })} />
            <div className="space-y-2 rounded-xl border border-border p-3 sm:col-span-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{t("guaranteeRequired")}</span>
                <Switch checked={terms.guaranteeRequired} onCheckedChange={(v) => setTerms({ ...terms, guaranteeRequired: v })} />
              </label>
              {terms.guaranteeRequired && (
                <div className="flex flex-wrap gap-3">
                  {["member", "cheque", "collateral"].map((g) => {
                    const on = terms.acceptedGuaranteeTypes.includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={on} onChange={() => setTerms({ ...terms, acceptedGuaranteeTypes: on ? terms.acceptedGuaranteeTypes.filter((x) => x !== g) : [...terms.acceptedGuaranteeTypes, g] })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                        {tcat(`guarantee_${g}`)}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="rounded-xl bg-primary/5 p-3 sm:col-span-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t("payout")} = {t("contribution")} × {t("maxMembers")}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(payout)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("totalPerRound")}: {formatCurrency(terms.contribution + terms.adminFee + terms.takafulFee)}</p>
            </div>
          </div>
        ) : (
          category && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(category.contribution)} + {formatCurrency(category.adminFee)} + {formatCurrency(category.takafulFee)} · {tcat(category.frequency)} · {category.totalRounds} {tcat("rounds")} · {t("payout")} {formatCurrency(category.payout)}
            </p>
          )
        )}
      </section>

      {/* Admin fee split */}
      <section className="space-y-3 rounded-2xl border border-border p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("feeSplit")}</p>
          <p className="text-xs text-muted-foreground">{t("feeSplitHint")}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ShareField label={t("shareSacco")} value={shares.sacco} onChange={(v) => setShares({ ...shares, sacco: v })} />
          <ShareField label={t("shareAgent")} value={shares.agent} onChange={(v) => setShares({ ...shares, agent: v })} />
          <ShareField label={t("shareBroker")} value={shares.broker} onChange={(v) => setShares({ ...shares, broker: v })} />
        </div>
        <p className={cn("text-xs font-medium", Math.abs(shareTotal - 100) > 0.001 ? "text-destructive" : "text-success")}>
          {t("sharesTotal")}: {shareTotal}%
        </p>
        {shares.broker > 0 && (
          <div className="space-y-1.5">
            <Label>{t("broker")}</Label>
            <Select value={brokerUserId} onValueChange={setBrokerUserId}>
              <SelectTrigger><SelectValue placeholder={t("selectBroker")}>{brokerUserId ? staffName(brokerUserId) : undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                {(staff ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} <span className="text-muted-foreground">· {u.role || u.email}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errors.map((e) => <li key={e} className="flex gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> {e}</li>)}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!valid || pending} onClick={submit}>
          {pending ? tc("saving") : isEdit ? tc("save") : tc("create")}
        </Button>
      </div>
    </div>
  );
}

function TermField({ label, value, base, integer, onChange }: { label: string; value: number; base?: number; integer?: boolean; onChange: (v: number) => void }) {
  const changed = base !== undefined && value !== base;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} step={integer ? 1 : "any"} value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className={cn(changed && "border-primary")} />
      {base !== undefined && <p className="text-[11px] text-muted-foreground">{integer ? base : formatCurrency(base)}</p>}
    </div>
  );
}

function ShareField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" min={0} max={100} step="any" value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className="pr-7" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
