"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useMudarabahContracts, useRecordMudarabahProfit } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Field, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import type { MudarabahContract } from "@/types/pilgrimage";

/** Mudarabah investments made from non-winners' savings, and the profit paid on them. */
export function MudarabahTab({ memberId }: { memberId?: string }) {
  const t = useTranslations("pilgrimage.mudarabah");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = useMudarabahContracts({ member_id: memberId, page, limit: perPage });
  const [recording, setRecording] = useState<MudarabahContract | null>(null);

  const columns: DataTableColumn<MudarabahContract>[] = [
    { id: "number", header: t("number"), mobile: "title", cell: (c) => (
      <div>
        <p className="font-mono font-medium text-foreground">{c.number}</p>
        <p className="text-xs text-muted-foreground">{c.member?.full_name ?? tc("unknownMember")}</p>
      </div>
    ) },
    { id: "amount", header: tc("amount"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums">{formatCurrency(c.amount)}</span> },
    { id: "terms", header: t("terms"), mobile: "detail", cell: (c) => (
      <span className="text-sm">{t("termsLine", { months: c.duration_months, share: c.member_profit_share_percent })}</span>
    ) },
    { id: "period", header: t("period"), mobile: "detail", cell: (c) => (
      <span className="text-sm">{c.start_date ? `${formatDate(c.start_date)} – ${formatDate(c.maturity_date)}` : "—"}</span>
    ) },
    { id: "profit", header: t("distributed"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums">{formatCurrency(c.distributed_profit)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (c) => <PStatus status={c.status} /> },
  ];
  const actions: DataTableAction<MudarabahContract>[] = has(EKUB_PERMS.PILGRIMAGE_MANAGE)
    ? [{ label: t("recordProfit"), icon: HandCoins, show: (c) => c.status === "active" || c.status === "matured", onClick: setRecording }]
    : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        actions={actions}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
      <ProfitModal contract={recording} onClose={() => setRecording(null)} />
    </div>
  );
}

function ProfitModal({ contract, onClose }: { contract: MudarabahContract | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.mudarabah");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const record = useRecordMudarabahProfit();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const close = () => { setAmount(""); setReference(""); onClose(); };
  const valid = Number(amount) > 0 && reference.trim().length > 0;
  return (
    <Modal open={!!contract} onOpenChange={(o) => !o && close()} title={t("recordProfit")} className="max-w-md">
      {contract && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("profitHint", { number: contract.number })}</p>
          <Field label={tc("amount")}>
            <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t("reference")} hint={t("referenceHint")}>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="JV-2027-0412" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
            <Button disabled={!valid || record.isPending}
              onClick={() => record.mutate({ id: contract.id, amount: Number(amount), reference: reference.trim() }, {
                onSuccess: () => { toast({ title: t("profitRecorded") }); close(); }, onError,
              })}>
              {tc("save")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
