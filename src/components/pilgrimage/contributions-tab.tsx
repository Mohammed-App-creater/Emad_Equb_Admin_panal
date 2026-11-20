"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HandCoins, PiggyBank, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard } from "@/components/dashboard/shared";
import { useContributionLedger } from "@/hooks/pilgrimage";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PaymentOutcomeButtons, PStatus } from "@/components/pilgrimage/shared";
import type { Contribution } from "@/types/pilgrimage";

const STATUSES = ["pending", "paid", "failed"] as const;

/**
 * The Equb ledger: every contribution with its savings, admin fee and
 * Takaful. None of it is posted to accounting; staff confirm each payment,
 * which credits the savings and shares the admin fee with the agent.
 */
export function ContributionsTab({ productId }: { productId?: string }) {
  const t = useTranslations("pilgrimage.ledger");
  const tc = useTranslations("common");
  const ts = useTranslations("pilgrimage.status");
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = useContributionLedger({ product_id: productId, status: status === "all" ? undefined : status, page, limit: perPage });
  const totals = data?.totals;

  const columns: DataTableColumn<Contribution>[] = [
    { id: "date", header: tc("date"), mobile: "title", cell: (c) => (
      <div>
        <p className="text-sm text-foreground">{formatDateTime(c.created_at)}</p>
        <p className="font-mono text-xs text-muted-foreground">{c.participation_number}</p>
      </div>
    ) },
    { id: "savings", header: t("savings"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums">{formatCurrency(c.amount)}</span> },
    { id: "admin", header: t("adminFee"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums text-muted-foreground">{formatCurrency(c.admin_fee)}</span> },
    { id: "takaful", header: t("takaful"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums text-muted-foreground">{formatCurrency(c.takaful_fee)}</span> },
    { id: "total", header: t("paid"), align: "right", mobile: "detail", cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.total_amount)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (c) => (
      c.status === "pending" && c.payment_id ? <PaymentOutcomeButtons paymentId={c.payment_id} /> : <PStatus status={c.status} />
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalSaved")} value={formatCurrency(totals?.saved_amount ?? 0)} hint={t("contributionsCount", { count: totals?.count ?? 0 })} icon={PiggyBank} tone="primary" />
        <StatCard label={t("adminCollected")} value={formatCurrency(totals?.admin_fee_collected ?? 0)} hint={t("charged", { amount: formatCurrency(totals?.admin_fee_charged ?? 0) })} icon={HandCoins} tone="info" />
        <StatCard label={t("takafulCollected")} value={formatCurrency(totals?.takaful_fee_collected ?? 0)} hint={t("charged", { amount: formatCurrency(totals?.takaful_fee_charged ?? 0) })} icon={ShieldCheck} tone="success" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={data?.contributions ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        onRowClick={(c) => router.push(`/dashboard/pilgrimage/participations/${c.participation_id}`)}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
    </div>
  );
}
