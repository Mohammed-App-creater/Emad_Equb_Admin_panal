"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Info, Search, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, PAGE_SIZES, TablePager } from "@/components/ui/data-table";
import { StatCard } from "@/components/dashboard/shared";
import { PStatus } from "@/components/pilgrimage/shared";
import { ContributeModal, ContributionHistory, type ContributeTarget } from "@/components/pilgrimage/contributions";
import { contributeTarget } from "@/components/pilgrimage/cycle-members-tab";
import { summarizeMembers, type CycleMember } from "@/components/pilgrimage/cycle-members";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency } from "@/lib/utils";
import type { PilgrimageCycle } from "@/types/pilgrimage";

type Filter = "all" | "eligible" | "behind" | "none";

/**
 * Money in one cycle: totals against the eligibility target, then every
 * member's savings, expandable into their payments on the Equb ledger.
 * Each member's savings are their own, so there is no shared pot; the
 * cycle's figures are the sum of its members'.
 */
export function CyclePaymentsTab({ cycle, members, isLoading, live }: { cycle: PilgrimageCycle; members: CycleMember[]; isLoading: boolean; live: boolean }) {
  const t = useTranslations("pilgrimage.payments");
  const tp = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const canCollect = live && has(EKUB_PERMS.PILGRIMAGE_REGISTER);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[1]);
  const [paying, setPaying] = useState<ContributeTarget | null>(null);
  const s = summarizeMembers(members);
  const noneYet = members.filter((m) => m.balance <= 0).length;

  const q = search.trim().toLowerCase();
  const rows = members
    .filter((m) => (filter === "all" ? true : filter === "eligible" ? m.eligible : filter === "behind" ? !m.eligible : m.balance <= 0))
    .filter((m) => !q || (m.memberName ?? "").toLowerCase().includes(q) || m.number.toLowerCase().includes(q) || (m.membershipNumber ?? "").toLowerCase().includes(q))
    .sort((a, b) => b.balance - a.balance || (a.memberName ?? "").localeCompare(b.memberName ?? ""));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const reset = () => setPage(1);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={live ? t("saved") : t("savedAtClose")} value={formatCurrency(s.saved)} hint={t("acrossMembers", { count: s.count })} icon={Wallet} tone="primary" />
        <StatCard label={t("target")} value={`${s.rate}%`} hint={t("targetHint", { amount: formatCurrency(s.required) })} icon={Target} tone="info" />
        <StatCard label={t("eligible")} value={`${s.eligible} / ${s.count}`} hint={t("eligibleHint", { amount: formatCurrency(cycle.required_contribution) })} icon={CheckCircle2} tone="success" />
        <StatCard label={t("stillToSave")} value={formatCurrency(s.remaining)} hint={t("noPaymentYet", { count: noneYet })} icon={Clock} tone={s.remaining > 0 ? "warning" : "secondary"} />
      </div>

      {s.count > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("towardsTarget")}</span>
            <span className="tabular-nums">{formatCurrency(Math.max(0, s.required - s.remaining))} / {formatCurrency(s.required)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(100, s.rate)}%` }} />
          </div>
        </div>
      )}

      {!live && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("frozenHint")}</span>
        </div>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">{t("byMember")}</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 pl-8 sm:w-56" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} placeholder={tp("searchMember")} />
              </div>
              <Select value={filter} onValueChange={(v) => { setFilter(v as Filter); reset(); }}>
                <SelectTrigger className="h-9 sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filterAll")}</SelectItem>
                  <SelectItem value="eligible">{t("filterEligible")}</SelectItem>
                  <SelectItem value="behind">{t("filterBehind")}</SelectItem>
                  <SelectItem value="none">{t("filterNone")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{members.length === 0 ? tp("empty") : t("noMatch")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-8" />
                    <th className="px-3 py-2 text-left font-semibold">{tc("member")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{live ? t("saved") : t("savedAtClose")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("required")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("remaining")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("progress")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{tc("status")}</th>
                    {canCollect && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((m) => {
                    const isOpen = openId === m.participationId;
                    const pct = m.required > 0 ? Math.min(100, Math.round((m.balance / m.required) * 1000) / 10) : 0;
                    const remaining = Math.max(0, m.required - m.balance);
                    const colSpan = canCollect ? 8 : 7;
                    return (
                      <Fragment key={m.participationId}>
                        <tr onClick={() => setOpenId(isOpen ? null : m.participationId)} aria-expanded={isOpen}
                          className={cn("cursor-pointer border-t border-border transition-colors", isOpen ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/60")}>
                          <td className="pl-3">
                            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="flex items-center gap-2">
                              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", m.eligible ? "bg-success/15 text-success" : m.balance > 0 ? "bg-info/15 text-info" : "bg-warning/15 text-warning")}>
                                {getInitials(m.memberName ?? m.number)}
                              </span>
                              <span className="min-w-0">
                                <Link href={`/dashboard/pilgrimage/participations/${m.participationId}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-foreground hover:underline">{m.memberName || tc("unknownMember")}</Link>
                                <span className="block font-mono text-xs text-muted-foreground">{m.number}</span>
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatCurrency(m.balance)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(m.required)}</td>
                          <td className={cn("px-3 py-2.5 text-right tabular-nums", remaining > 0 ? "text-warning" : "text-muted-foreground")}>{remaining > 0 ? formatCurrency(remaining) : "—"}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className="inline-flex items-center gap-2">
                              <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
                                <span className={cn("block h-full rounded-full", m.eligible ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
                              </span>
                              {pct}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn("text-xs font-medium", m.eligible ? "text-success" : "text-muted-foreground")}>{m.eligible ? tp("eligible") : t("behind")}</span>
                            {m.status && m.status !== "active" && <PStatus status={m.status} className="ml-2" />}
                          </td>
                          {canCollect && (
                            <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              {m.participation?.accepts_contributions && (
                                <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => setPaying(contributeTarget(m))}>
                                  <Wallet size={13} className="mr-1" /> {t("pay")}
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                        {isOpen && (
                          <tr className="bg-primary/5">
                            <td colSpan={colSpan} className="px-3 pb-4 pt-1 sm:pl-12">
                              <div className="overflow-hidden rounded-xl border border-border border-l-4 border-l-primary bg-background shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                                  <span>{t("historyOf", { name: m.memberName ?? m.number })}{m.participation?.contract_number ? ` · ${tp("contract")} ${m.participation.contract_number}` : ""}</span>
                                  {m.participation && !live && <span>{t("currentBalance", { amount: formatCurrency(m.participation.standing.balance) })}</span>}
                                </div>
                                <ContributionHistory id={m.participationId} bare pageSize={5} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > PAGE_SIZES[0] && (
            <TablePager page={current} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); reset(); }} />
          )}
        </CardContent>
      </Card>

      <ContributeModal target={paying} onClose={() => setPaying(null)} />
    </div>
  );
}
