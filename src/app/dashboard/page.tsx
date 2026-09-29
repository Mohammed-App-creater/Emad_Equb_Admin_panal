"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CircleDot,
  Users,
  Wallet,
  HandCoins,
  Coins,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatCard, TrustBadge } from "@/components/dashboard/shared";
import { ChartCard, ChartTooltip, Donut, RingMeter, SampleTag, compact, pct, usePalette } from "@/components/dashboard/charts";
import { StatusBadge } from "@/components/equb/status-badge";
import { EqubFilter } from "@/components/equb/equb-filter";
import { useEqubs, useEqubDashboards, useEqubAdminFeesMany, useTakafulLedgers } from "@/hooks/ekub";
import { cn, formatCurrency } from "@/lib/utils";
import type { Equb, EqubDashboard } from "@/types/ekub";

// ---------------------------------------------------------------------------
// Sample data. Shown only where the backend has nothing suitable yet, and
// always flagged "Sample data" on the card so it is never mistaken for live.
// ---------------------------------------------------------------------------
const SAMPLE = {
  equbs: [
    { name: "Sample Equb A", collected: 720000, paidOut: 480000, paid: 18, unpaid: 6 },
    { name: "Sample Equb B", collected: 1240000, paidOut: 960000, paid: 11, unpaid: 1 },
    { name: "Sample Equb C", collected: 390000, paidOut: 120000, paid: 7, unpaid: 3 },
  ],
  moneyFlow: { pool: 2200000, fees: 110000, takaful: 22000 },
  feeSplit: { sacco: 77000, agent: 22000, broker: 11000 },
  rings: { round: 74, progress: 41, payout: 66 },
  takaful: { contribution: 22000, claim: 4500, surplus: 0, refund: 0 },
  pipeline: [
    { key: "pipelineGuarantee", value: 5 },
    { key: "pipelineReady", value: 3 },
    { key: "pipelinePaid", value: 14 },
  ],
  monthly: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((m, i) => ({
    month: m,
    contrib: [310000, 342000, 358000, 371000, 402000, 418000][i],
    fees: [15500, 17100, 17900, 18550, 20100, 20900][i],
    takaful: [3100, 3420, 3580, 3710, 4020, 4180][i],
  })),
};

type Row = { equb: Equb; d?: EqubDashboard };

export default function DashboardPage() {
  const t = useTranslations("overview");
  const tb = useTranslations("brand");
  const tc = useTranslations("common");
  const c = usePalette();

  const { data: allEqubs, isLoading } = useEqubs();
  const [equbId, setEqubId] = useState("all");
  // Every tile and chart below follows this: all Equbs, or the one picked.
  const equbs = equbId === "all" ? allEqubs : (allEqubs ?? []).filter((e) => e.id === equbId);
  // The admin-dashboard endpoint only reports on Equbs that have started.
  const live = (equbs ?? []).filter((e) => e.status !== "draft");
  const liveIds = live.map((e) => e.id);
  const dashboards = useEqubDashboards(liveIds);
  const feeLedgers = useEqubAdminFeesMany(liveIds);
  const takafulLedgers = useTakafulLedgers(liveIds);

  const rows: Row[] = live.map((equb, i) => ({ equb, d: dashboards[i]?.data }));
  const withData = rows.filter((r): r is Required<Row> => !!r.d);
  const loadingDash = dashboards.some((q) => q.isLoading);
  const sum = (pick: (d: EqubDashboard) => number) => withData.reduce((a, r) => a + pick(r.d), 0);

  // ---- headline numbers -------------------------------------------------
  const kpi = {
    activeEqubs: (equbs ?? []).filter((e) => e.status === "active").length,
    totalEqubs: equbs?.length ?? 0,
    active: sum((d) => d.activeMembers),
    suspended: sum((d) => d.suspendedMembers),
    total: sum((d) => d.totalMembers),
    collected: sum((d) => d.totalCollected),
    paidOut: sum((d) => d.totalPayouts),
    adminFees: sum((d) => d.totalAdminFees),
    takafulFees: sum((d) => d.totalTakafulFees),
    takaful: sum((d) => d.takafulBalance),
  };
  const busy = (v: number) => (loadingDash && !v ? "…" : formatCurrency(v));

  // ---- where each birr goes (real when anything was collected) ----------
  const flowSample = kpi.collected <= 0;
  // Fees can never exceed what was collected; clamp so a bad figure from one
  // Equb cannot blow the whole donut up.
  const feesClamped = Math.min(Math.max(0, kpi.adminFees), Math.max(0, kpi.collected));
  const takafulClamped = Math.min(Math.max(0, kpi.takafulFees), Math.max(0, kpi.collected - feesClamped));
  const flow = flowSample ? SAMPLE.moneyFlow : { pool: Math.max(0, kpi.collected - feesClamped - takafulClamped), fees: feesClamped, takaful: takafulClamped };
  const flowSlices = [
    { name: t("contributionsPool"), value: flow.pool, color: c.s1 },
    { name: t("adminFeeSlice"), value: flow.fees, color: c.s2 },
    { name: t("takafulSlice"), value: flow.takaful, color: c.s3 },
  ];

  // ---- rings ----------------------------------------------------------------
  const activeRows = withData.filter((r) => r.equb.status === "active");
  const paidNow = activeRows.reduce((a, r) => a + r.d.paidThisRound, 0);
  const dueNow = activeRows.reduce((a, r) => a + r.d.paidThisRound + r.d.unpaidThisRound, 0);
  const roundsDone = activeRows.reduce((a, r) => a + r.d.currentRound - 1, 0);
  const roundsAll = activeRows.reduce((a, r) => a + r.d.totalRounds, 0);
  const ringsSample = dueNow === 0 && kpi.collected === 0;
  const rings = ringsSample
    ? SAMPLE.rings
    : { round: pct(paidNow, dueNow), progress: pct(Math.max(0, roundsDone), roundsAll), payout: pct(kpi.paidOut, kpi.collected) };

  // ---- admin fee split (real from the fee ledgers) ---------------------------
  const feeData = feeLedgers.map((q) => q.data).filter(Boolean);
  const split = feeData.reduce(
    (a, f) => ({ sacco: a.sacco + f!.split.saccoAmount, agent: a.agent + f!.split.agentAmount, broker: a.broker + f!.split.brokerAmount }),
    { sacco: 0, agent: 0, broker: 0 }
  );
  const splitSample = split.sacco + split.agent + split.broker <= 0;
  const splitUse = splitSample ? SAMPLE.feeSplit : split;
  const splitSlices = [
    { name: t("sacco"), value: splitUse.sacco, color: c.s1 },
    { name: t("agent"), value: splitUse.agent, color: c.s2 },
    { name: t("broker"), value: splitUse.broker, color: c.s3 },
  ];

  // ---- portfolio donuts (always real: they come from the Equb list) ----------
  const statusKeys = ["active", "draft", "completed", "cancelled"] as const;
  const statusColors = { active: c.s1, draft: c.muted, completed: c.s3, cancelled: c.s2 };
  const statusSlices = statusKeys.map((k) => ({ name: t(`status${k.charAt(0).toUpperCase()}${k.slice(1)}`), value: (equbs ?? []).filter((e) => e.status === k).length, color: statusColors[k] }));

  const byCategory = new Map<string, number>();
  for (const e of equbs ?? []) byCategory.set(e.category?.name ?? "—", (byCategory.get(e.category?.name ?? "—") ?? 0) + e.currentMembers);
  const catSorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const catTop = catSorted.slice(0, 3);
  const catOther = catSorted.slice(3).reduce((a, [, v]) => a + v, 0);
  const catSlices = [
    ...catTop.map(([name, value], i) => ({ name, value, color: [c.s1, c.s2, c.s3][i] })),
    ...(catOther > 0 ? [{ name: t("other"), value: catOther, color: c.muted }] : []),
  ];

  // ---- by-Equb bars ------------------------------------------------------------
  const moneyReal = withData.map((r) => ({ name: r.equb.name, collected: r.d.totalCollected, paidOut: r.d.totalPayouts }));
  const moneySample = moneyReal.every((x) => x.collected === 0 && x.paidOut === 0);
  const money = moneySample ? SAMPLE.equbs : moneyReal;
  const roundReal = activeRows.map((r) => ({ name: r.equb.name, paid: r.d.paidThisRound, unpaid: r.d.unpaidThisRound }));
  const roundSample = roundReal.every((x) => x.paid + x.unpaid === 0);
  const round = roundSample ? SAMPLE.equbs : roundReal;

  // ---- takaful movements (real from the ledgers) -------------------------------
  const moves = { contribution: 0, claim: 0, surplus: 0, refund: 0 };
  for (const q of takafulLedgers) for (const tx of q.data ?? []) if (tx.type in moves) moves[tx.type as keyof typeof moves] += tx.amount;
  const movesSample = Object.values(moves).every((v) => v === 0);
  const movesUse = movesSample ? SAMPLE.takaful : moves;
  const movesData = [
    { name: t("takafulIn"), value: movesUse.contribution },
    { name: t("takafulClaims"), value: movesUse.claim },
    { name: t("takafulSurplus"), value: movesUse.surplus },
    { name: t("takafulRefund"), value: movesUse.refund },
  ];

  const pipeline = SAMPLE.pipeline.map((p) => ({ name: t(p.key), value: p.value }));
  const monthly = SAMPLE.monthly;

  // ---- attention -----------------------------------------------------------------
  const attention = activeRows
    .map((r) => ({
      equb: r.equb,
      items: [
        r.d.unpaidThisRound > 0 && { tone: "warning", text: t("attentionUnpaid", { count: r.d.unpaidThisRound }) },
        r.d.suspendedMembers > 0 && { tone: "destructive", text: t("attentionSuspended", { count: r.d.suspendedMembers }) },
        r.d.unpaidThisRound === 0 && r.d.eligibleForDraw > 0 && { tone: "success", text: t("attentionReady", { count: r.d.eligibleForDraw }) },
      ].filter(Boolean) as { tone: string; text: string }[],
    }))
    .filter((a) => a.items.length > 0);

  const chartHeight = (n: number) => Math.max(160, n * 56 + 40);
  const ellipsis = (v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v);
  const axisProps = { stroke: c.axis, fontSize: 13, tickLine: false, axisLine: false } as const;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<TrustBadge label={tb("tagline")} />} />

      <EqubFilter value={equbId} onChange={setEqubId} equbs={allEqubs ?? []} loading={isLoading} label={t("equb")} allLabel={tc("all")} />

      {(allEqubs?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
          <CircleDot size={26} className="text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("noEqubs")}</p>
        </div>
      )}

      {/* Headline numbers: stat tiles, not charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={t("activeEqubs")} value={kpi.activeEqubs} hint={t("ofTotal", { total: kpi.totalEqubs })} icon={CircleDot} tone="primary" />
        <StatCard label={t("members")} value={loadingDash && !kpi.total ? "…" : kpi.total} hint={t("membersHint", { active: kpi.active, suspended: kpi.suspended })} icon={Users} tone="info" />
        <StatCard label={t("collected")} value={busy(kpi.collected)} icon={Wallet} tone="success" />
        <StatCard label={t("paidOut")} value={busy(kpi.paidOut)} icon={HandCoins} tone="secondary" />
        <StatCard label={t("adminFees")} value={busy(kpi.adminFees)} icon={Coins} tone="info" />
        <StatCard label={t("takaful")} value={busy(kpi.takaful)} icon={PiggyBank} tone="primary" />
      </div>

      {/* Money flow: donut · rings · donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("moneyFlow")}
          subtitle={t("moneyFlowSub")}
          sample={flowSample ? t("sampleNoData") : undefined}
          table={{ head: ["", t("amount"), t("slice")], rows: flowSlices.map((s) => [s.name, formatCurrency(s.value), `${pct(s.value, flow.pool + flow.fees + flow.takaful)}%`]) }}
        >
          <Donut slices={flowSlices} center={formatCurrency(flow.pool + flow.fees + flow.takaful)} centerLabel={t("collected")} />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{t("health")}</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("healthSub")}</p>
              </div>
              {ringsSample && <SampleTag />}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="grid grid-cols-3 items-start gap-2">
            <RingMeter size={104} value={rings.round} label={t("ringRound")} sublabel={ringsSample ? undefined : t("ringRoundSub", { paid: paidNow, total: dueNow })} color={c.s1} />
            <RingMeter size={104} value={rings.progress} label={t("ringProgress")} sublabel={t("ringProgressSub")} color={c.s3} />
            <RingMeter size={104} value={rings.payout} label={t("ringPayout")} sublabel={ringsSample ? undefined : t("ringPayoutSub", { paid: compact(kpi.paidOut), collected: compact(kpi.collected) })} color={c.s2} />
            </div>

          <div className="mt-2 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("progress")}</p>
            <div className="space-y-4">
            {withData.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
            {withData.map((r) => (
              <Link key={r.equb.id} href={`/dashboard/equbs/${r.equb.id}`} className="group space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground group-hover:underline">{r.equb.name}</span>
                  <StatusBadge status={r.equb.status} kind="lifecycle" />
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, r.d.progressPercent))}%`, background: c.s1 }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("roundOf", { current: r.d.currentRound, total: r.d.totalRounds })} · {Math.round(r.d.progressPercent)}%
                </p>
              </Link>
            ))}
            </div>
          </div>
          </CardContent>
          {ringsSample && <p className="px-6 pb-4 text-[11px] text-muted-foreground">{t("sampleNoData")}</p>}
        </Card>

        <ChartCard
          title={t("feeSplit")}
          subtitle={t("feeSplitSub")}
          sample={splitSample ? t("sampleNoData") : undefined}
          table={{ head: ["", t("amount"), t("slice")], rows: splitSlices.map((s) => [s.name, formatCurrency(s.value), `${pct(s.value, splitUse.sacco + splitUse.agent + splitUse.broker)}%`]) }}
        >
          <Donut slices={splitSlices} center={formatCurrency(splitUse.sacco + splitUse.agent + splitUse.broker)} centerLabel={t("adminFees")} />
        </ChartCard>
      </div>

      {/* Portfolio: two donuts + two bar charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("equbsByStatus")}
          subtitle={t("equbsByStatusSub")}
          table={{ head: [t("status"), t("count")], rows: statusSlices.map((s) => [s.name, String(s.value)]) }}
        >
          <Donut slices={statusSlices} center={String(kpi.totalEqubs)} centerLabel={t("equb")} money={false} />
        </ChartCard>

        <ChartCard
          title={t("membersByCategory")}
          subtitle={t("membersByCategorySub")}
          table={{ head: [t("category"), t("members")], rows: catSlices.map((s) => [s.name, String(s.value)]) }}
        >
          <Donut slices={catSlices} center={String(catSlices.reduce((a, s) => a + s.value, 0))} centerLabel={t("members")} money={false} />
        </ChartCard>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("attention")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loadingDash ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : attention.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success"><CheckCircle2 size={16} /> {t("allClear")}</p>
            ) : (
              attention.map((a) => (
                <Link key={a.equb.id} href={`/dashboard/equbs/${a.equb.id}?tab=rounds`} className="block rounded-xl border border-border p-3 transition hover:bg-accent">
                  <p className="truncate text-sm font-medium text-foreground">{a.equb.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {a.items.map((i) => (
                      <span key={i.text} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", i.tone === "success" ? "bg-success/10 text-success" : i.tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning")}>
                        {i.tone === "success" ? <Ticket size={12} /> : <AlertTriangle size={12} />} {i.text}
                      </span>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <ChartCard
          title={t("collectedVsPaid")}
          sample={moneySample ? t("sampleNoData") : undefined}
          legend={[{ label: t("collectedSeries"), color: c.s1 }, { label: t("paidSeries"), color: c.s2 }]}
          table={{ head: [t("equb"), t("collectedSeries"), t("paidSeries")], rows: money.map((m) => [m.name, formatCurrency(m.collected), formatCurrency(m.paidOut)]) }}
        >
          <ResponsiveContainer width="100%" height={chartHeight(money.length)}>
            <BarChart data={money} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" tickFormatter={compact} {...axisProps} />
              <YAxis type="category" dataKey="name" width={140} {...axisProps} fontSize={13} tickFormatter={ellipsis} />
              <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} content={<ChartTooltip money />} />
              <Bar dataKey="collected" name={t("collectedSeries")} fill={c.s1} radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="paidOut" name={t("paidSeries")} fill={c.s2} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spans two columns so the row has no empty slot next to it. */}
        <ChartCard
          className="xl:col-span-2"
          title={t("thisRound")}
          sample={roundSample ? t("sampleNoData") : undefined}
          legend={[{ label: t("paid"), color: c.s1 }, { label: t("unpaid"), color: c.muted }]}
          table={{ head: [t("equb"), t("paid"), t("unpaid")], rows: round.map((r) => [r.name, String(r.paid), String(r.unpaid)]) }}
        >
          <ResponsiveContainer width="100%" height={chartHeight(round.length)}>
            <BarChart data={round} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap="36%">
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="name" width={140} {...axisProps} fontSize={13} tickFormatter={ellipsis} />
              <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} content={<ChartTooltip />} />
              <Bar dataKey="paid" name={t("paid")} stackId="r" fill={c.s1} stroke={c.surface} strokeWidth={2} maxBarSize={18} />
              <Bar dataKey="unpaid" name={t("unpaid")} stackId="r" fill={c.muted} stroke={c.surface} strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Funds & flow over time */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("takafulMoves")}
          subtitle={t("takafulMovesSub")}
          sample={movesSample ? t("sampleTakafulNote") : undefined}
          table={{ head: ["", t("amount")], rows: movesData.map((m) => [m.name, formatCurrency(m.value)]) }}
        >
          <ResponsiveContainer width="100%" height={chartHeight(4)}>
            <BarChart data={movesData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" tickFormatter={compact} {...axisProps} />
              <YAxis type="category" dataKey="name" width={120} {...axisProps} fontSize={13} />
              <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} content={<ChartTooltip money />} />
              <Bar dataKey="value" name={t("amount")} fill={c.s3} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t("pipeline")}
          subtitle={t("pipelineSub")}
          sample={t("samplePipelineNote")}
          table={{ head: [t("stage"), t("count")], rows: pipeline.map((p) => [p.name, String(p.value)]) }}
        >
          <ResponsiveContainer width="100%" height={chartHeight(3)}>
            <BarChart data={pipeline} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="name" width={120} {...axisProps} fontSize={13} />
              <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} content={<ChartTooltip />} />
              <Bar dataKey="value" name={t("count")} fill={c.s2} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t("monthly")}
          subtitle={t("monthlySub")}
          sample={t("sampleMonthlyNote")}
          legend={[{ label: t("monthContrib"), color: c.s1 }, { label: t("monthFees"), color: c.s2 }, { label: t("monthTakaful"), color: c.s3 }]}
          table={{ head: [t("month"), t("monthContrib"), t("monthFees"), t("monthTakaful")], rows: monthly.map((m) => [m.month, formatCurrency(m.contrib), formatCurrency(m.fees), formatCurrency(m.takaful)]) }}
        >
          <ResponsiveContainer width="100%" height={chartHeight(3)}>
            <BarChart data={monthly} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis tickFormatter={compact} width={52} {...axisProps} />
              <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} content={<ChartTooltip money />} />
              <Bar dataKey="contrib" name={t("monthContrib")} stackId="m" fill={c.s1} stroke={c.surface} strokeWidth={2} maxBarSize={28} />
              <Bar dataKey="fees" name={t("monthFees")} stackId="m" fill={c.s2} stroke={c.surface} strokeWidth={2} maxBarSize={28} />
              <Bar dataKey="takaful" name={t("monthTakaful")} stackId="m" fill={c.s3} stroke={c.surface} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

    </div>
  );
}
