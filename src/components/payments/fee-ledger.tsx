"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wallet, Coins, PiggyBank, Sigma, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/equb/status-badge";
import { useFeeLedger, useCategories, useEqubs, useRounds } from "@/hooks/ekub";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { FeeLedgerLine } from "@/types/ekub";

const STATUSES = ["paid", "pending", "overdue", "waived"];

/**
 * The SACCO-wide fee ledger (GET /equb/admin/fees): one line per member per
 * round with the contribution, admin fee and Takaful fee it was charged, and
 * whether the fees were actually collected. Filters narrow the scope
 * server-side; the totals cover the whole filtered set, not just the page.
 */
export function FeeLedger({ equbId, categoryId: fixedCategory, roundId: fixedRound }: { equbId?: string; categoryId?: string; roundId?: string } = {}) {
  const t = useTranslations("feeLedger");
  const tc = useTranslations("common");
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState(fixedCategory ?? "all");
  const [equb, setEqub] = useState(equbId ?? "all");
  const [roundId, setRoundId] = useState(fixedRound ?? "all");
  const { data: rounds, isLoading: roundsLoading } = useRounds(equb === "all" ? "" : equb);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: equbs, isLoading: equbsLoading } = useEqubs();
  const { data, isLoading } = useFeeLedger({ status, categoryId: categoryId === "all" ? undefined : categoryId, equbId: equb === "all" ? undefined : equb, roundId: roundId === "all" ? undefined : roundId }, page, perPage);
  const tot = data?.totals;

  const reset = () => setPage(1);
  const columns: DataTableColumn<FeeLedgerLine>[] = [
    { id: "member", header: tc("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.memberName}</p>
        <p className="text-xs text-muted-foreground">{r.membershipNumber}</p>
      </div>
    ) },
    { id: "equb", header: t("equb"), mobile: "detail", cell: (r) => (
      <div>
        <p className="text-sm text-foreground">{r.equbName}</p>
        <p className="text-xs text-muted-foreground">{r.categoryName}</p>
      </div>
    ) },
    { id: "round", header: t("round"), mobile: "detail", cell: (r) => <span className="text-sm">#{r.roundNumber} <span className="text-xs text-muted-foreground">· {formatDate(r.scheduledAt)}</span></span> },
    { id: "contribution", header: t("contribution"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{formatCurrency(r.contribution)}</span> },
    { id: "adminFee", header: t("adminFee"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{formatCurrency(r.adminFee)}</span> },
    { id: "takaful", header: t("takaful"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm">{formatCurrency(r.takafulFee)}</span> },
    { id: "total", header: t("total"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.total)}</span> },
    { id: "paidAt", header: t("paidAt"), mobile: "detail", cell: (r) => <span className="text-sm">{r.paidAt ? formatDateTime(r.paidAt) : "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (
      <span className="inline-flex items-center gap-1.5">
        <StatusBadge status={r.status} kind="payment" />
        {r.isCatchUp && <Badge className="bg-info/15 text-info">{t("catchUp")}</Badge>}
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={Wallet} label={t("contribution")} charged={tot?.contributionCharged} collected={tot?.contributionCollected} t={t} />
        <Tile icon={Coins} label={t("adminFee")} charged={tot?.adminFeeCharged} collected={tot?.adminFeeCollected} t={t} />
        <Tile icon={PiggyBank} label={t("takaful")} charged={tot?.takafulCharged} collected={tot?.takafulCollected} t={t} />
        <Tile icon={Sigma} label={t("total")} charged={tot?.totalCharged} collected={tot?.totalCollected} t={t} hint={tot ? t("scope", { contributions: tot.contributions, members: tot.members, rounds: tot.rounds }) : undefined} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            bare
            columns={columns}
            data={data?.items ?? []}
            rowKey={(r) => r.contributionId}
            isLoading={isLoading}
            emptyTitle={tc("noData")}
            pagination={{ page, pageSize: perPage, total: data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
            filters={{
              search: { placeholder: t("search"), keys: (r) => [r.memberName, r.membershipNumber, r.equbName, r.categoryName, `#${r.roundNumber}`] },
              facets: [{ id: "catchUp", label: t("catchUp"), get: (r) => (r.isCatchUp ? "catch_up" : "regular"), options: [{ value: "catch_up", label: t("catchUp") }, { value: "regular", label: t("regular") }] }],
              extra: (
                <>
                  <Select value={status} onValueChange={(v) => { setStatus(v); reset(); }}>
                    <SelectTrigger className="h-9 sm:w-[160px]"><span className="truncate"><span className="text-muted-foreground">{tc("status")}: </span><SelectValue /></span></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tc("all")}</SelectItem>
                      {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!fixedCategory && (
                    <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); reset(); }}>
                      <SelectTrigger className="h-9 sm:w-[200px]"><span className="truncate"><span className="text-muted-foreground">{t("category")}: </span><SelectValue /></span></SelectTrigger>
                      <SelectContent loading={categoriesLoading}>
                        <SelectItem value="all">{tc("all")}</SelectItem>
                        {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {!equbId && (
                    <Select value={equb} onValueChange={(v) => { setEqub(v); setRoundId("all"); reset(); }}>
                      <SelectTrigger className="h-9 sm:w-[220px]"><span className="truncate"><span className="text-muted-foreground">{t("equb")}: </span><SelectValue /></span></SelectTrigger>
                      <SelectContent loading={equbsLoading}>
                        <SelectItem value="all">{tc("all")}</SelectItem>
                        {(equbs ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Rounds belong to one Equb, so the round filter opens once an Equb is chosen. */}
                  {!fixedRound && <Select value={roundId} onValueChange={(v) => { setRoundId(v); reset(); }} disabled={equb === "all"}>
                    <SelectTrigger className="h-9 sm:w-40"><span className="truncate"><span className="text-muted-foreground">{t("round")}: </span><SelectValue /></span></SelectTrigger>
                    <SelectContent loading={roundsLoading} empty={!rounds?.length}>
                      <SelectItem value="all">{tc("all")}</SelectItem>
                      {[...(rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber).map((r) => <SelectItem key={r.id} value={r.id}>#{r.roundNumber} · {formatDate(r.contributionDueDate)}</SelectItem>)}
                    </SelectContent>
                  </Select>}
                </>
              ),
            }}
            actions={[{ label: tc("view"), icon: ExternalLink, onClick: (r) => router.push(`/dashboard/equbs/${r.equbId}/rounds/${r.roundId}`) }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, charged, collected, hint, t }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; charged?: number; collected?: number; hint?: string; t: ReturnType<typeof useTranslations<"feeLedger">> }) {
  const pct = charged ? Math.round(((collected ?? 0) / charged) * 100) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={20} /></span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{collected === undefined ? "…" : formatCurrency(collected)}</p>
          <p className="truncate text-xs text-muted-foreground">{charged === undefined ? "" : `${t("ofCharged", { amount: formatCurrency(charged) })} · ${pct}%`}{hint ? ` · ${hint}` : ""}</p>
        </div>
      </div>
    </Card>
  );
}
