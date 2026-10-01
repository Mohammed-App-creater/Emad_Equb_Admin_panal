"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Play, ShieldCheck, Trophy, Info, Users, Wallet, Coins, HandCoins, CalendarClock, Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { RecordPaymentModal, type RecordPaymentTarget } from "@/components/equb/record-payment-modal";
import { PaymentDetailModal, type PaymentRef } from "@/components/payments/payment-detail-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { WinnersTable } from "@/components/equb/winners-tab";
import { SplitCard, FeeLinesTable } from "@/components/equb/admin-fees-tab";
import { RoundAttachments } from "@/components/equb/round-attachments";
import { useLiveUpdates, eventRoundId } from "@/lib/realtime";
import { useEqub, useRound, useDrawPreview, useExecuteDraw, useRoundWinners, useRoundAdminFees, usePendingPayments, useConfirmPayment } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, humanizeDates } from "@/lib/utils";
import type { ExcludedMember, Round, RoundMemberPayment } from "@/types/ekub";

const isPaid = (p: RoundMemberPayment) => p.status?.toLowerCase() === "paid" || !!p.paidAt;

function RoundDetailInner({ equbId, roundId }: { equbId: string; roundId: string }) {
  const t = useTranslations("rounds");
  const tc = useTranslations("common");
  const tf = useTranslations("adminFees");
  const tp = useTranslations("recordPayment");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canExecute = has(EKUB_PERMS.DRAW_EXECUTE);

  const { data: equb } = useEqub(equbId);
  const { data: round, isLoading, isError } = useRound(roundId);
  const drawn = !!round && (round.status === "drawn" || round.status === "completed" || round.winners.length > 0);
  const { data: preview, isLoading: previewLoading } = useDrawPreview(roundId, !!round && !drawn);
  const { data: winners, isLoading: winnersLoading } = useRoundWinners(roundId, round?.roundNumber, drawn);
  const execute = useExecuteDraw();
  const { data: fees } = useRoundAdminFees(roundId);

  const [confirming, setConfirming] = useState(false);
  // Live draw: the backend announces draw.started / completed / failed.
  const [liveDraw, setLiveDraw] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [liveReason, setLiveReason] = useState("");
  useLiveUpdates(equbId, (e) => {
    const rid = eventRoundId(e);
    if (rid && rid !== roundId) return;
    if (e.type === "equb.draw.started") { setLiveDraw("running"); setLiveReason(""); }
    else if (e.type === "equb.draw.completed") { setLiveDraw("done"); setConfirming(false); toast({ title: t("drawDone") }); }
    else if (e.type === "equb.draw.failed") { setLiveDraw("failed"); setLiveReason(String(e.data.reason ?? e.data.message ?? "")); setConfirming(false); toast({ title: t("drawFailed"), description: String(e.data.reason ?? e.data.message ?? ""), variant: "destructive" }); }
  });
  const [paying, setPaying] = useState<RecordPaymentTarget | null>(null);
  // Recorded but not yet confirmed (e.g. paid from the mobile app); round detail calls these "pending" like unpaid ones.
  const { pending, payments: paymentOf } = usePendingPayments(equbId, roundId);
  const [viewing, setViewing] = useState<PaymentRef | null>(null);
  const view = (p: RoundMemberPayment) => {
    const paymentId = paymentOf.get(`${roundId}:${p.memberId}`);
    if (paymentId) setViewing({ paymentId, memberId: p.memberId, equbId, memberName: p.name, equbName: equb?.name });
  };
  const awaiting = (p: RoundMemberPayment) => (isPaid(p) ? undefined : pending.get(`${roundId}:${p.memberId}`));
  const confirmPay = useConfirmPayment();
  const canConfirmPay = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);
  const canCollect = equb?.status === "active" && round?.status !== "cancelled";

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

  const payments = round.memberPayments;
  const payState = (p: RoundMemberPayment) => (isPaid(p) ? "paid" : awaiting(p) ? "awaiting" : (p.status || "").toLowerCase() === "overdue" ? "overdue" : "unpaid");
  const paidCount = round.memberPayments.length ? round.memberPayments.filter(isPaid).length : round.paidCount;
  const unpaidCount = round.memberPayments.length ? round.memberPayments.length - paidCount : round.unpaidCount;
  // Whether a draw can run is the backend's call alone: GET /draw-preview's
  // can_execute_draw. No preview (loading or failed) means no draw button.
  const canDraw = preview?.canExecute === true;
  const blockReason = humanizeDates(canDraw ? "" : preview?.reason || round.notReadyReason || "");
  // Some rounds report 0 collected while every member row shows paid; add the paid rows up instead.
  const paidSum = round.memberPayments.filter(isPaid).reduce((a, p) => a + p.amount, 0);
  const collected = round.totalContribution > 0 ? round.totalContribution : paidSum;
  // Eligible / excluded lists come from the API only; names and phones are
  // filled in from the round's payments because the preview sends ids.
  const byMember = new Map(round.memberPayments.map((p) => [p.memberId, p]));
  const withName = <M extends { memberId: string; name: string; phone: string }>(m: M): M => ({ ...m, name: m.name || byMember.get(m.memberId)?.name || "—", phone: m.phone || byMember.get(m.memberId)?.phone || "" });
  const eligible = (preview?.eligible ?? []).map(withName);
  const excluded: ExcludedMember[] = (preview?.excluded ?? []).map(withName);
  const eligibleCount = preview?.eligibleCount ?? 0;
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
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (awaiting(r) ? <Badge className="bg-info/15 text-info">{tp("awaitingConfirmation")}</Badge> : <StatusBadge status={isPaid(r) ? "paid" : r.status || "unpaid"} kind="payment" />) },
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
            {/* scheduled_at opens the collection window, the due date closes it; the draw can run only after that. */}
            <span className="inline-flex items-center gap-1"><CalendarClock size={14} /> {t("scheduledAt")}: <strong className="text-foreground">{formatDate(round.scheduledAt)}</strong></span>
            <span>{t("dueDate")}: <strong className="text-foreground">{formatDate(round.contributionDueDate)}</strong></span>
            {round.drawnAt && <span>{t("drawnAt")}: <strong className="text-foreground">{formatDateTime(round.drawnAt)}</strong></span>}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`${t("paid")} / ${t("unpaid")}`} value={<span><span className="text-success">{paidCount}</span> / <span className="text-warning">{unpaidCount}</span></span>} hint={`${Math.round(round.paymentPercentage)}% · ${round.totalMembers} ${tc("member").toLowerCase()}s`} icon={Users} tone="success" />
        <StatCard label={t("totalContribution")} value={formatCurrency(collected)} icon={Wallet} tone="primary" />
        <StatCard label={t("adminFee")} value={formatCurrency(round.totalAdminFee)} hint={`${t("takafulFee")}: ${formatCurrency(round.totalTakafulFee)}`} icon={Coins} tone="info" />
        <StatCard label={t("payout")} value={formatCurrency(round.payoutAmount)} icon={HandCoins} tone="secondary" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Member payments */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">{t("memberPayments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              bare
              filters={{
                search: { keys: (r) => [r.name, r.phone] },
                facets: [
                  {
                    id: "status",
                    label: tc("status"),
                    get: payState,
                    options: [{ value: "paid", label: t("filterPaid") }, { value: "unpaid", label: t("filterUnpaid") }, { value: "awaiting", label: tp("awaitingConfirmation") }, { value: "overdue", label: t("statusOverdue") }],
                  },
                  { id: "catchUp", label: t("catchUp"), get: (r) => (r.isCatchUp ? "catch_up" : "regular"), options: [{ value: "catch_up", label: t("catchUp") }, { value: "regular", label: t("regular") }] },
                ],
              }}
              columns={paymentColumns}
              data={payments}
              rowKey={(r) => r.memberId}
              avatar={(r) => ({ initials: getInitials(r.name), colorClass: isPaid(r) ? "bg-success/15 text-success" : awaiting(r) ? "bg-info/15 text-info" : "bg-warning/15 text-warning" })}
              emptyTitle={tc("noData")}
              emptyMessage={t("noPayments")}
              onRowClick={view}
              actions={[{ label: tc("viewDetails"), icon: Eye, show: (r) => paymentOf.has(`${roundId}:${r.memberId}`), onClick: view }]}
              renderLeadingActions={(r) =>
                awaiting(r) ? (
                  canConfirmPay ? (
                    <Button size="sm" className="whitespace-nowrap" disabled={confirmPay.isPending} onClick={() => confirmPay.mutate({ equbId, paymentId: awaiting(r)! }, { onSuccess: () => toast({ title: tp("confirmed"), description: r.name }), onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }) })}>
                      <CheckCircle2 size={13} className="mr-1" /> {tp("confirmNow")}
                    </Button>
                  ) : null
                ) : canCollect && !isPaid(r) && (r.status || "").toLowerCase() !== "processing" ? (
                  <Button size="sm" className="whitespace-nowrap" onClick={() => setPaying({ equbId, memberId: r.memberId, roundIds: [roundId] })}>
                    <Wallet size={13} className="mr-1" /> {tp("pay")}
                  </Button>
                ) : null
              }
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
                  <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin text-primary" /> {t("checkingEligibility")}</div>
                ) : (
                  <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${canDraw ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <span>{canDraw ? t("canDraw") : `${t("cannotDraw")}${blockReason ? ` — ${blockReason}` : ""}`}</span>
                  </div>
                )}

                {eligible.length > 0 && (
                  <MemberChips title={`${t("eligible")} · ${eligible.length}`} items={eligible.map((m) => ({ id: m.memberId, label: m.position ? `#${m.position} ${m.name}` : m.name, tone: "bg-success/15 text-success" }))} />
                )}
                {excluded.length > 0 && (
                  <MemberChips title={`${t("excluded")} · ${excluded.length}`} items={excluded.map((m) => ({ id: m.memberId, label: m.name, tone: "bg-muted text-muted-foreground", hint: exclusionReason(m, t) }))} />
                )}

                {canExecute ? (
                  <Button className="w-full" size="lg" disabled={!canDraw || execute.isPending} onClick={() => setConfirming(true)}>
                    {execute.isPending ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Play size={18} className="mr-2" />} {execute.isPending ? t("running") : t("runDraw")}
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
            <WinnersTable equbId={equbId} roundId={roundId} winners={winners ?? []} isLoading={winnersLoading} hideRound guaranteeRequired={equb?.effectiveTerms?.guaranteeRequired ?? equb?.category?.guaranteeRequired ?? true} />
          </CardContent>
        </Card>
      )}

      {/* Evidence filed against this round's contributions */}
      <RoundAttachments roundId={roundId} members={(fees?.lines ?? []).map((l) => ({ memberId: l.memberId, name: l.memberName, contributionId: l.contributionId })).filter((m) => m.contributionId)} canUpload={canCollect || canExecute} />

      {liveDraw === "failed" && liveReason && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <Info size={16} className="mt-0.5 shrink-0" /> {t("drawFailed")}: {liveReason}
        </div>
      )}

      {/* Admin fees for this round */}
      {fees && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">{tf("title")}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {tf("collected")} <strong className="text-success">{formatCurrency(fees.totals.collected)}</strong> / {formatCurrency(fees.totals.charged)}
              </span>
            </CardHeader>
            <CardContent><FeeLinesTable lines={fees.lines} by="member" /></CardContent>
          </Card>
          <SplitCard split={fees.split} />
        </div>
      )}

      <RecordPaymentModal target={paying} onClose={() => setPaying(null)} />
      <PaymentDetailModal payment={viewing} onClose={() => setViewing(null)} />

      {/* Confirm draw */}
      <Modal open={confirming || liveDraw === "running"} onOpenChange={(o) => !execute.isPending && liveDraw !== "running" && setConfirming(o)} title={`${t("runDraw")} · ${t("roundNo", { n: round.roundNumber })}`} className="max-w-3xl">
        {execute.isPending || liveDraw === "running" ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="font-medium text-foreground">{t("running")}</p>
            <p className="text-sm text-muted-foreground">{t("runningHint", { count: eligible.length, winners: preview?.winnersPerRound ?? equb?.effectiveTerms?.winnersPerRound ?? "" })}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t("confirmDraw", { n: round.roundNumber })}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <EligibilityList
                title={t("drawEligibleList")}
                count={eligible.length}
                tone="success"
                icon={<CheckCircle2 size={14} />}
                items={eligible.map((m) => ({ id: m.memberId, name: m.name, meta: m.position ? `#${m.position}` : m.phone }))}
                empty={t("noneEligible")}
              />
              <EligibilityList
                title={t("drawExcludedList")}
                count={excluded.length}
                tone="muted"
                icon={<XCircle size={14} />}
                items={excluded.map((m) => ({ id: m.memberId, name: m.name, meta: exclusionReason(m, t) || t("unpaidContribution") }))}
                empty={t("noneExcluded")}
              />
            </div>
            {!canDraw && <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{t("cannotDraw")}{blockReason ? ` — ${blockReason}` : ""}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>{tc("cancel")}</Button>
              <Button disabled={!canDraw || execute.isPending} onClick={runDraw}>
                <Play size={14} className="mr-1" /> {t("runDraw")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EligibilityList({ title, count, tone, icon, items, empty }: { title: string; count: number; tone: "success" | "muted"; icon: React.ReactNode; items: { id: string; name: string; meta?: string }[]; empty: string }) {
  return (
    <div className="rounded-xl border border-border">
      <p className={`flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${tone === "success" ? "text-success" : "text-muted-foreground"}`}>
        {icon} {title} <span className="ml-auto rounded-full bg-muted px-2 py-px text-[11px] text-foreground">{count}</span>
      </p>
      <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto">
        {items.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">{empty}</li>}
        {items.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="truncate text-foreground">{m.name}</span>
            {m.meta && <span className="shrink-0 text-xs text-muted-foreground">{m.meta}</span>}
          </li>
        ))}
      </ul>
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
