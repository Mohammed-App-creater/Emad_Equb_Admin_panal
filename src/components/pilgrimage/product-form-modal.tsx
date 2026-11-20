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
import { cn, formatCurrency } from "@/lib/utils";
import {
  CHARGE_BASES,
  FEE_PARTIES,
  FEE_SHARE_BASES,
  NON_WINNER_OPTIONS,
  type AdminFeeSplit,
  type ChargeBasis,
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
  savingPeriodMonths: string;
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
  financeMonths: string;
  repaymentInterval: string;
  maxFinance: string;
  serviceBasis: ChargeBasis | "";
  serviceValue: string;
  equbShare: string;
  takafulBasis: ChargeBasis | "";
  takafulValue: string;
  active: boolean;
}

const blank = (kind: PilgrimageKind = "hajj"): Form => ({
  code: kind === "hajj" ? "HAJJ" : "UMRAH", kind, name: kind === "hajj" ? "Hajj Equb" : "Umrah Equb", description: "", savingTypeId: "",
  packageCost: "", eligibilityPercent: "50", savingPeriodMonths: kind === "hajj" ? "12" : "6",
  frequency: kind === "hajj" ? "annual" : "monthly", winnersPerCycle: "", registrationCloseDays: kind === "hajj" ? "7" : "3", autoOpenNextCycle: true,
  groupMin: "2", groupMax: "10",
  adminWeekly: "100", takafulWeekly: "70", feeWeeks: "52",
  split: { agent: { basis: "percent", value: "0" }, broker: { basis: "percent", value: "0" }, sacco: { basis: "percent", value: "100" } },
  holdingBankId: "",
  decisionWindowDays: kind === "hajj" ? "14" : "7", defaultDecision: "carry_forward",
  financeMonths: "12", repaymentInterval: "1", maxFinance: "",
  serviceBasis: "percent_of_financed", serviceValue: "2", equbShare: "50", takafulBasis: "percent_of_installment", takafulValue: "1", active: true,
});

const fromProduct = (p: PilgrimageProduct): Form => ({
  code: p.code, kind: p.kind, name: p.name, description: p.description ?? "", savingTypeId: p.saving_type_id,
  packageCost: String(p.package_cost), eligibilityPercent: String(p.eligibility_percent), savingPeriodMonths: String(p.saving_period_months),
  frequency: p.cycle_frequency, winnersPerCycle: String(p.winners_per_cycle), registrationCloseDays: String(p.registration_close_days),
  autoOpenNextCycle: p.auto_open_next_cycle, groupMin: String(p.group_min_members), groupMax: String(p.group_max_members),
  adminWeekly: String(p.admin_fee_weekly ?? 0), takafulWeekly: String(p.takaful_fee_weekly ?? 0), feeWeeks: String(p.fee_weeks || 52),
  split: {
    agent: { basis: p.admin_fee_split?.agent?.basis || "percent", value: String(p.admin_fee_split?.agent?.value ?? 0) },
    broker: { basis: p.admin_fee_split?.broker?.basis || "percent", value: String(p.admin_fee_split?.broker?.value ?? 0) },
    sacco: { basis: p.admin_fee_split?.sacco?.basis || "percent", value: String(p.admin_fee_split?.sacco?.value ?? 100) },
  },
  holdingBankId: p.holding_bank_id ?? "",
  decisionWindowDays: String(p.decision_window_days), defaultDecision: p.default_decision,
  financeMonths: String(p.finance_duration_months), repaymentInterval: String(p.repayment_interval_months), maxFinance: String(p.max_finance_amount || ""),
  serviceBasis: p.service_charge_basis || "", serviceValue: String(p.service_charge_value), equbShare: String(p.equb_service_charge_share),
  takafulBasis: p.takaful_basis || "", takafulValue: String(p.takaful_value), active: p.status === "active",
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
  package_cost: num(f.packageCost), eligibility_percent: num(f.eligibilityPercent), saving_period_months: num(f.savingPeriodMonths),
  cycle_frequency: f.frequency, winners_per_cycle: num(f.winnersPerCycle), registration_close_days: num(f.registrationCloseDays),
  auto_open_next_cycle: f.autoOpenNextCycle, group_min_members: num(f.groupMin), group_max_members: num(f.groupMax),
  admin_fee_weekly: num(f.adminWeekly) || 0, takaful_fee_weekly: num(f.takafulWeekly) || 0, fee_weeks: num(f.feeWeeks),
  admin_fee_split: {
    agent: { basis: f.split.agent.basis, value: num(f.split.agent.value) || 0 },
    broker: { basis: f.split.broker.basis, value: num(f.split.broker.value) || 0 },
    sacco: { basis: f.split.sacco.basis, value: num(f.split.sacco.value) || 0 },
  },
  holding_bank_id: f.holdingBankId.trim(),
  decision_window_days: num(f.decisionWindowDays), default_decision: f.defaultDecision,
  finance_duration_months: num(f.financeMonths), repayment_interval_months: num(f.repaymentInterval),
  max_finance_amount: num(f.maxFinance) > 0 ? num(f.maxFinance) : undefined,
  service_charge_basis: f.serviceBasis || undefined, service_charge_value: num(f.serviceValue) || 0, equb_service_charge_share: num(f.equbShare),
  takaful_basis: f.takafulBasis || undefined, takaful_value: num(f.takafulValue) || 0, status: f.active ? "active" : "inactive",
});

/** Rules the backend enforces too (domain PilgrimageProduct.Validate); shown inline so a save rarely fails. */
type ProblemKey = keyof Form | `split.${FeeParty}` | "splitTotal";

function problems(f: Form): Partial<Record<ProblemKey, string>> {
  const p: Partial<Record<ProblemKey, string>> = {};
  const positive = (k: keyof Form) => { if (!(num(f[k] as string) > 0)) p[k] = "positive"; };
  const percent = (k: keyof Form) => { const v = num(f[k] as string); if (!(v >= 0 && v <= 100)) p[k] = "percent"; };
  if (f.code.trim().length < 2) p.code = "required";
  if (f.name.trim().length < 2) p.name = "required";
  if (!f.savingTypeId) p.savingTypeId = "required";
  (["packageCost", "winnersPerCycle", "savingPeriodMonths", "financeMonths", "repaymentInterval", "decisionWindowDays"] as const).forEach(positive);
  const pct = num(f.eligibilityPercent);
  if (!(pct > 0 && pct <= 100)) p.eligibilityPercent = "percent";
  if (!(num(f.groupMin) >= 2)) p.groupMin = "groupMin";
  if (!(num(f.groupMax) >= num(f.groupMin))) p.groupMax = "groupMax";
  if (num(f.repaymentInterval) > num(f.financeMonths)) p.repaymentInterval = "interval";
  if (f.maxFinance.trim() !== "" && !(num(f.maxFinance) > 0)) p.maxFinance = "positive";
  percent("equbShare");
  if (!(num(f.adminWeekly) >= 0)) p.adminWeekly = "notNegative";
  if (!(num(f.takafulWeekly) >= 0)) p.takafulWeekly = "notNegative";
  if (!(num(f.feeWeeks) >= 1)) p.feeWeeks = "positive";
  FEE_PARTIES.forEach((party) => {
    const v = num(f.split[party].value);
    if (!(v >= 0)) p[`split.${party}`] = "notNegative";
    else if (f.split[party].basis === "percent" && v > 100) p[`split.${party}`] = "percent";
  });
  if (!p["split.agent"] && !p["split.broker"] && !p["split.sacco"] && splitTotal(f) !== adminFeeOf(f)) p.splitTotal = "splitTotal";
  if (num(f.serviceValue) > 0 && !f.serviceBasis) p.serviceBasis = "basis";
  if (num(f.takafulValue) > 0 && !f.takafulBasis) p.takafulBasis = "basis";
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
  const tb = useTranslations("pilgrimage.basis");
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

  return (
    <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
      <Section title={t("sectionProduct")}>
        <Field label={t("kind")}>
          <Select value={form.kind} disabled={!isNew} onValueChange={(k) => setForm(isNew ? { ...blank(k as PilgrimageKind), savingTypeId: form.savingTypeId, packageCost: form.packageCost } : form)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hajj">{t("kind_hajj")}</SelectItem>
              <SelectItem value="umrah">{t("kind_umrah")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("code")} error={err("code")} hint={isNew ? undefined : t("codeFixed")}>
          {text("code", { disabled: !isNew, className: "font-mono", maxLength: 30 })}
        </Field>
        <Field label={t("name")} error={err("name")}>{text("name", { maxLength: 255 })}</Field>
        <Field label={t("savingType")} hint={t("savingTypeHint")} error={err("savingTypeId")}>
          <Select value={form.savingTypeId} onValueChange={(v) => set("savingTypeId", v)}>
            <SelectTrigger><SelectValue placeholder={t("selectSavingType")} /></SelectTrigger>
            <SelectContent loading={typesLoading} empty={!typesLoading && !savingTypes?.length}>
              {(savingTypes ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.category && <span className="text-muted-foreground"> · {s.category}</span>}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={`${tc("description")} (${tc("optional")})`} className="sm:col-span-2">
          <Textarea value={form.description} rows={2} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <Section title={t("sectionSaving")}>
        <Field label={t("packageCost")} error={err("packageCost")}>{amount("packageCost")}</Field>
        <Field label={t("eligibilityPercent")} hint={t("eligibilityHint")} error={err("eligibilityPercent")}>{amount("eligibilityPercent")}</Field>
        <Field label={t("savingPeriodMonths")} hint={t("savingPeriodHint")} error={err("savingPeriodMonths")}>{amount("savingPeriodMonths")}</Field>
      </Section>

      <Section title={t("sectionFees")} hint={t("sectionFeesHint")}>
        <Field label={t("adminFeeWeekly")} error={err("adminWeekly")}>{amount("adminWeekly")}</Field>
        <Field label={t("takafulFeeWeekly")} error={err("takafulWeekly")}>{amount("takafulWeekly")}</Field>
        <Field label={t("feeWeeks")} hint={t("feeWeeksHint")} error={err("feeWeeks")}>{amount("feeWeeks", { step: 1 })}</Field>
        <div className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
          <p>{t("adminFeeTotal", { amount: formatCurrency(adminFee) })}</p>
          <p>{t("takafulFeeTotal", { amount: formatCurrency(takafulOf(form)) })}</p>
          <p className="font-medium text-foreground">{t("feesTotal", { amount: formatCurrency(cents(adminFee + takafulOf(form))) })}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-foreground">{t("splitTitle")}</p>
          <p className="mb-2 text-xs text-muted-foreground">{t("splitIntro")}</p>
          <div className="overflow-hidden rounded-xl border border-border">
            {FEE_PARTIES.map((party) => (
              <div key={party} className="grid grid-cols-[6rem_1fr_1fr_7rem] items-start gap-2 border-b border-border p-2 last:border-b-0 max-sm:grid-cols-2">
                <span className="pt-2 text-sm font-medium text-foreground">{t(`party_${party}` as never)}</span>
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

      <Section title={t("sectionHolding")} hint={t("sectionHoldingHint")}>
        <Field label={t("holdingJournal")} hint={form.holdingBankId ? undefined : t("holdingMissing")} className="sm:col-span-2">
          {journals.length > 0 ? (
            <Select value={form.holdingBankId || "none"} onValueChange={(v) => set("holdingBankId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc("none")}</SelectItem>
                {journals.map((j) => <SelectItem key={j.id} value={j.id!}>{j.name || j.code || j.id}{j.code && <span className="text-muted-foreground"> · {j.code}</span>}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            text("holdingBankId", { placeholder: t("holdingPlaceholder") })
          )}
        </Field>
      </Section>

      <Section title={t("sectionDraw")}>
        <Field label={t("frequency")}>
          <Select value={form.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["annual", "semi_annual", "quarterly", "monthly"] as const).map((f) => <SelectItem key={f} value={f}>{t(`frequency_${f}` as never)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("winnersPerCycle")} hint={t("winnersHint")} error={err("winnersPerCycle")}>{amount("winnersPerCycle")}</Field>
        <Field label={t("registrationCloseDays")} hint={t("registrationCloseHint")}>{amount("registrationCloseDays")}</Field>
        <Toggle label={t("autoOpen")} hint={t("autoOpenHint")} checked={form.autoOpenNextCycle} onChange={(v) => set("autoOpenNextCycle", v)} />
        <Field label={t("groupMin")} error={err("groupMin")}>{amount("groupMin")}</Field>
        <Field label={t("groupMax")} hint={t("groupMaxHint")} error={err("groupMax")}>{amount("groupMax")}</Field>
      </Section>

      <Section title={t("sectionNonWinners")}>
        <Field label={t("decisionWindowDays")} error={err("decisionWindowDays")}>{amount("decisionWindowDays")}</Field>
        <Field label={t("defaultDecision")} hint={t("defaultDecisionHint")}>
          <Select value={form.defaultDecision} onValueChange={(v) => set("defaultDecision", v as NonWinnerOption)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NON_WINNER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{to(o)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title={t("sectionFinance")} hint={t("sectionFinanceHint")}>
        <Field label={t("maxFinance")} hint={t("maxFinanceHint")} error={err("maxFinance")}>{amount("maxFinance", { placeholder: form.packageCost || undefined })}</Field>
        <Field label={t("financeMonths")} error={err("financeMonths")}>{amount("financeMonths")}</Field>
        <Field label={t("repaymentInterval")} hint={t("repaymentIntervalHint")} error={err("repaymentInterval")}>{amount("repaymentInterval")}</Field>
        <div />
        <BasisSelect label={t("serviceBasis")} value={form.serviceBasis} onChange={(v) => set("serviceBasis", v)} error={err("serviceBasis")} tb={tb} none={tc("none")} />
        <Field label={t("serviceValue")} hint={t("valueHint")}>{amount("serviceValue")}</Field>
        <Field label={t("equbShare")} hint={t("equbShareHint")} error={err("equbShare")}>{amount("equbShare")}</Field>
        <div />
        <BasisSelect label={t("takafulBasis")} value={form.takafulBasis} onChange={(v) => set("takafulBasis", v)} error={err("takafulBasis")} tb={tb} none={tc("none")} />
        <Field label={t("takafulValue")} hint={t("valueHint")}>{amount("takafulValue")}</Field>
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

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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

function BasisSelect({ label, value, onChange, error, tb, none }: {
  label: string; value: ChargeBasis | ""; onChange: (v: ChargeBasis | "") => void; error?: string;
  tb: ReturnType<typeof useTranslations>; none: string;
}) {
  return (
    <Field label={label} error={error}>
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : (v as ChargeBasis))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{none}</SelectItem>
          {CHARGE_BASES.map((b) => <SelectItem key={b} value={b}>{tb(b)}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}
