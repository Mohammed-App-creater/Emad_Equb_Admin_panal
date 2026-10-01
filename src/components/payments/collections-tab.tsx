"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wallet, CheckCircle2, Clock, ExternalLink, Eye, Info, Loader2 } from "lucide-react";
import { DataTable, TablePager, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/shared";
import { StatusBadge } from "@/components/equb/status-badge";
import { useEqubs, useMyCollections, useAllCollections, useCollectionsScope, useConfirmPayment, useFeeLedger, useAgentsPage, useCategories, useEqubMembers } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { formatCurrency, formatDate, formatDateForInput, formatDateTime } from "@/lib/utils";
import type { CollectionItem } from "@/types/ekub";
import { PaymentDetailModal, type PaymentRef } from "@/components/payments/payment-detail-modal";

/**
 * "What I collected": the contributions the signed-in staff member recorded
 * in a period, with confirmed vs still-pending totals, from
 * GET /equb/manager/my-collections. The end-of-day reconciliation view.
 */
export function CollectionsTab({ onRecord }: { onRecord: () => void }) {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const router = useRouter();

  // Default to the last month, from one month ago up to today.
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return formatDateForInput(d.toISOString());
  });
  const [to, setTo] = useState(() => formatDateForInput(new Date().toISOString()));
  const [equbId, setEqubId] = useState("all");
  const [roundNo, setRoundNo] = useState("all");
  // Collections carry no round; the fee ledger links each payment to the rounds it covers.
  const { data: ledger } = useFeeLedger({ equbId: equbId === "all" ? undefined : equbId }, 1, 1000);
  const roundsOf = new Map<string, number[]>();
  for (const l of ledger?.items ?? []) if (l.paymentId) roundsOf.set(l.paymentId, [...(roundsOf.get(l.paymentId) ?? []), l.roundNumber]);
  const roundOptions = Array.from(new Set([...roundsOf.values()].flat())).sort((a, b) => a - b);

  const { data: equbs, isLoading: equbsLoading } = useEqubs();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canConfirm = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);
  const confirm = useConfirmPayment();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PaymentRef | null>(null);
  // Agents see their own day; admins see every agent's collections with paging.
  const scope = useCollectionsScope();
  const [collectedBy, setCollectedBy] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const { data: agentsPage, isLoading: agentsLoading } = useAgentsPage({}, 1, 100);
  const [categoryId, setCategoryId] = useState("all");
  const [memberId, setMemberId] = useState("all");
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: roster, isLoading: rosterLoading } = useEqubMembers(equbId === "all" ? "" : equbId);
  const scoped = { categoryId: categoryId === "all" ? undefined : categoryId, memberId: memberId === "all" ? undefined : memberId };
  const mine = useMyCollections({ from, to, equbId: equbId === "all" ? undefined : equbId, ...scoped }, scope === "mine");
  const all = useAllCollections(
    { from, to, equbId: equbId === "all" ? undefined : equbId, ...scoped, collectedBy: collectedBy === "all" ? undefined : collectedBy, status: status === "all" ? undefined : status },
    page,
    perPage,
    scope === "all"
  );
  const data = scope === "all" ? all.data : mine.data;
  const isLoading = scope === "all" ? all.isLoading : mine.isLoading;
  const resetPage = () => setPage(1);

  const columns: DataTableColumn<CollectionItem>[] = [
    { id: "member", sortValue: (r) => r.memberName, header: tc("member"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.memberName}</span> },
    { id: "equb", sortValue: (r) => r.equbName, header: t("equb"), mobile: "detail", cell: (r) => (
      <div>
        <p className="text-sm text-foreground">{r.equbName}</p>
        <p className="text-xs text-muted-foreground">{r.categoryName}</p>
      </div>
    ) },
    { id: "amount", sortValue: (r) => r.amount, header: tc("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "ref", sortValue: (r) => r.reference, header: t("reference"), mobile: "detail", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
    { id: "at", sortValue: (r) => r.collectedAt, header: t("collectedAt"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDateTime(r.collectedAt)}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="payment" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("from")}</Label>
            <Input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); resetPage(); }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("to")}</Label>
            <Input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); resetPage(); }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("equb")}</Label>
            <Select value={equbId} onValueChange={(v) => { setEqubId(v); setRoundNo("all"); setMemberId("all"); resetPage(); }}>
              <SelectTrigger className="sm:w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent loading={equbsLoading}>
                <SelectItem value="all">{t("allEqubs")}</SelectItem>
                {(equbs ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("category")}</Label>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); resetPage(); }}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent loading={categoriesLoading} empty={!categoriesLoading && !categories?.length}>
                <SelectItem value="all">{tc("all")}</SelectItem>
                {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("member")}</Label>
            <Select value={memberId} onValueChange={(v) => { setMemberId(v); resetPage(); }} disabled={equbId === "all"}>
              <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent loading={rosterLoading} empty={!rosterLoading && equbId !== "all" && !roster?.length}>
                <SelectItem value="all">{tc("all")}</SelectItem>
                {(roster ?? []).map((m) => <SelectItem key={m.memberId} value={m.memberId}>#{m.position} · {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {scope === "all" && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t("collectedBy")}</Label>
              <Select value={collectedBy} onValueChange={(v) => { setCollectedBy(v); resetPage(); }}>
                <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
                <SelectContent loading={agentsLoading} empty={!agentsLoading && !agentsPage?.items.length}>
                  <SelectItem value="all">{t("allAgents")}</SelectItem>
                  {(agentsPage?.items ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {scope === "all" && (
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("status")}</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); resetPage(); }}>
                <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {["pending", "completed", "failed", "cancelled", "reversed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("round")}</Label>
            <Select value={roundNo} onValueChange={setRoundNo} disabled={equbId === "all"}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent empty={equbId !== "all" && roundOptions.length === 0}>
                <SelectItem value="all">{tc("all")}</SelectItem>
                {roundOptions.map((n) => <SelectItem key={n} value={String(n)}>#{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={onRecord}>
          <Wallet size={16} className="mr-1" /> {t("recordPayment")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalCollected")} value={data ? formatCurrency(data.totalCollected) : "…"} hint={data ? `${data.count} · ${formatDate(data.from)}${data.to && formatDate(data.to) !== formatDate(data.from) ? ` – ${formatDate(data.to)}` : ""}` : undefined} icon={Wallet} tone="primary" />
        <StatCard label={t("confirmed")} value={data ? formatCurrency(data.totalConfirmed) : "…"} icon={CheckCircle2} tone="success" />
        <StatCard label={t("pending")} value={data ? formatCurrency(data.totalPending) : "…"} icon={Clock} tone={data && data.totalPending > 0 ? "warning" : "info"} />
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0 text-primary" /> {scope === "all" ? t("allCollectionsSub") : t("collectionsSub")}</p>

      <DataTable
        defaultSort={{ id: "at", dir: "desc" }}
        filters={{ search: { keys: (r) => [r.memberName, r.reference, r.equbName, r.categoryName] }, facets: [{ id: "status", label: tc("status"), get: (r) => r.status }, { id: "category", label: t("category"), get: (r) => r.categoryName }, { id: "equb", label: t("equb"), get: (r) => r.equbName }, { id: "round", label: t("round"), get: (r) => (roundsOf.get(r.paymentId) ?? []).map((n) => `#${n}`) }] }}
        columns={columns}
        data={(data?.items ?? []).filter((r) => roundNo === "all" || (roundsOf.get(r.paymentId) ?? []).includes(Number(roundNo)))}
        rowKey={(r) => r.paymentId || `${r.memberId}-${r.collectedAt}`}
        isLoading={isLoading}
        avatar={(r) => ({ initials: getInitials(r.memberName), colorClass: r.status === "confirmed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning" })}
        emptyTitle={tc("noData")}
        emptyMessage={t("noCollections")}
        onRowClick={(r) => r.paymentId && setViewing(r)}
        renderLeadingActions={(r) =>
          canConfirm && r.status !== "confirmed" && r.paymentId ? (
            <Button
              size="sm"
              disabled={confirm.isPending && confirmingId === r.paymentId}
              onClick={() => {
                setConfirmingId(r.paymentId);
                confirm.mutate({ equbId: r.equbId, paymentId: r.paymentId }, {
                  onSuccess: () => toast({ title: t("confirmed"), description: `${r.memberName} · ${formatCurrency(r.amount)}` }),
                  onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
                  onSettled: () => setConfirmingId(null),
                });
              }}
            >
              {confirm.isPending && confirmingId === r.paymentId ? <Loader2 size={14} className="mr-1 animate-spin" /> : <CheckCircle2 size={14} className="mr-1" />} {t("confirm")}
            </Button>
          ) : null
        }
        actions={[{ label: tc("viewDetails"), icon: Eye, show: (r) => !!r.paymentId, onClick: (r) => setViewing(r) }, { label: tc("view"), icon: ExternalLink, onClick: (r) => router.push(`/dashboard/equbs/${r.equbId}?tab=rounds`) }]}
      />
      <PaymentDetailModal payment={viewing} onClose={() => setViewing(null)} />
      {scope === "all" && all.data && (
        // The admin ledger sends no total, so the pager can only say whether another page exists.
        <div className="rounded-xl border border-border">
          <TablePager
            page={page}
            pageSize={perPage}
            total={(page - 1) * perPage + all.data.items.length + (all.data.hasMore ? perPage : 0)}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPerPage(n); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
