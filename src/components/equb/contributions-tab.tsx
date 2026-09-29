"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronDown, ChevronRight, Wallet, Users, CheckCircle2, Clock, Coins, PiggyBank, CalendarClock, Search, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/shared";
import { StatusBadge } from "@/components/equb/status-badge";
import { RecordPaymentModal, type RecordPaymentTarget } from "@/components/equb/record-payment-modal";
import { getInitials, TablePager, PAGE_SIZES } from "@/components/ui/data-table";
import { useRounds, useRoundDetails, usePendingPayments, useConfirmPayment } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency, formatDate, formatDateTime, getErrorMessage } from "@/lib/utils";
import type { Equb, Round, RoundMemberPayment } from "@/types/ekub";

const isPaid = (p: RoundMemberPayment) => p.status?.toLowerCase() === "paid" || !!p.paidAt;
const isProcessing = (p: RoundMemberPayment) => (p.status || "").toLowerCase() === "processing";

/**
 * Per-round money summary from its member payments. Falls back to the round's
 * own counts × the per-member ask when the payment rows are not there.
 */
function summarize(r: Round, perMemberFallback = 0) {
  const pays = r.memberPayments;
  const paidRows = pays.filter(isPaid);
  const perMember = pays[0]?.amount || perMemberFallback;
  const paidCount = pays.length ? paidRows.length : r.paidCount;
  const unpaidCount = pays.length ? pays.length - paidRows.length : r.unpaidCount;
  const paidAmount = pays.length ? paidRows.reduce((a, p) => a + p.amount, 0) : (r.totalContribution + r.totalAdminFee + r.totalTakafulFee) || paidCount * perMember;
  const unpaidAmount = pays.length ? pays.filter((p) => !isPaid(p)).reduce((a, p) => a + p.amount, 0) : unpaidCount * perMember;
  const total = paidCount + unpaidCount;
  return { paidCount, unpaidCount, total, paidAmount, unpaidAmount, charged: paidAmount + unpaidAmount, rate: total ? Math.round((paidCount / total) * 1000) / 10 : 0 };
}

/**
 * A round has started once its collection window opened. The backend keeps a
 * running round's status at "pending" (mapped to "scheduled" here), so the
 * status alone would hide every round of a freshly activated Equb.
 */
export const hasStarted = (r: Round) => r.status !== "scheduled" || (!!r.scheduledAt && new Date(r.scheduledAt).getTime() <= Date.now());

/** Which round the Equb is "on" right now: the open one, else the latest that has started. */
export function currentRoundOf(rounds: Round[] | undefined): Round | undefined {
  if (!rounds?.length) return undefined;
  return rounds.find((r) => r.status === "open") ?? [...rounds].reverse().find(hasStarted) ?? rounds[0];
}

/**
 * Contributions of one Equb: whole-Equb totals, a selected round's totals
 * (the current round by default), and an expandable by-round table whose
 * rows open into the members who paid / still owe.
 */
export function ContributionsTab({ equb }: { equb: Equb }) {
  const t = useTranslations("contributions");
  const tc = useTranslations("common");
  const tr = useTranslations("rounds");
  const { has } = useEkubAccess();
  const canCollect = equb.status === "active" && (has(EKUB_PERMS.EQUB_MANAGE) || has(EKUB_PERMS.PENALTY_MANAGE) || has(EKUB_PERMS.PAYMENT_RECONCILE));

  const { data: list, isLoading: listLoading } = useRounds(equb.id);
  // The list endpoint only carries counts; each started round's detail has the
  // member payment rows and money totals, so fetch those and merge them in.
  const startedIds = useMemo(() => (list ?? []).filter(hasStarted).map((r) => r.id), [list]);
  const details = useRoundDetails(startedIds);
  const rounds = useMemo(() => {
    if (!list) return list;
    const byId = new Map(startedIds.map((id, i) => [id, details[i]?.data]));
    return list.map((r) => byId.get(r.id) ?? r);
  }, [list, startedIds, details]);
  const isLoading = listLoading || details.some((d) => d.isLoading);
  const current = useMemo(() => currentRoundOf(rounds), [rounds]);
  const perMember = equb.effectiveTerms?.totalPerRound ?? (equb.category ? equb.category.contribution + equb.category.adminFee + equb.category.takafulFee : 0);

  // ---- filters ----------------------------------------------------------------
  const [roundFilter, setRoundFilterState] = useState<string>("all");
  const [payFilter, setPayFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [search, setSearch] = useState("");
  // Accordion: one round open at a time. `undefined` = "the current round".
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const setRoundFilter = (v: string) => { setRoundFilterState(v); setOpenId(undefined); };
  // The expanded member list of a round can be 200 rows: page it locally.
  const [memberPage, setMemberPage] = useState<Record<string, number>>({});
  const [memberPageSize, setMemberPageSize] = useState(PAGE_SIZES[0]);
  const resetMemberPages = () => setMemberPage({});
  const [paying, setPaying] = useState<RecordPaymentTarget | null>(null);

  const started = (rounds ?? []).filter((r) => hasStarted(r) || r.memberPayments.length > 0);
  // Recorded but not yet confirmed (e.g. paid from the mobile app).
  const { pending } = usePendingPayments(equb.id);
  const awaiting = (r: Round, p: RoundMemberPayment) => (isPaid(p) ? undefined : pending.get(`${r.id}:${p.memberId}`));
  const canConfirm = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);
  const confirm = useConfirmPayment();
  const { toast } = useToast();
  const focusRound = roundFilter === "current" ? current : roundFilter === "all" ? undefined : rounds?.find((r) => r.id === roundFilter);
  const isOpen = (r: Round) => (openId === undefined ? r.id === (focusRound?.id ?? current?.id) : openId === r.id);

  // ---- stats ----------------------------------------------------------------------
  const whole = useMemo(() => {
    const sums = started.map((r) => summarize(r, perMember));
    const paidAmount = sums.reduce((a, s) => a + s.paidAmount, 0);
    const unpaidAmount = sums.reduce((a, s) => a + s.unpaidAmount, 0);
    const paidCount = sums.reduce((a, s) => a + s.paidCount, 0);
    const total = sums.reduce((a, s) => a + s.total, 0);
    return {
      paidAmount, unpaidAmount, paidCount, unpaidCount: total - paidCount,
      rate: total ? Math.round((paidCount / total) * 1000) / 10 : 0,
      contribution: started.reduce((a, r) => a + r.totalContribution, 0),
      adminFee: started.reduce((a, r) => a + r.totalAdminFee, 0),
      takaful: started.reduce((a, r) => a + r.totalTakafulFee, 0),
      fullyPaidRounds: sums.filter((s) => s.total > 0 && s.unpaidCount === 0).length,
      rounds: started.length,
    };
  }, [started, perMember]);
  const focus = focusRound ? summarize(focusRound, perMember) : undefined;

  // ---- table rows -----------------------------------------------------------------
  const visibleRounds = (roundFilter === "all" ? started : focusRound ? [focusRound] : []).slice().sort((a, b) => b.roundNumber - a.roundNumber);
  const q = search.trim().toLowerCase();
  const memberRows = (r: Round) =>
    r.memberPayments
      .filter((p) => (payFilter === "all" ? true : payFilter === "paid" ? isPaid(p) : !isPaid(p)))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q))
      .sort((a, b) => Number(isPaid(b)) - Number(isPaid(a)) || a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Whole Equb */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Layers size={14} /> {t("wholeEqub")}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("paidAmount")} value={formatCurrency(whole.paidAmount)} hint={t("paidOf", { paid: whole.paidCount, total: whole.paidCount + whole.unpaidCount })} icon={CheckCircle2} tone="success" />
          <StatCard label={t("unpaidAmount")} value={formatCurrency(whole.unpaidAmount)} hint={t("unpaidCount", { count: whole.unpaidCount })} icon={Clock} tone={whole.unpaidAmount > 0 ? "warning" : "primary"} />
          <StatCard label={t("collectionRate")} value={`${whole.rate}%`} hint={t("roundsFullyPaid", { paid: whole.fullyPaidRounds, total: whole.rounds })} icon={Users} tone="info" />
          <StatCard label={t("breakdown")} value={formatCurrency(whole.contribution)} hint={`${t("adminFee")} ${formatCurrency(whole.adminFee)} · ${t("takaful")} ${formatCurrency(whole.takaful)}`} icon={Coins} tone="secondary" />
        </div>
      </section>

      {/* Selected round */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock size={14} /> {t("selectedRound")}
            {focusRound && <span className="normal-case tracking-normal text-foreground">· {tr("roundNo", { n: focusRound.roundNumber })}</span>}
            {focusRound && focusRound.id === current?.id && <Badge className="bg-primary/10 text-primary">{t("currentRound")}</Badge>}
          </h3>
          <RoundSelect rounds={started} value={roundFilter} onChange={setRoundFilter} current={current} label={t("roundFilter")} allLabel={t("allRounds")} currentLabel={t("currentRound")} />
        </div>
        {focus && focusRound ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("paidAmount")} value={formatCurrency(focus.paidAmount)} hint={t("paidOf", { paid: focus.paidCount, total: focus.total })} icon={CheckCircle2} tone="success" />
            <StatCard label={t("unpaidAmount")} value={formatCurrency(focus.unpaidAmount)} hint={t("unpaidCount", { count: focus.unpaidCount })} icon={Clock} tone={focus.unpaidAmount > 0 ? "warning" : "primary"} />
            <StatCard label={t("collectionRate")} value={`${focus.rate}%`} hint={`${tr("dueDate")}: ${formatDate(focusRound.contributionDueDate)}`} icon={Users} tone="info" />
            <StatCard label={t("breakdown")} value={formatCurrency(focusRound.totalContribution)} hint={`${t("adminFee")} ${formatCurrency(focusRound.totalAdminFee)} · ${t("takaful")} ${formatCurrency(focusRound.totalTakafulFee)}`} icon={PiggyBank} tone="secondary" />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{roundFilter === "all" ? t("allRoundsHint") : t("noRoundYet")}</p>
        )}
      </section>

      {/* By round, expandable into members */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">{t("byRound")}</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 pl-8 sm:w-56" value={search} onChange={(e) => { setSearch(e.target.value); resetMemberPages(); }} placeholder={t("searchMember")} />
              </div>
              <Select value={payFilter} onValueChange={(v) => { setPayFilter(v as typeof payFilter); resetMemberPages(); }}>
                <SelectTrigger className="h-9 sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filterAll")}</SelectItem>
                  <SelectItem value="paid">{t("filterPaid")}</SelectItem>
                  <SelectItem value="unpaid">{t("filterUnpaid")}</SelectItem>
                </SelectContent>
              </Select>
              <RoundSelect rounds={started} value={roundFilter} onChange={setRoundFilter} current={current} label={t("roundFilter")} allLabel={t("allRounds")} currentLabel={t("currentRound")} compact />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {visibleRounds.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{tr("noRounds")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-8" />
                    <th className="px-3 py-2 text-left font-semibold">{tr("round")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{tr("dueDate")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("paidMembers")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("paidAmount")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("unpaidAmount")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("collectionRate")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRounds.map((r) => {
                    const s = summarize(r, perMember);
                    const open = isOpen(r);
                    const rows = memberRows(r);
                    const mPages = Math.max(1, Math.ceil(rows.length / memberPageSize));
                    const mPage = Math.min(memberPage[r.id] ?? 1, mPages);
                    const pageRows = rows.slice((mPage - 1) * memberPageSize, mPage * memberPageSize);
                    return (
                      <RoundGroup key={r.id} open={open} onToggle={() => setOpenId(open ? null : r.id)} colSpan={8}
                        head={
                          <>
                            <td className="px-3 py-3 font-medium text-foreground">
                              {tr("roundNo", { n: r.roundNumber })}
                              {r.id === current?.id && <Badge className="ml-2 bg-primary/10 text-primary">{t("currentRound")}</Badge>}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{formatDate(r.contributionDueDate)}</td>
                            <td className="px-3 py-3 text-right tabular-nums"><span className="text-success">{s.paidCount}</span> / {s.total}</td>
                            <td className="px-3 py-3 text-right font-medium tabular-nums text-success">{formatCurrency(s.paidAmount)}</td>
                            <td className={cn("px-3 py-3 text-right font-medium tabular-nums", s.unpaidAmount > 0 ? "text-warning" : "text-muted-foreground")}>{formatCurrency(s.unpaidAmount)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              <span className="inline-flex items-center gap-2">
                                <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block"><span className="block h-full rounded-full bg-success" style={{ width: `${s.rate}%` }} /></span>
                                {s.rate}%
                              </span>
                            </td>
                            <td className="px-3 py-3"><StatusBadge status={r.status} kind="round" /></td>
                          </>
                        }
                      >
                        {rows.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-muted-foreground">{r.memberPayments.length === 0 ? tr("noPayments") : t("noMatch")}</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">{tc("member")}</th>
                                <th className="px-3 py-2 text-left font-medium">{tc("phone")}</th>
                                <th className="px-3 py-2 text-right font-medium">{tc("amount")}</th>
                                <th className="px-3 py-2 text-left font-medium">{tr("paidAt")}</th>
                                <th className="px-3 py-2 text-left font-medium">{tc("status")}</th>
                                {canCollect && <th className="px-3 py-2" />}
                              </tr>
                            </thead>
                            <tbody>
                              {pageRows.map((p) => (
                                <tr key={p.memberId} className="border-t border-border/60">
                                  <td className="px-4 py-2">
                                    <span className="flex items-center gap-2">
                                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", isPaid(p) ? "bg-success/15 text-success" : isProcessing(p) || awaiting(r, p) ? "bg-info/15 text-info" : "bg-warning/15 text-warning")}>{getInitials(p.name)}</span>
                                      <Link href={`/dashboard/equbs/${equb.id}/members/${p.memberId}`} className="font-medium text-foreground hover:underline">{p.name}</Link>
                                      {p.isCatchUp && <Badge className="bg-info/15 text-info">{tr("catchUp")}</Badge>}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">{p.phone || "—"}</td>
                                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(p.amount)}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</td>
                                  <td className="px-3 py-2">{awaiting(r, p) ? <Badge className="bg-info/15 text-info">{t("awaitingConfirmation")}</Badge> : <StatusBadge status={isPaid(p) ? "paid" : p.status || "unpaid"} kind="payment" />}</td>
                                  {canCollect && (
                                    <td className="px-3 py-2 text-right">
                                      {awaiting(r, p) ? (
                                        canConfirm && (
                                          <Button size="sm" className="whitespace-nowrap" disabled={confirm.isPending} onClick={() => confirm.mutate({ equbId: equb.id, paymentId: awaiting(r, p)! }, { onSuccess: () => toast({ title: t("confirmed"), description: p.name }), onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }) })}>
                                            <CheckCircle2 size={13} className="mr-1" /> {t("confirm")}
                                          </Button>
                                        )
                                      ) : !isPaid(p) && !isProcessing(p) && r.status !== "cancelled" && (
                                        <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => setPaying({ equbId: equb.id, memberId: p.memberId, roundIds: [r.id] })}>
                                          <Wallet size={13} className="mr-1" /> {t("pay")}
                                        </Button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {rows.length > PAGE_SIZES[0] && (
                          <TablePager
                            page={mPage}
                            pageSize={memberPageSize}
                            total={rows.length}
                            onPageChange={(pg) => setMemberPage((m) => ({ ...m, [r.id]: pg }))}
                            onPageSizeChange={(n) => { setMemberPageSize(n); resetMemberPages(); }}
                          />
                        )}
                      </RoundGroup>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentModal target={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

/** Round picker shared by the stats header and the table filters. */
export function RoundSelect({ rounds, value, onChange, current, label, allLabel, currentLabel, compact }: {
  rounds: Round[];
  value: string;
  onChange: (v: string) => void;
  current?: Round;
  label: string;
  allLabel: string;
  currentLabel: string;
  compact?: boolean;
}) {
  const tr = useTranslations("rounds");
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", compact ? "sm:w-[190px]" : "sm:w-[230px]")} aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        {current && <SelectItem value="current">{currentLabel} · {tr("roundNo", { n: current.roundNumber })}</SelectItem>}
        <SelectItem value="all">{allLabel}</SelectItem>
        {[...rounds].sort((a, b) => b.roundNumber - a.roundNumber).map((r) => (
          <SelectItem key={r.id} value={r.id}>{tr("roundNo", { n: r.roundNumber })} · {formatDate(r.contributionDueDate)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RoundGroup({ open, onToggle, head, children, colSpan }: { open: boolean; onToggle: () => void; head: ReactNode; children: ReactNode; colSpan: number }) {
  return (
    <>
      <tr onClick={onToggle} className={cn("cursor-pointer border-t border-border transition-colors hover:bg-muted/60", open && "bg-muted/30")} aria-expanded={open}>
        <td className="pl-3 text-muted-foreground">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
        {head}
      </tr>
      {open && (
        <tr className="border-t border-border/60 bg-background">
          <td colSpan={colSpan} className="p-0">
            <div className="border-l-2 border-primary/40">{children}</div>
          </td>
        </tr>
      )}
    </>
  );
}
