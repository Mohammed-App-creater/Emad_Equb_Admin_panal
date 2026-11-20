"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { CalendarClock, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useUpdateCycleDates } from "@/hooks/pilgrimage";
import { Field, useErrorToast } from "@/components/pilgrimage/shared";
import { cn, formatDate } from "@/lib/utils";
import { CYCLE_DATES, type CycleDateKey, type CycleStatus, type Frequency, type PilgrimageCycle, type PilgrimageProduct } from "@/types/pilgrimage";

/** A cycle's dates as YYYY-MM-DD, every one set. */
export type CycleDates = Record<CycleDateKey, string>;

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s: string) => new Date(`${s}T00:00:00`);

/** A backend timestamp as the local YYYY-MM-DD it stands for. */
export const toDay = (iso: string | null | undefined) => (iso ? ymd(new Date(iso)) : "");

const addPeriod = (d: Date, f: Frequency) => {
  switch (f) {
    case "annual": return addYears(d, 1);
    case "semi_annual": return addMonths(d, 6);
    case "quarterly": return addMonths(d, 3);
    case "monthly": return addMonths(d, 1);
    case "biweekly": return addWeeks(d, 2);
    case "weekly": return addWeeks(d, 1);
    default: return addDays(d, 1);
  }
};

/**
 * The calendar the backend gives a new cycle when dates are left out, worked
 * out from what was given: the draw one period after opening, registration
 * closing registration_close_days before it, winners' contract deadline
 * winner_contract_days and closing decision_window_days after it.
 */
export function defaultCycleDates(p: PilgrimageProduct, given: Partial<CycleDates>): CycleDates {
  const opens = given.opens_at || ymd(new Date());
  const draw = given.draw_at || ymd(addPeriod(parse(opens), p.cycle_frequency));
  let reg = given.registration_closes_at || ymd(addDays(parse(draw), -p.registration_close_days));
  if (!given.registration_closes_at && reg < opens) reg = opens;
  return {
    opens_at: opens,
    registration_closes_at: reg,
    draw_at: draw,
    contract_deadline: given.contract_deadline || ymd(addDays(parse(draw), Math.max(p.winner_contract_days || 30, 1))),
    closes_at: given.closes_at || ymd(addDays(parse(draw), Math.max(p.decision_window_days, 1))),
  };
}

/** The ordering rules the backend enforces (domain CycleDates.Validate), per field. */
export function cycleDateProblems(d: CycleDates): Partial<Record<CycleDateKey, string>> {
  const p: Partial<Record<CycleDateKey, string>> = {};
  CYCLE_DATES.forEach((k) => { if (!d[k]) p[k] = "required"; });
  if (Object.keys(p).length) return p;
  if (d.registration_closes_at < d.opens_at) p.registration_closes_at = "regBeforeOpen";
  if (d.draw_at <= d.opens_at) p.draw_at = "drawAfterOpen";
  else if (d.draw_at < d.registration_closes_at) p.draw_at = "drawBeforeReg";
  if (d.contract_deadline <= d.draw_at) p.contract_deadline = "afterDraw";
  if (d.closes_at <= d.draw_at) p.closes_at = "afterDraw";
  return p;
}

/** Which dates may still change at a cycle's status (as the backend allows). */
export function editableDates(status: CycleStatus): CycleDateKey[] {
  switch (status) {
    case "open": return [...CYCLE_DATES];
    case "locked": return ["draw_at", "contract_deadline", "closes_at"];
    case "drawn": return ["contract_deadline", "closes_at"];
    default: return [];
  }
}

/** The five date inputs, in calendar order, each with what it means. */
export function CycleDatesFields({ value, onChange, editable = CYCLE_DATES }: {
  value: CycleDates; onChange: (key: CycleDateKey, v: string) => void; editable?: readonly CycleDateKey[];
}) {
  const t = useTranslations("pilgrimage.cycleDates");
  const problems = cycleDateProblems(value);
  return (
    <ol className="space-y-3">
      {CYCLE_DATES.map((k, i) => (
        <li key={k} className="grid grid-cols-[1.5rem_1fr] gap-2">
          <span className="mt-8 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
          <Field label={t(k)} hint={t(`${k}_hint`)} error={problems[k] ? t(`rule_${problems[k]}` as never) : undefined}>
            <Input type="date" value={value[k]} disabled={!editable.includes(k)} onChange={(e) => onChange(k, e.target.value)} />
          </Field>
        </li>
      ))}
    </ol>
  );
}

/** A cycle's calendar as a timeline: what is done, what is next. */
export function CycleCalendar({ cycle, className }: {
  cycle: Pick<PilgrimageCycle, CycleDateKey> & { status?: CycleStatus; decision_deadline?: string | null };
  className?: string;
}) {
  const t = useTranslations("pilgrimage.cycleDates");
  const [today] = useState(() => ymd(new Date()));
  const next = CYCLE_DATES.find((k) => toDay(cycle[k]) >= today);
  return (
    <ol className={cn("relative space-y-3 border-l border-border pl-5", className)}>
      {CYCLE_DATES.map((k) => {
        const day = toDay(cycle[k]);
        const past = day < today;
        return (
          <li key={k} className="relative">
            <span className={cn(
              "absolute -left-[1.62rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-card",
              past ? "border-success bg-success text-success-foreground" : k === next ? "border-primary" : "border-border",
            )}>
              {past && <Check size={10} strokeWidth={3} />}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className={cn("text-sm", k === next ? "font-semibold text-foreground" : past ? "text-muted-foreground" : "text-foreground")}>{t(k)}</span>
              <span className={cn("text-sm tabular-nums", k === next ? "font-semibold text-primary" : "text-muted-foreground")}>{formatDate(cycle[k])}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t(`${k}_hint`)}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Changes a cycle's dates; only those its status still allows are editable. */
export function EditCycleDatesModal({ cycle, onClose }: { cycle: PilgrimageCycle | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycleDates");
  return (
    <Modal open={!!cycle} onOpenChange={(o) => !o && onClose()} title={t("editTitle", { name: cycle?.name ?? "" })} className="max-w-lg">
      {cycle && <EditBody key={cycle.id} cycle={cycle} onClose={onClose} />}
    </Modal>
  );
}

function EditBody({ cycle, onClose }: { cycle: PilgrimageCycle; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycleDates");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const update = useUpdateCycleDates();
  const original: CycleDates = Object.fromEntries(CYCLE_DATES.map((k) => [k, toDay(cycle[k])])) as CycleDates;
  const [dates, setDates] = useState<CycleDates>(original);
  const editable = editableDates(cycle.status);
  const changed = CYCLE_DATES.filter((k) => dates[k] !== original[k]);
  const valid = Object.keys(cycleDateProblems(dates)).length === 0;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(`editHint_${cycle.status}` as never)}</p>
      <CycleDatesFields value={dates} editable={editable} onChange={(k, v) => setDates((d) => ({ ...d, [k]: v }))} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!valid || changed.length === 0 || update.isPending}
          onClick={() => update.mutate(
            { id: cycle.id, dates: Object.fromEntries(changed.map((k) => [k, dates[k]])) },
            { onSuccess: () => { toast({ title: t("saved") }); onClose(); }, onError },
          )}>
          {update.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <CalendarClock size={15} className="mr-1" />} {tc("save")}
        </Button>
      </div>
    </div>
  );
}
