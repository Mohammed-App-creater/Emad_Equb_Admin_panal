"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreatePilgrimageProduct, usePaymentAccounts, useSavingTypeOptions, useUpdatePilgrimageProduct } from "@/hooks/pilgrimage";
import { feeTotal, Field, useErrorToast } from "@/components/pilgrimage/shared";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { addDays, addMonths, addYears } from "date-fns";
import {
  FEE_PARTIES,
  FEE_SHARE_BASES,
  NON_WINNER_OPTIONS,
  type AdminFeeSplit,
  type FeeParty,
  type FeeShareBasis,
  type Frequency,
  type NonWinnerOption,
  type PilgrimageKind,
  type PilgrimageProduct,
  type PilgrimageProductInput,
} from "@/types/pilgrimage";

/** The form's state: numbers are kept as text while typing. */
interface Form {
  code: string;
  kind: PilgrimageKind;
  name: string;
  description: string;
  savingTypeId: string;
  packageCost: string;
  eligibilityPercent: string;
  frequency: Frequency;
  winnersPerCycle: string;
  registrationCloseDays: string;
  autoOpenNextCycle: boolean;
  groupMin: string;
  groupMax: string;
  adminWeekly: string;
  takafulWeekly: string;
  feeWeeks: string;
  split: Record<FeeParty, { basis: FeeShareBasis; value: string }>;
  holdingBankId: string;
  decisionWindowDays: string;
  defaultDecision: NonWinnerOption;
  contractDays: string;
  active: boolean;
}

const blank = (kind: PilgrimageKind = "hajj"): Form => ({
  code: kind === "hajj" ? "HAJJ" : "UMRAH", kind, name: kind === "hajj" ? "Hajj Equb" : "Umrah Equb", description: "", savingTypeId: "",
  packageCost: "", eligibilityPercent: "50",
  frequency: kind === "hajj" ? "annual" : "monthly", winnersPerCycle: "", registrationCloseDays: kind === "hajj" ? "7" : "3", autoOpenNextCycle: true,
  groupMin: "2", groupMax: "10",
  adminWeekly: "100", takafulWeekly: "70", feeWeeks: "52",
  split: { agent: { basis: "percent", value: "0" }, broker: { basis: "percent", value: "0" }, sacco: { basis: "percent", value: "100" } },
  holdingBankId: "",
  decisionWindowDays: kind === "hajj" ? "14" : "7", defaultDecision: "carry_forward", contractDays: "30",
  active: true,
});

const fromProduct = (p: PilgrimageProduct): Form => ({
  code: p.code, kind: p.kind, name: p.name, description: p.description ?? "", savingTypeId: p.saving_type_id,
  packageCost: String(p.package_cost), eligibilityPercent: String(p.eligibility_percent),
  frequency: p.cycle_frequency, winnersPerCycle: String(p.winners_per_cycle), registrationCloseDays: String(p.registration_close_days),
  autoOpenNextCycle: p.auto_open_next_cycle, groupMin: String(p.group_min_members), groupMax: String(p.group_max_members),
  adminWeekly: String(p.admin_fee_weekly ?? 0), takafulWeekly: String(p.takaful_fee_weekly ?? 0), feeWeeks: String(p.fee_weeks || 52),
  split: {
    agent: { basis: p.admin_fee_split?.agent?.basis || "percent", value: String(p.admin_fee_split?.agent?.value ?? 0) },
    broker: { basis: p.admin_fee_split?.broker?.basis || "percent", value: String(p.admin_fee_split?.broker?.value ?? 0) },
    sacco: { basis: p.admin_fee_split?.sacco?.basis || "percent", value: String(p.admin_fee_split?.sacco?.value ?? 100) },
  },
  holdingBankId: p.holding_bank_id ?? "",
  decisionWindowDays: String(p.decision_window_days), defaultDecision: p.default_decision, contractDays: String(p.winner_contract_days || 30),
  active: p.status === "active",
});

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const cents = (v: number) => Math.round(v * 100) / 100;
/** The admin fee a participant owes, and the split as entered. */
const adminFeeOf = (f: Form) => feeTotal(num(f.adminWeekly) || 0, num(f.feeWeeks) || 0);
const takafulOf = (f: Form) => feeTotal(num(f.takafulWeekly) || 0, num(f.feeWeeks) || 0);
const splitOf = (f: Form): AdminFeeSplit => ({
  agent: { basis: f.split.agent.basis, value: num(f.split.agent.value) || 0 },
  broker: { basis: f.split.broker.basis, value: num(f.split.broker.value) || 0 },
  sacco: { basis: f.split.sacco.basis, value: num(f.split.sacco.value) || 0 },
});
/** Each party's share on the product's admin fee, as configured (the SACCO's too, not the remainder). */
const configuredAmounts = (f: Form) => {
  const fee = adminFeeOf(f);
  const split = splitOf(f);
  const of = (p: FeeParty) => cents(split[p].basis === "percent" ? (fee * split[p].value) / 100 : split[p].value);
  return { agent: of("agent"), broker: of("broker"), sacco: of("sacco") };
};
const splitTotal = (f: Form) => { const a = configuredAmounts(f); return cents(a.agent + a.broker + a.sacco); };

const toInput = (f: Form): PilgrimageProductInput => ({
  code: f.code.trim().toUpperCase(), kind: f.kind, name: f.name.trim(), description: f.description.trim(), saving_type_id: f.savingTypeId,
  package_cost: num(f.packageCost), eligibility_percent: num(f.eligibilityPercent),
  cycle_frequency: f.frequency, winners_per_cycle: num(f.winnersPerCycle), registration_close_days: num(f.registrationCloseDays),
  auto_open_next_cycle: f.autoOpenNextCycle, group_min_members: num(f.groupMin), group_max_members: num(f.groupMax),
  admin_fee_weekly: num(f.adminWeekly) || 0, takaful_fee_weekly: num(f.takafulWeekly) || 0, fee_weeks: num(f.feeWeeks),
  admin_fee_split: {
    agent: { basis: f.split.agent.basis, value: num(f.split.agent.value) || 0 },
    broker: { basis: f.split.broker.basis, value: num(f.split.broker.value) || 0 },
    sacco: { basis: f.split.sacco.basis, value: num(f.split.sacco.value) || 0 },
  },
  holding_bank_id: f.holdingBankId.trim(),
  decision_window_days: num(f.decisionWindowDays), default_decision: f.defaultDecision, winner_contract_days: num(f.contractDays),
  status: f.active ? "active" : "inactive",
});

/** Rules the backend enforces too (domain PilgrimageProduct.Validate); shown inline so a save rarely fails. */
type ProblemKey = keyof Form | `split.${FeeParty}` | "splitTotal";

function problems(f: Form): Partial<Record<ProblemKey, string>> {
  const p: Partial<Record<ProblemKey, string>> = {};
  const positive = (k: keyof Form) => { if (!(num(f[k] as string) > 0)) p[k] = "positive"; };
  if (f.code.trim().length < 2) p.code = "required";
  if (f.name.trim().length < 2) p.name = "required";
  if (!f.savingTypeId) p.savingTypeId = "required";
  (["packageCost", "winnersPerCycle", "decisionWindowDays", "contractDays"] as const).forEach(positive);
  const pct = num(f.eligibilityPercent);
  if (!(pct > 0 && pct <= 100)) p.eligibilityPercent = "percent";
  if (!(num(f.groupMin) >= 2)) p.groupMin = "groupMin";
  if (!(num(f.groupMax) >= num(f.groupMin))) p.groupMax = "groupMax";
  if (!(num(f.adminWeekly) >= 0)) p.adminWeekly = "notNegative";
  if (!(num(f.takafulWeekly) >= 0)) p.takafulWeekly = "notNegative";
  if (!(num(f.feeWeeks) >= 1)) p.feeWeeks = "positive";
  FEE_PARTIES.forEach((party) => {
    const v = num(f.split[party].value);
    if (!(v >= 0)) p[`split.${party}`] = "notNegative";
    else if (f.split[party].basis === "percent" && v > 100) p[`split.${party}`] = "percent";
  });
  if (!p["split.agent"] && !p["split.broker"] && !p["split.sacco"] && splitTotal(f) !== adminFeeOf(f)) p.splitTotal = "splitTotal";
  return p;
}

export function ProductFormModal({ product, onClose }: { product: PilgrimageProduct | "new" | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.product");
  return (
    <Modal open={!!product} onOpenChange={(o) => !o && onClose()} title={product === "new" ? t("add") : t("edit")} className="max-w-3xl">
      {product && <Body key={product === "new" ? "new" : product.id} product={product} onClose={onClose} />}
    </Modal>
  );
}

function Body({ product, onClose }: { product: PilgrimageProduct | "new"; onClose: () => void }) {
  const t = useTranslations("pilgrimage.product");
  const tc = useTranslations("common");
  const tr = useTranslations("pilgrimage.rules");
  const to = useTranslations("pilgrimage.option");
  const { toast } = useToast();
  const onError = useErrorToast();
  const isNew = product === "new";
  const [form, setForm] = useState<Form>(isNew ? blank() : fromProduct(product));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const { data: savingTypes, isLoading: typesLoading } = useSavingTypeOptions();
  const { data: accounts } = usePaymentAccounts();
  const journals = Array.from(new Map((accounts ?? []).filter((a) => a.journal.id).map((a) => [a.journal.id!, a.journal])).values());
  const create = useCreatePilgrimageProduct();
  const update = useUpdatePilgrimageProduct();
  const pending = create.isPending || update.isPending;
  const errs = problems(form);
  const err = (k: ProblemKey) => (errs[k] ? tr(errs[k] as never) : undefined);
  const setShare = (party: FeeParty, patch: Partial<Form["split"][FeeParty]>) =>
    setForm((f) => ({ ...f, split: { ...f.split, [party]: { ...f.split[party], ...patch } } }));
  const adminFee = adminFeeOf(form);
  const amounts = configuredAmounts(form);
  const total = splitTotal(form);
  const valid = Object.keys(errs).length === 0;

  const save = () => {
    const done = { onSuccess: () => { toast({ title: isNew ? t("added") : t("saved"), description: form.name }); onClose(); }, onError };
    const body = toInput(form);
    if (isNew) create.mutate(body, done);
    else update.mutate({ id: product.id, body }, done);
  };

  const text = (k: keyof Form, props?: React.ComponentProps<typeof Input>) => (
    <Input value={form[k] as string} onChange={(e) => set(k, e.target.value as never)} {...props} />
  );
  const amount = (k: keyof Form, props?: React.ComponentProps<typeof Input>) => text(k, { type: "number", min: 0, step: "any", inputMode: "decimal", ...props });

  // A worked example of the default dates, from the next draw this product would hold.
  const sampleDraw = nextDrawFrom(new Date(), form.frequency);
  const days = (k: keyof Form) => Math.max(0, Math.round(num(form[k] as string) || 0));
  const required = (num(form.packageCost) || 0) * (num(form.eligibilityPercent) || 0) / 100;

  return (
    <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
      <Section step={1} title={t("sectionProduct")} hint={t("sectionProductHint")}>
        <Field label={t("kind")}>
          <Select value={form.kind} disabled={!isNew} onValueChange={(k) => setForm(isNew ? { ...blank(k as PilgrimageKind), savingTypeId: form.savingTypeId, packageCost: form.packageCost } : form)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hajj">{t("kind_hajj")}</SelectItem>
              <SelectItem value="umrah">{t("kind_umrah")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("name")} hint={t("nameHint")} error={err("name")}>{text("name", { maxLength: 255 })}</Field>
        <Field label={t("code")} error={err("code")} hint={isNew ? t("codeHint") : t("codeFixed")}>
          {text("code", { disabled: !isNew, className: "font-mono", maxLength: 30 })}
        </Field>
        <div />
        <Field label={`${t("description")} (${tc("optional")})`} hint={t("descriptionHint")} className="sm:col-span-2">
          <Textarea value={form.description} rows={2} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <Section step={2} title={t("sectionSaving")} hint={t("sectionSavingHint")}>
        <Field label={t("packageCost")} hint={t("packageCostHint")} error={err("packageCost")}>{amount("packageCost")}</Field>
        <Field label={t("eligibilityPercent")} hint={t("eligibilityHint")} error={err("eligibilityPercent")}>{amount("eligibilityPercent", { max: 100 })}</Field>
        {required > 0 && <Example className="sm:col-span-2">{t("eligibilityExample", { required: formatCurrency(required), percent: num(form.eligibilityPercent), cost: formatCurrency(num(form.packageCost)) })}</Example>}
      </Section>

      <Section step={3} title={t("sectionFees")} hint={t("sectionFeesHint")}>
        <Field label={t("adminFeeWeekly")} hint={t("adminFeeWeeklyHint")} error={err("adminWeekly")}>{amount("adminWeekly")}</Field>
        <Field label={t("takafulFeeWeekly")} hint={t("takafulFeeWeeklyHint")} error={err("takafulWeekly")}>{amount("takafulWeekly")}</Field>
        <Field label={t("feeWeeks")} hint={t("feeWeeksHint")} error={err("feeWeeks")}>{amount("feeWeeks", { step: 1 })}</Field>
        <Example>
          <p>{t("adminFeeTotal", { amount: formatCurrency(adminFee) })}</p>
          <p>{t("takafulFeeTotal", { amount: formatCurrency(takafulOf(form)) })}</p>
          <p className="font-medium text-foreground">{t("feesTotal", { amount: formatCurrency(cents(adminFee + takafulOf(form))) })}</p>
        </Example>
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-foreground">{t("splitTitle")}</p>
          <p className="mb-2 text-xs text-muted-foreground">{t("splitIntro", { fee: formatCurrency(adminFee) })}</p>
          <div className="overflow-hidden rounded-xl border border-border">
            {FEE_PARTIES.map((party) => (
              <div key={party} className="grid grid-cols-[7rem_1fr_1fr_7rem] items-start gap-2 border-b border-border p-2 last:border-b-0 max-sm:grid-cols-2">
                <span className="pt-1 text-sm font-medium text-foreground">
                  {t(`party_${party}` as never)}
                  <span className="block text-[11px] font-normal leading-4 text-muted-foreground">{t(`party_${party}_hint` as never)}</span>
                </span>
                <Select value={form.split[party].basis} onValueChange={(v) => setShare(party, { basis: v as FeeShareBasis })}>
                  <SelectTrigger aria-label={t("shareBasis")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEE_SHARE_BASES.map((b) => <SelectItem key={b} value={b}>{t(`shareBasis_${b}` as never)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <div className="relative">
                    <Input type="number" min={0} step="any" inputMode="decimal" value={form.split[party].value} aria-label={t("shareValue")}
                      max={form.split[party].basis === "percent" ? 100 : undefined} className="pr-12"
                      onChange={(e) => setShare(party, { value: e.target.value })} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {form.split[party].basis === "percent" ? "%" : "ETB"}
                    </span>
                  </div>
                  {err(`split.${party}`) && <p className="text-xs text-destructive">{err(`split.${party}`)}</p>}
                </div>
                <span className="pt-2 text-right text-sm tabular-nums text-foreground">{formatCurrency(amounts[party])}</span>
              </div>
            ))}
            <div className={cn("flex justify-between gap-2 bg-muted/50 p-2 text-sm font-medium", errs.splitTotal ? "text-destructive" : "text-foreground")}>
              <span>{t("splitTotalLabel")}</span>
              <span className="tabular-nums">{formatCurrency(total)} / {formatCurrency(adminFee)}</span>
            </div>
          </div>
          <p className={cn("mt-1 text-xs", errs.splitTotal ? "text-destructive" : "text-muted-foreground")}>
            {errs.splitTotal ? t("splitMismatch", { total: formatCurrency(total), fee: formatCurrency(adminFee) }) : t("splitHint")}
          </p>
        </div>
      </Section>

      <Section step={4} title={t("sectionDraw")} hint={t("sectionDrawHint")}>
        <Field label={t("frequency")} hint={t("frequencyHint")}>
          <Select value={form.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["annual", "semi_annual", "quarterly", "monthly"] as const).map((f) => <SelectItem key={f} value={f}>{t(`frequency_${f}` as never)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("winnersPerCycle")} hint={t("winnersHint")} error={err("winnersPerCycle")}>{amount("winnersPerCycle", { step: 1 })}</Field>
        <Toggle label={t("autoOpen")} hint={t("autoOpenHint")} checked={form.autoOpenNextCycle} onChange={(v) => set("autoOpenNextCycle", v)} />
        <div />
        <Field label={t("groupMin")} hint={t("groupMinHint")} error={err("groupMin")}>{amount("groupMin", { step: 1 })}</Field>
        <Field label={t("groupMax")} hint={t("groupMaxHint")} error={err("groupMax")}>{amount("groupMax", { step: 1 })}</Field>
      </Section>

      <Section step={5} title={t("sectionDates")} hint={t("sectionDatesHint")}>
        <Field label={t("registrationCloseDays")} hint={t("registrationCloseHint")}>{amount("registrationCloseDays", { step: 1 })}</Field>
        <Field label={t("contractDays")} hint={t("contractDaysHint")} error={err("contractDays")}>{amount("contractDays", { step: 1 })}</Field>
        <Field label={t("decisionWindowDays")} hint={t("decisionWindowHint")} error={err("decisionWindowDays")}>{amount("decisionWindowDays", { step: 1 })}</Field>
        <Field label={t("defaultDecision")} hint={t("defaultDecisionHint")}>
          <Select value={form.defaultDecision} onValueChange={(v) => set("defaultDecision", v as NonWinnerOption)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NON_WINNER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{to(o)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Example className="sm:col-span-2">
          <p className="font-medium text-foreground">{t("datesExample", { draw: formatDate(sampleDraw.toISOString()) })}</p>
          <p>{t("datesExampleRegistration", { date: formatDate(addDays(sampleDraw, -days("registrationCloseDays")).toISOString()) })}</p>
          <p>{t("datesExampleContract", { date: formatDate(addDays(sampleDraw, days("contractDays")).toISOString()) })}</p>
          <p>{t("datesExampleDecision", { date: formatDate(addDays(sampleDraw, days("decisionWindowDays")).toISOString()) })}</p>
        </Example>
      </Section>

      <Section step={6} title={t("sectionHolding")} hint={t("sectionHoldingHint")}>
        <Field label={t("holdingJournal")} error={form.holdingBankId ? undefined : t("holdingMissing")} className="sm:col-span-2">
          {journals.length > 0 ? (
            <Select value={form.holdingBankId || "none"} onValueChange={(v) => set("holdingBankId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("holdingNone")}</SelectItem>
                {journals.map((j) => <SelectItem key={j.id} value={j.id!}>{j.name || j.code || j.id}{j.code && <span className="text-muted-foreground"> · {j.code}</span>}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            text("holdingBankId", { placeholder: t("holdingPlaceholder") })
          )}
        </Field>
      </Section>

      <Section step={7} title={t("sectionWinnerContract")} hint={t("sectionWinnerContractHint")}>
        <Field label={t("savingType")} hint={t("savingTypeHint")} error={err("savingTypeId")} className="sm:col-span-2">
          <Select value={form.savingTypeId} onValueChange={(v) => set("savingTypeId", v)}>
            <SelectTrigger><SelectValue placeholder={t("selectSavingType")} /></SelectTrigger>
            <SelectContent loading={typesLoading} empty={!typesLoading && !savingTypes?.length}>
              {(savingTypes ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.category && <span className="text-muted-foreground"> · {s.category}</span>}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Toggle label={t("active")} hint={t("activeHint")} checked={form.active} onChange={(v) => set("active", v)} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button onClick={save} disabled={!valid || pending}>
          {pending && <Loader2 size={15} className="mr-1 animate-spin" />} {pending ? tc("saving") : isNew ? t("add") : tc("save")}
        </Button>
      </div>
    </div>
  );
}

/** The date of the next draw a product held today would have: one period on. */
function nextDrawFrom(d: Date, f: Frequency) {
  switch (f) {
    case "annual": return addYears(d, 1);
    case "semi_annual": return addMonths(d, 6);
    case "quarterly": return addMonths(d, 3);
    default: return addMonths(d, 1);
  }
}

/** A worked example of what the numbers above mean. */
function Example({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-0.5 rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground", className)}>{children}</div>;
}

function Section({ step, title, hint, children }: { step?: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {step && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{step}</span>}
          {title}
        </h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

