"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Ban, Loader2, Plus, Target, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { Detail, emptyPayment, Field, PaymentFields, paymentBody, PStatus, useErrorToast, type PaymentChoice } from "@/components/pilgrimage/shared";
import { Progress } from "@/components/pilgrimage/participations-tab";
import { useCancelParticipation, useContribute, useContributions, useParticipation, usePilgrimageGroup } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { GroupMemberView, Participation } from "@/types/pilgrimage";

function ParticipationInner({ id }: { id: string }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: p, isLoading } = useParticipation(id);
  const cancel = useCancelParticipation();
  const [contributing, setContributing] = useState(false);

  if (isLoading || !p) {
    return <div className="space-y-4 p-4 lg:p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }
  const s = p.standing;
  const canCancel = p.status === "active" && s.balance === 0 && has(EKUB_PERMS.PILGRIMAGE_MANAGE);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href="/dashboard/pilgrimage?tab=registrations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> {t("back")}
      </Link>
      <PageHeader
        title={p.member_name || tc("unknownMember")}
        subtitle={`${p.number} · ${p.product?.name ?? ""} · ${p.membership_number ?? ""}`}
        actions={
          <>
            <PStatus status={p.status} />
            {has(EKUB_PERMS.PILGRIMAGE_REGISTER) && (
              <Button disabled={!p.accepts_contributions} title={p.accepts_contributions ? undefined : t("contractNotReady")} onClick={() => setContributing(true)}>
                <Plus size={15} className="mr-1" /> {t("contribute")}
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(p.id, { onSuccess: () => toast({ title: t("cancelled") }), onError })}>
                <Ban size={15} className="mr-1" /> {t("cancel")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("balance")} value={formatCurrency(s.balance)} hint={t("percentOfPackage", { percent: s.contribution_percent })} icon={Wallet} tone="primary" />
        <StatCard label={t("required")} value={formatCurrency(s.required_contribution)} hint={t("ofPackage", { percent: s.eligibility_percent, amount: formatCurrency(s.package_cost) })} icon={Target} tone="info" />
        <StatCard label={t("eligibility")} value={s.eligible ? t("eligible") : formatCurrency(s.remaining_to_eligibility)} hint={s.eligible ? undefined : t("toGo")} icon={UsersRound} tone={s.eligible ? "success" : "warning"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-1 p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t("registration")}</h3>
          <Progress participation={p} />
          <Detail label={t("contract")}>{p.contract_number || "—"} {p.contract_status && <span className="text-xs text-muted-foreground">({p.contract_status})</span>}</Detail>
          <Detail label={t("channel")}>{t(`channel_${p.channel}` as never)}</Detail>
          <Detail label={t("registeredAt")}>{formatDate(p.created_at)}</Detail>
          <Detail label={t("cyclesEntered")}>{p.cycles_entered}</Detail>
          <Detail label={t("carriedForward")}>{p.carried_forward}</Detail>
          {p.current_cycle && (
            <Detail label={t("currentCycle")}>
              <Link href={`/dashboard/pilgrimage/cycles/${p.current_cycle.id}`} className="text-primary hover:underline">{p.current_cycle.name}</Link>{" "}
              <span className="text-xs text-muted-foreground">· {t("drawOn", { date: formatDate(p.current_cycle.draw_at) })}</span>
            </Detail>
          )}
          {!p.accepts_contributions && p.status === "active" && <p className="pt-2 text-xs text-warning">{t("contractNotReady")}</p>}
        </Card>
        <GroupCard participation={p} />
      </div>

      <Contributions id={p.id} />
      <ContributeModal participation={contributing ? p : null} onClose={() => setContributing(false)} />
    </div>
  );
}

/** The lottery group the member is in, if any. Members see eligibility, never balances. */
function GroupCard({ participation: p }: { participation: Participation }) {
  const t = useTranslations("pilgrimage.group");
  const { data: g, isLoading } = usePilgrimageGroup(p.group?.id ?? null);
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        {g && <span className="font-mono text-xs text-muted-foreground">{g.number}</span>}
      </div>
      {!p.group ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : isLoading || !g ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">{g.name} {g.locked && <span className="ml-2 text-xs text-warning">{t("locked")}</span>}</p>
          <p className="text-xs text-muted-foreground">{t("rule", { min: g.min_members, max: g.max_members })}</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {g.members.map((m) => <GroupMemberRow key={m.membership_id} member={m} current={m.participation_id === p.id} />)}
          </ul>
        </>
      )}
    </Card>
  );
}

function GroupMemberRow({ member: m, current }: { member: GroupMemberView; current: boolean }) {
  const t = useTranslations("pilgrimage.group");
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span>
        <Link href={`/dashboard/pilgrimage/participations/${m.participation_id}`} className={current ? "font-semibold" : "hover:underline"}>{m.member_name ?? m.participation_number}</Link>
        {m.role === "admin" && <span className="ml-2 text-xs text-primary">{t("admin")}</span>}
        {m.status === "invited" && <span className="ml-2 text-xs text-muted-foreground">{t("invited")}</span>}
      </span>
      <span className={m.eligible ? "text-xs text-success" : "text-xs text-muted-foreground"}>{m.eligible ? t("eligible") : t("notEligible")}</span>
    </li>
  );
}

type ContributionRow = { id: string; amount: number; status: string; payment_type: string; payment_method: string; reference_number?: string; created_at: string };

function Contributions({ id }: { id: string }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useContributions(id, page);
  const columns: DataTableColumn<ContributionRow>[] = [
    { id: "date", header: tc("date"), mobile: "title", cell: (r) => <span className="text-sm">{formatDateTime(r.created_at)}</span> },
    { id: "type", header: t("type"), mobile: "detail", cell: (r) => <span className="text-sm">{t(`paymentType_${r.payment_type}` as never)}</span> },
    { id: "method", header: t("method"), mobile: "detail", cell: (r) => <span className="text-sm">{r.payment_method?.replace(/_/g, " ")}</span> },
    { id: "ref", header: t("reference"), mobile: "detail", cell: (r) => <span className="font-mono text-xs">{r.reference_number || "—"}</span> },
    { id: "amount", header: tc("amount"), align: "right", mobile: "detail", cell: (r) => (
      <span className={r.payment_type === "savings_deposit" ? "tabular-nums" : "tabular-nums text-destructive"}>
        {r.payment_type === "savings_deposit" ? "" : "−"}{formatCurrency(r.amount)}
      </span>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => <span className="text-xs capitalize">{r.status}</span> },
  ];
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t("history")}</h3>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("noContributions")}
        pagination={{ page, pageSize: 10, total: data?.meta.total ?? 0, onPageChange: setPage }}
      />
    </section>
  );
}

/** Records a contribution: a deposit on the member's own saving contract, credited when accounting confirms it. */
function ContributeModal({ participation: p, onClose }: { participation: Participation | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const contribute = useContribute();
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<PaymentChoice>(emptyPayment());
  const close = () => { setAmount(""); setPayment(emptyPayment()); onClose(); };
  const valid = Number(amount) > 0 && !!payment.method && !!payment.accountId;
  return (
    <Modal open={!!p} onOpenChange={(o) => !o && close()} title={t("contribute")} className="max-w-xl">
      {p && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("contributeHint", { remaining: formatCurrency(p.standing.remaining_to_eligibility) })}</p>
          <Field label={tc("amount")}>
            <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
          <PaymentFields value={payment} onChange={setPayment} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
            <Button disabled={!valid || contribute.isPending}
              onClick={() => {
                const pay = paymentBody(payment);
                contribute.mutate(
                  { id: p.id, body: { amount: Number(amount), payment_method: pay.payment_method!, payment_account_id: pay.payment_account_id, transaction_id: pay.transaction_id } },
                  { onSuccess: () => { toast({ title: t("contributed"), description: t("awaitingConfirmation") }); close(); }, onError },
                );
              }}>
              {contribute.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("contribute")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function PilgrimageParticipationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PILGRIMAGE_READ]}>
      <ParticipationInner id={id} />
    </RequirePermission>
  );
}
