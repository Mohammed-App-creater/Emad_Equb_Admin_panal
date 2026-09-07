"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, Check, Info } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { usePayments, useFlagOutage, useReconciliation, useReconcile } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import type { Payment, PaymentTiming, ReconciliationRow } from "@/types/ekub";

const timingBadge: Record<PaymentTiming, string> = {
  on_time: "bg-success/15 text-success",
  late: "bg-warning/15 text-warning",
  outage_grace: "bg-info/15 text-info",
};

function PaymentsInner() {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canReconcile = has(EKUB_PERMS.PAYMENT_RECONCILE);

  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data: payments, isLoading } = usePayments({ search: debounced });
  const { data: recon, isLoading: reconLoading } = useReconciliation();
  const flagOutage = useFlagOutage();
  const reconcile = useReconcile();

  const timingLabel = (x: PaymentTiming) =>
    x === "on_time" ? t("onTime") : x === "late" ? t("late") : t("outageGrace");

  const paymentCols: DataTableColumn<Payment>[] = [
    { id: "member", header: t("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.memberHandle}</p>
        <p className="text-xs text-muted-foreground">{r.ekubNumber}</p>
      </div>
    ) },
    { id: "round", header: t("round"), mobile: "detail", cell: (r) => <span className="text-sm">#{r.round}</span> },
    { id: "amount", header: tc("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "method", header: t("method"), mobile: "detail", cell: (r) => <span className="text-sm capitalize">{r.method.replace("_", " ")}</span> },
    { id: "receipt", header: t("receiptNo"), mobile: "detail", cell: (r) => <span className="text-sm">{r.receiptNo}</span> },
    { id: "collectedBy", header: t("collectedBy"), mobile: "detail", cell: (r) => <span className="text-sm">{r.collectedBy ?? "—"}</span> },
    { id: "time", header: tc("date"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDateTime(r.timestamp)}</span> },
    { id: "timing", header: tc("status"), mobile: "badge", cell: (r) => <Badge className={timingBadge[r.timing]}>{timingLabel(r.timing)}</Badge> },
  ];

  const reconCols: DataTableColumn<ReconciliationRow>[] = [
    { id: "agent", header: t("collectedBy"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.agentName}</span> },
    { id: "date", header: tc("date"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.date)}</span> },
    { id: "cash", header: t("cashCollected"), mobile: "detail", align: "right", cell: (r) => <span>{formatCurrency(r.cashCollected)}</span> },
    { id: "bank", header: t("bankDeposit"), mobile: "detail", align: "right", cell: (r) => <span>{formatCurrency(r.bankDeposit)}</span> },
    { id: "variance", header: t("variance"), mobile: "detail", align: "right", cell: (r) => {
      const v = r.cashCollected - r.bankDeposit;
      return <span className={v === 0 ? "text-success" : "font-medium text-destructive"}>{formatCurrency(v)}</span>;
    } },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (
      <Badge className={r.reconciled ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}>
        {r.reconciled ? "✓" : "…"}
      </Badge>
    ) },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("noRiba")}</span>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">{t("tabLedger")}</TabsTrigger>
          <TabsTrigger value="reconciliation">{t("tabReconciliation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <Input placeholder={tc("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
          <DataTable
            columns={paymentCols}
            data={payments ?? []}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            emptyTitle={tc("noData")}
            actions={
              canReconcile
                ? [
                    {
                      label: t("flagOutage"),
                      icon: CloudOff,
                      show: (r) => r.timing === "late",
                      onClick: (r) =>
                        flagOutage.mutate(r.id, {
                          onSuccess: () => toast({ title: t("outageGrace"), description: r.receiptNo }),
                        }),
                    },
                  ]
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="reconciliation">
          <DataTable
            columns={reconCols}
            data={recon ?? []}
            rowKey={(r) => r.id}
            isLoading={reconLoading}
            emptyTitle={tc("noData")}
            renderLeadingActions={(r) =>
              canReconcile && !r.reconciled ? (
                <Button size="sm" onClick={() => reconcile.mutate(r.id, { onSuccess: () => toast({ title: t("reconcile"), description: r.agentName }) })}>
                  <Check size={14} className="mr-1" /> {t("reconcile")}
                </Button>
              ) : null
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYMENT_READ]}>
      <PaymentsInner />
    </RequirePermission>
  );
}
