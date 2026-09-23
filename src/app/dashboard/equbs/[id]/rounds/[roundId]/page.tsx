"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Play, ShieldCheck, Trophy, Info, Users, Wallet, Coins, HandCoins, CalendarClock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { WinnersTable } from "@/components/equb/winners-tab";
import { useEqub, useRound, useDrawPreview, useExecuteDraw, useRoundWinners } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from "@/lib/utils";
import type { ExcludedMember, Round, RoundMemberPayment } from "@/types/ekub";

const isPaid = (p: RoundMemberPayment) => p.status?.toLowerCase() === "paid" || !!p.paidAt;

function RoundDetailInner({ equbId, roundId }: { equbId: string; roundId: string }) {
  const t = useTranslations("rounds");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canExecute = has(EKUB_PERMS.DRAW_EXECUTE);

  const { data: equb } = useEqub(equbId);
  const { data: round, isLoading, isError } = useRound(roundId);
  const drawn = !!round && (round.status === "drawn" || round.status === "completed" || round.winners.length > 0);
  const { data: preview, isLoading: previewLoading } = useDrawPreview(roundId, !!round && !drawn);
  const { data: winners, isLoading: winnersLoading } = useRoundWinners(roundId, round?.roundNumber, drawn);
  const execute = useExecuteDraw();

  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [confirming, setConfirming] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (isError || !round) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Link href={`/dashboard/equbs/${equbId}?tab=rounds`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> {t("backToEqub")}
        </Link>
        <p className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const payments = round.memberPayments.filter((p) => (filter === "all" ? true : filter === "paid" ? isPaid(p) : !isPaid(p)));
  const paidCount = round.memberPayments.length ? round.memberPayments.filter(isPaid).length : round.paidCount;
  const unpaidCount = round.memberPayments.length ? round.memberPayments.length - paidCount : round.unpaidCount;
  const canDraw = preview ? preview.canExecute : round.canExecuteDraw;
  const eligible = preview?.eligible ?? round.eligibleMembers;
  const excluded = preview?.excluded ?? round.excludedMembers;
  const eligibleCount = preview?.eligibleCount ?? round.eligibleCount;
  const excludedCount = preview?.excludedCount ?? round.excludedCount;

  const paymentColumns: DataTableColumn<RoundMemberPayment>[] = [
    { id: "member", header: tc("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.phone || "—"}</p>
      </div>
    ) },
    { id: "amount", header: tc("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "paidAt", header: t("paidAt"), mobile: "detail", cell: (r) => <span className="text-sm">{r.paidAt ? formatDateTime(r.paidAt) : "—"}</span> },
    { id: "catchUp", header: t("catchUp"), mobile: "detail", align: "center", cell: (r) => (r.isCatchUp ? <Badge className="bg-info/15 text-info">{t("catchUp")}</Badge> : <span className="text-muted-foreground">—</span>) },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={isPaid(r) ? "paid" : r.status || "unpaid"} kind="payment" /> },
  ];

  const runDraw = () =>
    execute.mutate(
      { roundId, equbId },
      {
        onSuccess: (r: Round) => { toast({ title: t("drawDone"), description: `${r.winners.length} ${t("winners")}` }); setConfirming(false); },
        onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
      }
    );

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href={`/dashboard/equbs/${equbId}?tab=rounds`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {t("backToEqub")}{equb ? ` · ${equb.name}` : ""}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{t("roundNo", { n: round.roundNumber })}</h2>
            <StatusBadge status={round.status} kind="round" />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarClock size={14} /> {t("dueDate")}: <strong className="text-foreground">{formatDate(round.contributionDueDate)}</strong></span>
            <span>{t("scheduledAt")}: <strong className="text-foreground">{formatDateTime(round.scheduledAt)}</strong></span>
            {round.drawnAt && <span>{t("drawnAt")}: <strong className="text-foreground">{formatDateTime(round.drawnAt)}</strong></span>}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`${t("paid")} / ${t("unpaid")}`} value={<span><span className="text-success">{paidCount}</span> / <span className="text-warning">{unpaidCount}</span></span>} hint={`${Math.round(round.paymentPercentage)}% · ${round.totalMembers} ${tc("member").toLowerCase()}s`} icon={Users} tone="success" />
        <StatCard label={t("totalContribution")} value={formatCurrency(round.totalContribution)} icon={Wallet} tone="primary" />
        <StatCard label={t("adminFee")} value={formatCurrency(round.totalAdminFee)} hint={`${t("takafulFee")}: ${formatCurrency(round.totalTakafulFee)}`} icon={Coins} tone="info" />
        <StatCard label={t("payout")} value={formatCurrency(round.payoutAmount)} icon={HandCoins} tone="secondary" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Member payments */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">{t("memberPayments")}</CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="paid">{t("filterPaid")}</SelectItem>
                <SelectItem value="unpaid">{t("filterUnpaid")}</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <DataTable
              bare
              columns={paymentColumns}
              data={payments}
              rowKey={(r) => r.memberId}
              avatar={(r) => ({ initials: getInitials(r.name), colorClass: isPaid(r) ? "bg-success/15 text-success" : "bg-warning/15 text-warning" })}
              emptyTitle={tc("noData")}
              emptyMessage={t("noPayments")}
            />
          </CardContent>
        </Card>

        {/* Draw */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck size={18} className="text-primary" /> {t("draw")}</CardTitle>
            {drawn && <Badge className="bg-success/15 text-success">{t("drawDone")}</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
            {drawn ? (
              <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>{t("immutable")}</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-success/10 p-3">
                    <p className="text-2xl font-bold text-success">{eligibleCount}</p>
                    <p className="text-xs text-muted-foreground">{t("eligible")}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <p className="text-2xl font-bold text-foreground">{excludedCount}</p>
                    <p className="text-xs text-muted-foreground">{t("excluded")}</p>
                  </div>
                </div>

                {previewLoading ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : (
                  <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${canDraw ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <span>{canDraw ? t("canDraw") : `${t("cannotDraw")}${preview?.reason ? ` — ${preview.reason}` : ""}`}</span>
                  </div>
                )}

                {eligible.length > 0 && (
                  <MemberChips title={`${t("eligible")} · ${eligible.length}`} items={eligible.map((m) => ({ id: m.memberId, label: `#${m.position} ${m.name}`, tone: "bg-success/15 text-success" }))} />
                )}
                {excluded.length > 0 && (
                  <MemberChips title={`${t("excluded")} · ${excluded.length}`} items={excluded.map((m) => ({ id: m.memberId, label: m.name, tone: "bg-muted text-muted-foreground", hint: exclusionReason(m, t) }))} />
                )}

                {canExecute ? (
                  <Button className="w-full" size="lg" disabled={!canDraw || execute.isPending} onClick={() => setConfirming(true)}>
                    <Play size={18} className="mr-2" /> {execute.isPending ? t("running") : t("runDraw")}
                  </Button>
                ) : (
                  <p className="rounded-xl bg-muted/40 p-3 text-center text-sm text-muted-foreground">{tc("noDataHint")}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Winners */}
      {drawn && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Trophy size={18} className="text-secondary-foreground" /> {t("winners")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {round.winners.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {round.winners.map((w) => (
                  <div key={`${w.memberId}-${w.position}`} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-secondary-foreground">{w.position}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{w.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatCurrency(w.payoutAmount)} · {w.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <WinnersTable equbId={equbId} roundId={roundId} winners={winners ?? []} isLoading={winnersLoading} hideRound />
          </CardContent>
        </Card>
      )}

      {/* Confirm draw */}
      <Modal open={confirming} onOpenChange={setConfirming} title={t("runDraw")} className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-foreground">{t("confirmDraw", { n: round.roundNumber })}</p>
          <p className="text-sm text-muted-foreground">{t("eligible")}: <strong className="text-foreground">{eligibleCount}</strong> · {t("excluded")}: <strong className="text-foreground">{excludedCount}</strong></p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>{tc("cancel")}</Button>
            <Button disabled={execute.isPending} onClick={runDraw}>
              <Play size={14} className="mr-1" /> {execute.isPending ? t("running") : t("runDraw")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function exclusionReason(m: ExcludedMember, t: ReturnType<typeof useTranslations<"rounds">>): string {
  const parts: string[] = [];
  if (!m.contributionPaid) parts.push(t("unpaidContribution"));
  if (m.previouslyWon) parts.push(t("previouslyWon"));
  if (m.isBanned) parts.push(t("banned"));
  if (m.hasUnpaidCatchUp) parts.push(t("unpaidCatchUp"));
  if (m.reason) parts.push(m.reason);
  return parts.join(" · ");
}

function MemberChips({ title, items }: { title: string; items: { id: string; label: string; tone: string; hint?: string }[] }) {
  const [showAll, setShowAll] = useState(false);
  const limit = 24;
  const visible = showAll ? items : items.slice(0, limit);
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((m) => (
          <span key={m.id} title={m.hint} className={`rounded-md px-1.5 py-0.5 text-xs ${m.tone}`}>
            {m.label}{m.hint ? <span className="ml-1 opacity-70">· {m.hint}</span> : null}
          </span>
        ))}
        {items.length > limit && (
          <button onClick={() => setShowAll((v) => !v)} className="text-xs text-primary hover:underline">
            {showAll ? "−" : `+${items.length - limit}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RoundDetailPage({ params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.DRAW_READ, EKUB_PERMS.EQUB_READ]}>
      <RoundDetailInner equbId={id} roundId={roundId} />
    </RequirePermission>
  );
}
