"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wallet, CheckCircle2, Clock, ExternalLink, Info, Loader2 } from "lucide-react";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
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
import { useEqubs, useMyCollections, useConfirmPayment } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { formatCurrency, formatDateForInput, formatDateTime } from "@/lib/utils";
import type { CollectionItem } from "@/types/ekub";

/**
 * "What I collected": the contributions the signed-in staff member recorded
 * in a period, with confirmed vs still-pending totals, from
 * GET /equb/manager/my-collections. The end-of-day reconciliation view.
 */
export function CollectionsTab({ onRecord }: { onRecord: () => void }) {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const router = useRouter();

  const today = formatDateForInput(new Date().toISOString());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [equbId, setEqubId] = useState("all");

  const { data: equbs } = useEqubs();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canConfirm = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);
  const confirm = useConfirmPayment();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data, isLoading } = useMyCollections({ from, to, equbId: equbId === "all" ? undefined : equbId });

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("from")}</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("to")}</Label>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label className="text-xs">{t("equb")}</Label>
            <Select value={equbId} onValueChange={setEqubId}>
              <SelectTrigger className="sm:w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allEqubs")}</SelectItem>
                {(equbs ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={onRecord}>
          <Wallet size={16} className="mr-1" /> {t("recordPayment")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalCollected")} value={data ? formatCurrency(data.totalCollected) : "…"} hint={data ? `${data.count} · ${data.from} → ${data.to}` : undefined} icon={Wallet} tone="primary" />
        <StatCard label={t("confirmed")} value={data ? formatCurrency(data.totalConfirmed) : "…"} icon={CheckCircle2} tone="success" />
        <StatCard label={t("pending")} value={data ? formatCurrency(data.totalPending) : "…"} icon={Clock} tone={data && data.totalPending > 0 ? "warning" : "info"} />
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0 text-primary" /> {t("collectionsSub")}</p>

      <DataTable
        defaultSort={{ id: "at", dir: "desc" }}
        filters={{ search: { keys: (r) => [r.memberName, r.reference, r.equbName, r.categoryName] }, facets: [{ id: "status", label: tc("status"), get: (r) => r.status }] }}
        columns={columns}
        data={data?.items ?? []}
        rowKey={(r) => r.paymentId || `${r.memberId}-${r.collectedAt}`}
        isLoading={isLoading}
        avatar={(r) => ({ initials: getInitials(r.memberName), colorClass: r.status === "confirmed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning" })}
        emptyTitle={tc("noData")}
        emptyMessage={t("noCollections")}
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
        actions={[{ label: tc("view"), icon: ExternalLink, onClick: (r) => router.push(`/dashboard/equbs/${r.equbId}?tab=rounds`) }]}
      />
    </div>
  );
}
