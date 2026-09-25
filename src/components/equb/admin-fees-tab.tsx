"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins, CheckCircle2, Clock, Info, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard } from "@/components/dashboard/shared";
import { StatusBadge } from "@/components/equb/status-badge";
import { useEqubAdminFees, useMemberAdminFees, useRoundAdminFees, useRounds } from "@/hooks/ekub";
import { RoundSelect, currentRoundOf } from "@/components/equb/contributions-tab";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { EqubAdminFees, Equb, FeeLine, FeeSplit, FeeTotals } from "@/types/ekub";

type RoundRow = EqubAdminFees["rounds"][number];
type MemberRow = EqubAdminFees["members"][number];

/**
 * Admin-fee ledger of one Equb. A round filter (the current round by default)
 * switches between one round's line-by-line ledger and the whole-Equb view
 * broken down by round and by member.
 */
export function AdminFeesTab({ equb }: { equb: Equb }) {
  const t = useTranslations("adminFees");
  const tcon = useTranslations("contributions");
  const { data: rounds } = useRounds(equb.id);
  const current = useMemo(() => currentRoundOf(rounds), [rounds]);
  const started = (rounds ?? []).filter((r) => r.status !== "scheduled" || r.memberPayments.length > 0);
  const [roundFilter, setRoundFilter] = useState<string>("current");
  const focus = roundFilter === "current" ? current : roundFilter === "all" ? undefined : rounds?.find((r) => r.id === roundFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {focus ? t("showingRound", { n: focus.roundNumber }) : t("showingAll")}
          {focus && focus.id === current?.id && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{tcon("currentRound")}</span>}
        </p>
        <RoundSelect rounds={started} value={roundFilter} onChange={setRoundFilter} current={current} label={tcon("roundFilter")} allLabel={tcon("allRounds")} currentLabel={tcon("currentRound")} />
      </div>
      {focus ? <RoundFeesView roundId={focus.id} /> : <GroupFeesView equb={equb} />}
    </div>
  );
}

/** One round's fee ledger: totals, split and a line per member. */
function RoundFeesView({ roundId }: { roundId: string }) {
  const t = useTranslations("adminFees");
  const { data, isLoading } = useRoundAdminFees(roundId);
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("charged")} value={formatCurrency(data.totals.charged)} icon={Coins} tone="info" />
        <StatCard label={t("collected")} value={formatCurrency(data.totals.collected)} hint={`${data.lines.filter((l) => l.collected).length}/${data.lines.length}`} icon={CheckCircle2} tone="success" />
        <StatCard label={t("outstanding")} value={formatCurrency(data.totals.outstanding)} icon={Clock} tone={data.totals.outstanding > 0 ? "warning" : "primary"} />
      </div>
      <SplitCard split={data.split} />
      <Card>
        <CardHeader><CardTitle className="text-base">{t("byMember")}</CardTitle></CardHeader>
        <CardContent><FeeLinesTable lines={data.lines} by="member" /></CardContent>
      </Card>
    </div>
  );
}

/** Whole-Equb ledger: totals, split, by round and by member. */
function GroupFeesView({ equb }: { equb: Equb }) {
  const t = useTranslations("adminFees");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data, isLoading } = useEqubAdminFees(equb.id);
  const [memberId, setMemberId] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  const roundColumns: DataTableColumn<RoundRow>[] = [
    { id: "round", header: t("round"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">#{r.roundNumber}</span> },
    { id: "date", header: t("scheduled"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.scheduledAt)}</span> },
    { id: "paid", header: t("paidMembers"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{r.paidCount}/{r.members}</span> },
    ...totalsColumns<RoundRow>(t, (r) => r.totals),
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="round" /> },
  ];
  const memberColumns: DataTableColumn<MemberRow>[] = [
    { id: "member", sortValue: (r) => r.name, header: tc("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.membershipNumber}</p>
      </div>
    ) },
    { id: "paid", sortValue: (r) => r.paidCount, header: t("paidRounds"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{r.paidCount}/{r.rounds}</span> },
    ...totalsColumns<MemberRow>(t, (r) => r.totals),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("note", { fee: formatCurrency(data.feePerMemberPerRound) })}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("charged")} value={formatCurrency(data.totals.charged)} icon={Coins} tone="info" />
        <StatCard label={t("collected")} value={formatCurrency(data.totals.collected)} icon={CheckCircle2} tone="success" />
        <StatCard label={t("outstanding")} value={formatCurrency(data.totals.outstanding)} icon={Clock} tone={data.totals.outstanding > 0 ? "warning" : "primary"} />
      </div>

      <SplitCard split={data.split} />

      <Card>
        <CardHeader><CardTitle className="text-base">{t("byRound")}</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            bare
            filters={{ facets: [{ id: "status", label: tc("status"), get: (r) => r.status }, { id: "outstanding", label: t("outstanding"), get: (r) => (r.totals.outstanding > 0 ? "outstanding" : "settled"), options: [{ value: "outstanding", label: t("outstanding") }, { value: "settled", label: t("settled") }] }] }}
            columns={roundColumns}
            data={data.rounds}
            rowKey={(r) => r.roundId}
            onRowClick={(r) => router.push(`/dashboard/equbs/${equb.id}/rounds/${r.roundId}`)}
            emptyTitle={tc("noData")}
            actions={[{ label: tc("view"), icon: Eye, onClick: (r) => router.push(`/dashboard/equbs/${equb.id}/rounds/${r.roundId}`) }]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("byMember")}</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            bare
            filters={{ search: { keys: (r) => [r.name, r.membershipNumber] }, facets: [{ id: "outstanding", label: t("outstanding"), get: (r) => (r.totals.outstanding > 0 ? "outstanding" : "settled"), options: [{ value: "outstanding", label: t("outstanding") }, { value: "settled", label: t("settled") }] }] }}
            columns={memberColumns}
            data={data.members}
            rowKey={(r) => r.memberId}
            onRowClick={(r) => setMemberId(r.memberId)}
            avatar={(r) => ({ initials: getInitials(r.name), colorClass: r.totals.outstanding > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success" })}
            emptyTitle={tc("noData")}
            actions={[{ label: t("viewLedger"), icon: Eye, onClick: (r) => setMemberId(r.memberId) }]}
          />
        </CardContent>
      </Card>

      <MemberLedgerModal equbId={equb.id} memberId={memberId} onClose={() => setMemberId(null)} />
    </div>
  );
}

function totalsColumns<T>(t: ReturnType<typeof useTranslations>, get: (r: T) => FeeTotals): DataTableColumn<T>[] {
  return [
    { id: "charged", sortValue: (r) => get(r).charged, header: t("charged"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{formatCurrency(get(r).charged)}</span> },
    { id: "collected", sortValue: (r) => get(r).collected, header: t("collected"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm font-medium text-success">{formatCurrency(get(r).collected)}</span> },
    { id: "outstanding", sortValue: (r) => get(r).outstanding, header: t("outstanding"), mobile: "detail", align: "right", cell: (r) => {
      const v = get(r).outstanding;
      return <span className={v > 0 ? "text-sm font-medium text-warning" : "text-sm text-muted-foreground"}>{formatCurrency(v)}</span>;
    } },
  ];
}

/** SACCO / agent / broker share of the collected admin fee. */
export function SplitCard({ split, title }: { split: FeeSplit; title?: string }) {
  const t = useTranslations("adminFees");
  const parts = [
    { key: "sacco", label: t("sacco"), percent: split.saccoPercent, amount: split.saccoAmount, tone: "bg-primary" },
    { key: "agent", label: t("agent"), percent: split.agentPercent, amount: split.agentAmount, tone: "bg-info" },
    { key: "broker", label: t("broker"), percent: split.brokerPercent, amount: split.brokerAmount, tone: "bg-secondary" },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title ?? t("split")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {parts.map((p) => p.percent > 0 && <div key={p.key} className={p.tone} style={{ width: `${p.percent}%` }} title={`${p.label} ${p.percent}%`} />)}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {parts.map((p) => (
            <div key={p.key} className="rounded-2xl bg-muted/40 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${p.tone}`} /> {p.label} · {p.percent}%</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(p.amount)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("splitHint")}</p>
      </CardContent>
    </Card>
  );
}

/** Line-by-line fee table, shared by the member ledger and the round detail. */
export function FeeLinesTable({ lines, by }: { lines: FeeLine[]; by: "round" | "member" }) {
  const t = useTranslations("adminFees");
  const tc = useTranslations("common");
  const columns: DataTableColumn<FeeLine>[] = [
    by === "member"
      ? { id: "member", header: tc("member"), mobile: "title", cell: (l) => (
          <div>
            <p className="font-medium text-foreground">{l.memberName}</p>
            <p className="text-xs text-muted-foreground">{l.membershipNumber}</p>
          </div>
        ) }
      : { id: "round", header: t("round"), mobile: "title", cell: (l) => <span className="font-medium text-foreground">#{l.roundNumber} <span className="text-xs font-normal text-muted-foreground">· {formatDate(l.scheduledAt)}</span></span> },
    { id: "amount", header: t("fee"), mobile: "detail", align: "right", cell: (l) => <span className="text-sm font-medium">{formatCurrency(l.amount)}</span> },
    { id: "catchUp", header: t("catchUp"), mobile: "detail", align: "center", cell: (l) => (l.isCatchUp ? <Badge className="bg-info/15 text-info">{t("catchUp")}</Badge> : <span className="text-muted-foreground">—</span>) },
    { id: "paidAt", header: t("paidAt"), mobile: "detail", cell: (l) => <span className="text-sm">{l.paidAt ? formatDateTime(l.paidAt) : "—"}</span> },
    { id: "state", header: tc("status"), mobile: "badge", cell: (l) => (
      <Badge className={l.collected ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}>{l.collected ? t("collected") : t("notCollected")}</Badge>
    ) },
  ];
  return <DataTable bare filters={{ search: { keys: (l) => [l.memberName, l.membershipNumber, `#${l.roundNumber}`] }, facets: [{ id: "collected", label: t("collected"), get: (l) => (l.collected ? "collected" : "not_collected"), options: [{ value: "collected", label: t("collected") }, { value: "not_collected", label: t("notCollected") }] }] }} columns={columns} data={lines} rowKey={(l) => l.contributionId || `${l.roundId}-${l.memberId}`} emptyTitle={tc("noData")} />;
}

function MemberLedgerModal({ equbId, memberId, onClose }: { equbId: string; memberId: string | null; onClose: () => void }) {
  const t = useTranslations("adminFees");
  const { data, isLoading } = useMemberAdminFees(equbId, memberId);
  return (
    <Modal open={!!memberId} onOpenChange={(o) => !o && onClose()} title={data ? `${data.name} · ${data.membershipNumber}` : t("memberLedger")} className="max-w-3xl">
      {isLoading || !data ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Mini label={t("charged")} value={formatCurrency(data.totals.charged)} />
            <Mini label={t("collected")} value={formatCurrency(data.totals.collected)} tone="text-success" />
            <Mini label={t("outstanding")} value={formatCurrency(data.totals.outstanding)} tone={data.totals.outstanding > 0 ? "text-warning" : undefined} />
          </div>
          <FeeLinesTable lines={data.lines} by="round" />
        </div>
      )}
    </Modal>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className={`text-base font-bold ${tone ?? "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
