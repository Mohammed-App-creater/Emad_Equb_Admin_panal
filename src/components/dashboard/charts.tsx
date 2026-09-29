"use client";

import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { FlaskConical, Table2, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

// Categorical slots 1–4 of the validated reference palette, stepped per
// surface (light / dark both pass the CVD and normal-vision gates on the
// adjacent pairlist), plus a recessive neutral and the chart chrome.
export const PALETTE = {
  light: { s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", s4: "#eda100", muted: "#c9c8c2", grid: "#e7e6e1", axis: "#6b6a65", surface: "#fcfcfb", track: "#ecebe6" },
  dark: { s1: "#3987e5", s2: "#d95926", s3: "#199e70", s4: "#c98500", muted: "#4a4a46", grid: "#2e2e2b", axis: "#a3a29a", surface: "#1a1a19", track: "#2a2a27" },
};
export type Palette = (typeof PALETTE)["light"];

export function usePalette(): Palette {
  const { resolvedTheme } = useTheme();
  return PALETTE[resolvedTheme === "dark" ? "dark" : "light"];
}

export const compact = (v: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** Card with an optional legend, a "Sample data" flag, and a chart/table toggle. */
export function ChartCard({ title, subtitle, children, legend, sample, table, className, aside }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  legend?: { label: string; color: string }[];
  /** When set, the chart is showing sample data; the text explains why. */
  sample?: string;
  table: { head: string[]; rows: string[][] };
  className?: string;
  /** Extra header control (e.g. a filter). */
  aside?: ReactNode;
}) {
  const t = useTranslations("overview");
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {aside}
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-pressed={asTable}
            >
              {asTable ? <BarChart3 size={13} /> : <Table2 size={13} />} {asTable ? t("viewChart") : t("viewTable")}
            </button>
          </div>
        </div>
        {(legend || sample) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legend?.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} /> {l.label}
              </span>
            ))}
            {sample && <SampleTag />}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {asTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {table.head.map((h, i) => <th key={i} className={cn("py-2 font-medium", i > 0 && "text-right")}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    {r.map((cell, j) => <td key={j} className={cn("py-2", j > 0 ? "text-right tabular-nums" : "text-foreground")}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
        {sample && <p className="mt-2 text-[11px] text-muted-foreground">{sample}</p>}
      </CardContent>
    </Card>
  );
}

export function SampleTag() {
  const t = useTranslations("overview");
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
      <FlaskConical size={11} /> {t("sampleData")}
    </span>
  );
}

/** Tooltip in the app's popover style; values in text ink, a swatch carries identity. */
export function ChartTooltip({ active, payload, label, money, total }: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; fill?: string; stroke?: string; payload?: { fill?: string } }[];
  label?: string;
  money?: boolean;
  /** When set, a share of this total is appended (donuts). */
  total?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => {
        const swatch = p.payload?.fill ?? (p.fill && p.fill.startsWith("#") ? p.fill : undefined) ?? p.color ?? p.stroke;
        return (
          <p key={p.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: swatch }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums">
              {money ? formatCurrency(p.value) : p.value}
              {total ? <span className="ml-1 text-muted-foreground">· {pct(p.value, total)}%</span> : null}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export interface DonutSlice { name: string; value: number; color: string }

/**
 * Part-to-whole at a glance: ≤ 4 slices in fixed palette order, a 2px surface
 * gap between slices, the total as a hero number in the hole, and a legend that
 * doubles as direct labels (value + share) so identity is never colour-alone.
 */
export function Donut({ slices, center, centerLabel, money = true, height = 220 }: {
  slices: DonutSlice[];
  center: string;
  centerLabel: string;
  money?: boolean;
  height?: number;
}) {
  const c = usePalette();
  const total = slices.reduce((a, s) => a + s.value, 0);
  const data = slices.filter((s) => s.value > 0);
  // Fit the hero number inside the hole: the currency code ("ETB") goes on its
  // own small line, and the digits shrink with their length (bold digits are
  // roughly 0.6em wide) so "2,332,000.00" never spills over the ring.
  const m = /^([A-Za-z]{2,4})\s+(.+)$/.exec(center);
  const unit = m?.[1];
  const amount = m?.[2] ?? center;
  const hole = height * 0.68 * 0.86;
  const centerSize = Math.max(13, Math.min(26, hole / (amount.length * 0.6)));
  return (
    // Side by side only when the card itself is wide enough (container query);
    // in a narrow card the legend goes underneath at full width so labels and
    // amounts never collide.
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @lg:flex-row @lg:gap-8">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: "—", value: 1, color: c.track }]}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke={c.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {(data.length ? data : [{ name: "—", value: 1, color: c.track }]).map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            {data.length > 0 && <Tooltip content={<ChartTooltip money={money} total={total} />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {unit && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{unit}</span>}
          <span className="whitespace-nowrap font-bold leading-tight tabular-nums text-foreground" style={{ fontSize: centerSize }}>{amount}</span>
          <span className="mt-0.5 max-w-[70%] text-xs leading-tight text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 divide-y divide-border/60">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-[6rem] flex-1 text-sm leading-snug text-muted-foreground">{s.name}</span>
            <span className="shrink-0 text-right">
              <span className="block whitespace-nowrap text-base font-semibold tabular-nums text-foreground">{money ? formatCurrency(s.value) : s.value}</span>
              <span className="block text-xs tabular-nums text-muted-foreground">{pct(s.value, total)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

/** A single ratio against its limit: a ring meter on a same-ramp track. */
export function RingMeter({ value, label, sublabel, size = 132, color }: { value: number; label: string; sublabel?: string; size?: number; color?: string }) {
  const c = usePalette();
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }} title={`${label}: ${Math.round(v)}%`}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.track} strokeWidth={12} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color ?? c.s1}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * circ} ${circ}`}
            style={{ transition: "stroke-dasharray 500ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.65rem] font-bold tabular-nums text-foreground">{Math.round(v)}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}
