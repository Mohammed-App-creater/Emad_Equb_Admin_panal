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
import { useCreatePilgrimageProduct, useSavingTypeOptions, useUpdatePilgrimageProduct } from "@/hooks/pilgrimage";
import { Field, useErrorToast } from "@/components/pilgrimage/shared";
import {
  CHARGE_BASES,
  NON_WINNER_OPTIONS,
  type ChargeBasis,
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
  decisionWindowDays: string;
  defaultDecision: NonWinnerOption;
  mudarabahDurations: string;
  mudarabahShare: string;
  profitDistribution: string;
  financeMonths: string;
  repaymentInterval: string;
  serviceBasis: ChargeBasis | "";
  serviceValue: string;
  equbShare: string;
  takafulBasis: ChargeBasis | "";
  takafulValue: string;
  active: boolean;
}

// Defaults follow the business requirements: 50% eligibility, annual Hajj /
// monthly Umrah, groups of 2–10, 15-day grace on the finance comes from the saving type.
const blank = (kind: PilgrimageKind = "hajj"): Form => ({
  code: kind === "hajj" ? "HAJJ" : "UMRAH", kind, name: kind === "hajj" ? "Hajj Equb" : "Umrah Equb", description: "", savingTypeId: "",
  packageCost: "", eligibilityPercent: "50", savingPeriodMonths: "12",
  frequency: kind === "hajj" ? "annual" : "monthly", winnersPerCycle: "", registrationCloseDays: kind === "hajj" ? "30" : "3", autoOpenNextCycle: true,
  groupMin: "2", groupMax: "10", decisionWindowDays: kind === "hajj" ? "14" : "5", defaultDecision: "carry_forward",
  mudarabahDurations: "6, 12, 24", mudarabahShare: "60", profitDistribution: "",
  financeMonths: "12", repaymentInterval: "1",
  serviceBasis: "", serviceValue: "0", equbShare: "50", takafulBasis: "", takafulValue: "0", active: true,
});

const fromProduct = (p: PilgrimageProduct): Form => ({
  code: p.code, kind: p.kind, name: p.name, description: p.description ?? "", savingTypeId: p.saving_type_id,
  packageCost: String(p.package_cost), eligibilityPercent: String(p.eligibility_percent), savingPeriodMonths: String(p.saving_period_months),
  frequency: p.cycle_frequency, winnersPerCycle: String(p.winners_per_cycle), registrationCloseDays: String(p.registration_close_days),
  autoOpenNextCycle: p.auto_open_next_cycle, groupMin: String(p.group_min_members), groupMax: String(p.group_max_members),
  decisionWindowDays: String(p.decision_window_days), defaultDecision: p.default_decision,
  mudarabahDurations: (p.mudarabah_terms?.durations_months ?? []).join(", "),
  mudarabahShare: String(p.mudarabah_terms?.member_profit_share_percent ?? 0), profitDistribution: p.mudarabah_terms?.profit_distribution ?? "",
  financeMonths: String(p.finance_duration_months), repaymentInterval: String(p.repayment_interval_months),
  serviceBasis: p.service_charge_basis || "", serviceValue: String(p.service_charge_value), equbShare: String(p.equb_service_charge_share),
  takafulBasis: p.takaful_basis || "", takafulValue: String(p.takaful_value), active: p.status === "active",
});

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const durations = (s: string) => s.split(/[,\s]+/).filter(Boolean).map(Number);

const toInput = (f: Form): PilgrimageProductInput => ({
  code: f.code.trim().toUpperCase(), kind: f.kind, name: f.name.trim(), description: f.description.trim(), saving_type_id: f.savingTypeId,
  package_cost: num(f.packageCost), eligibility_percent: num(f.eligibilityPercent), saving_period_months: num(f.savingPeriodMonths),
  cycle_frequency: f.frequency, winners_per_cycle: num(f.winnersPerCycle), registration_close_days: num(f.registrationCloseDays),
  auto_open_next_cycle: f.autoOpenNextCycle, group_min_members: num(f.groupMin), group_max_members: num(f.groupMax),
  decision_window_days: num(f.decisionWindowDays), default_decision: f.defaultDecision,
  mudarabah_terms: { durations_months: durations(f.mudarabahDurations), member_profit_share_percent: num(f.mudarabahShare), profit_distribution: f.profitDistribution.trim() || undefined },
  finance_duration_months: num(f.financeMonths), repayment_interval_months: num(f.repaymentInterval),
  service_charge_basis: f.serviceBasis || undefined, service_charge_value: num(f.serviceValue) || 0, equb_service_charge_share: num(f.equbShare),
  takaful_basis: f.takafulBasis || undefined, takaful_value: num(f.takafulValue) || 0, status: f.active ? "active" : "inactive",
});

/** Rules the backend enforces too (domain PilgrimageProduct.Validate); shown inline so a save rarely fails. */
function problems(f: Form): Partial<Record<keyof Form, string>> {
  const p: Partial<Record<keyof Form, string>> = {};
  const positive = (k: keyof Form) => { if (!(num(f[k] as string) > 0)) p[k] = "positive"; };
  if (f.code.trim().length < 2) p.code = "required";
  if (f.name.trim().length < 2) p.name = "required";
  if (!f.savingTypeId) p.savingTypeId = "required";
  (["packageCost", "winnersPerCycle", "savingPeriodMonths", "financeMonths", "repaymentInterval", "decisionWindowDays"] as const).forEach(positive);
  const pct = num(f.eligibilityPercent);
  if (!(pct > 0 && pct <= 100)) p.eligibilityPercent = "percent";
  if (!(num(f.groupMin) >= 2)) p.groupMin = "groupMin";
  if (!(num(f.groupMax) >= num(f.groupMin))) p.groupMax = "groupMax";
  if (num(f.repaymentInterval) > num(f.financeMonths)) p.repaymentInterval = "interval";
  if (durations(f.mudarabahDurations).some((d) => !(d > 0))) p.mudarabahDurations = "durations";
  const share = num(f.mudarabahShare);
  if (!(share >= 0 && share <= 100)) p.mudarabahShare = "percent";
  const equb = num(f.equbShare);
  if (!(equb >= 0 && equb <= 100)) p.equbShare = "percent";
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
  const create = useCreatePilgrimageProduct();
  const update = useUpdatePilgrimageProduct();
  const pending = create.isPending || update.isPending;
  const errs = problems(form);
  const err = (k: keyof Form) => (errs[k] ? tr(errs[k] as never) : undefined);
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
  const amount = (k: keyof Form) => text(k, { type: "number", min: 0, step: "any", inputMode: "decimal" });

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
        <Field label={t("mudarabahDurations")} hint={t("mudarabahDurationsHint")} error={err("mudarabahDurations")}>{text("mudarabahDurations")}</Field>
        <Field label={t("mudarabahShare")} hint={t("mudarabahShareHint")} error={err("mudarabahShare")}>{amount("mudarabahShare")}</Field>
        <Field label={`${t("profitDistribution")} (${tc("optional")})`} className="sm:col-span-2">{text("profitDistribution", { placeholder: t("profitDistributionPlaceholder") })}</Field>
      </Section>

      <Section title={t("sectionFinance")} hint={t("sectionFinanceHint")}>
        <Field label={t("financeMonths")} error={err("financeMonths")}>{amount("financeMonths")}</Field>
        <Field label={t("repaymentInterval")} hint={t("repaymentIntervalHint")} error={err("repaymentInterval")}>{amount("repaymentInterval")}</Field>
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
