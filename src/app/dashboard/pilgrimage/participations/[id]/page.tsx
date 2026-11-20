"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, Ban, HandCoins, Loader2, Pencil, Plus, Receipt, Target, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  AgentSelect, Detail, emptyMethod, FeeBreakdown, FeeStatus, Field, MethodFields, PaymentOutcomeButtons, PStatus, useErrorToast, type MethodChoice,
} from "@/components/pilgrimage/shared";
import { Progress } from "@/components/pilgrimage/participations-tab";
import { AgreeTermsModal, DeadlineCell, Journey, NextStep } from "@/components/pilgrimage/winners-tab";
import { CycleCalendar } from "@/components/pilgrimage/cycle-dates";
import {
  useCancelParticipation, useContribute, useParticipation, useParticipationContributions, usePilgrimageGroup, usePilgrimageWinners, useRetryWinner,
  useSetParticipationAgent,
} from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Contribution, GroupMemberView, Participation, PilgrimageWinner } from "@/types/pilgrimage";

function ParticipationInner({ id }: { id: string }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: p, isLoading } = useParticipation(id);
  const cancel = useCancelParticipation();
  /** The payment modal: a contribution (fees optional), or the fees alone. */
  const [paying, setPaying] = useState<"contribution" | "fees" | null>(null);

  if (isLoading || !p) {
    return <div className="space-y-4 p-4 lg:p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }
  const s = p.standing;
  const canCancel = p.status === "active" && p.balance === 0 && has(EKUB_PERMS.PILGRIMAGE_MANAGE);

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
            {has(EKUB_PERMS.PILGRIMAGE_REGISTER) && p.accepts_contributions && (
              <Button onClick={() => setPaying("contribution")}><Plus size={15} className="mr-1" /> {t("contribute")}</Button>
            )}
            {has(EKUB_PERMS.PILGRIMAGE_REGISTER) && p.fees?.accepts_payment && (
              <Button variant={p.accepts_contributions ? "outline" : "default"} onClick={() => setPaying("fees")}>
                <Receipt size={15} className="mr-1" /> {t("payFees")}
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
        <StatCard label={t("balance")} value={formatCurrency(p.balance)} hint={t("balanceHint")} icon={Wallet} tone="primary" />
        <StatCard label={t("required")} value={formatCurrency(s.required_contribution)} hint={t("ofPackage", { percent: s.eligibility_percent, amount: formatCurrency(s.package_cost) })} icon={Target} tone="info" />
        <StatCard label={t("eligibility")} value={s.eligible ? t("eligible") : formatCurrency(s.remaining_to_eligibility)} hint={s.eligible ? t("percentOfPackage", { percent: s.contribution_percent }) : t("toGo")} icon={UsersRound} tone={s.eligible ? "success" : "warning"} />
      </div>

      {p.status === "won" && p.fees && !p.fees.settled && !p.saving_contract_id && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{t("winnerFeesDue", { amount: formatCurrency(p.fees.outstanding) })}</span>
        </div>
      )}
      {p.status === "won" && <WinnerCard participation={p} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-1 p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t("registration")}</h3>
          <Progress participation={p} />
          <AgentLine participation={p} />
          <Detail label={t("channel")}>{t(`channel_${p.channel}` as never)}</Detail>
          <Detail label={t("fees")}><FeeStatus fees={p.fees} /></Detail>
          <Detail label={t("contract")}>
            {p.contract_number ? <>{p.contract_number} <span className="text-xs text-muted-foreground">({p.contract_status})</span></> : <span className="text-muted-foreground">{t("noContract")}</span>}
          </Detail>
          <Detail label={t("registeredAt")}>{formatDate(p.created_at)}</Detail>
          <Detail label={t("cyclesEntered")}>{p.cycles_entered}</Detail>
          <Detail label={t("carriedForward")}>{p.carried_forward}</Detail>
          {p.current_cycle && (
            <>
              <Detail label={t("currentCycle")}>
                <Link href={`/dashboard/pilgrimage/cycles/${p.current_cycle.id}`} className="text-primary hover:underline">{p.current_cycle.name}</Link>{" "}
                <span className="text-xs text-muted-foreground">· {t("drawOn", { date: formatDate(p.current_cycle.draw_at) })}</span>
              </Detail>
              <div className="pt-2"><CycleCalendar cycle={p.current_cycle} /></div>
            </>
          )}
        </Card>
        <GroupCard participation={p} />
      </div>

      <Contributions id={p.id} />
      <PaymentModal participation={paying ? p : null} feesOnly={paying === "fees"} onClose={() => setPaying(null)} />
    </div>
  );
}

/** The participation's agent, who earns the agent share of its admin fees; staff can change it. */
function AgentLine({ participation: p }: { participation: Participation }) {
  const t = useTranslations("pilgrimage.agent");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const setAgent = useSetParticipationAgent();
  const [editing, setEditing] = useState(false);
  const [agentId, setAgentId] = useState(p.agent_user_id ?? "");
  const open = p.status === "active" || p.status === "deciding" || p.status === "won";
  return (
    <>
      <Detail label={t("label")}>
        <span className="inline-flex items-center gap-1.5">
          {p.agent_name || (p.agent_user_id ? t("unnamed") : <span className="text-muted-foreground">{t("none")}</span>)}
          {open && has(EKUB_PERMS.PILGRIMAGE_MANAGE) && (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)} aria-label={t("change")}><Pencil size={12} /></button>
          )}
        </span>
      </Detail>
      <Modal open={editing} onOpenChange={setEditing} title={t("change")} className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("changeHint")}</p>
          <AgentSelect value={agentId} onChange={setAgentId} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>{tc("cancel")}</Button>
            <Button disabled={setAgent.isPending} onClick={() => setAgent.mutate({ id: p.id, agentUserId: agentId }, {
              onSuccess: () => { toast({ title: t("changed") }); setEditing(false); }, onError,
            })}>
              {setAgent.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {tc("save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** A winner's way from the draw to their finance, with the action due now. */
function WinnerCard({ participation: p }: { participation: Participation }) {
  const t = useTranslations("pilgrimage.winner");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const retry = useRetryWinner();
  const { data } = usePilgrimageWinners({ member_id: p.member_id, limit: 20 });
  const w = data?.items.find((x) => x.participation_id === p.id);
  const [agreeing, setAgreeing] = useState<PilgrimageWinner | null>(null);
  if (!w) return <Skeleton className="h-40 w-full" />;
  const canManage = has(EKUB_PERMS.PILGRIMAGE_MANAGE);
  return (
    <Card className="grid grid-cols-1 gap-6 border-primary/30 p-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HandCoins size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("cardTitle")}</h3>
        </div>
        <Journey winner={w} vertical />
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border p-3">
          <Detail label={t("savingsMoved")}>{formatCurrency(w.recognised_savings)}</Detail>
          <Detail label={t("contractDeadline")}><DeadlineCell winner={w} /></Detail>
          <Detail label={t("financeAmount")}>{w.finance_amount > 0 ? formatCurrency(w.finance_amount) : "—"}</Detail>
          <Detail label={t("contractTotal")}>{w.finance_amount > 0 ? formatCurrency(w.recognised_savings + w.finance_amount) : "—"}</Detail>
          {w.loan_application && <Detail label={t("financeNumber")}>{w.loan_application.finance_number} · {w.loan_application.status}</Detail>}
        </div>
        <NextStep winner={w} canManage={canManage} onAgree={() => setAgreeing(w)} />
        {canManage && w.status !== "awaiting_terms" && w.status !== "finance_opened" && (
          <Button size="sm" variant="outline" disabled={retry.isPending}
            onClick={() => retry.mutate(w.id, { onSuccess: (r) => toast({ title: r.failure_reason ? t("stillWaiting") : t("retried"), description: r.failure_reason }), onError })}>
            {t("retry")}
          </Button>
        )}
      </div>
      <AgreeTermsModal winner={agreeing} onClose={() => setAgreeing(null)} />
    </Card>
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

function Contributions({ id }: { id: string }) {
  const t = useTranslations("pilgrimage.ledger");
  const tp = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useParticipationContributions(id, page);
  const columns: DataTableColumn<Contribution>[] = [
    { id: "date", header: tc("date"), mobile: "title", cell: (c) => <span className="text-sm">{formatDateTime(c.created_at)}</span> },
    { id: "savings", header: t("savings"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums">{formatCurrency(c.amount)}</span> },
    { id: "fees", header: t("fees"), align: "right", mobile: "detail", cell: (c) => <span className="tabular-nums text-muted-foreground">{formatCurrency(c.admin_fee + c.takaful_fee)}</span> },
    { id: "total", header: t("paid"), align: "right", mobile: "detail", cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.total_amount)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (c) => (
      c.status === "pending" && c.payment_id ? <PaymentOutcomeButtons paymentId={c.payment_id} /> : <PStatus status={c.status} />
    ) },
  ];
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{tp("history")}</h3>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={tp("noContributions")}
        pagination={{ page, pageSize: 10, total: data?.meta.total ?? 0, onPageChange: setPage }}
      />
    </section>
  );
}

/**
 * Records a payment in one Equb ledger payment confirmed by staff: savings,
 * and (when owed and chosen) the whole of the outstanding admin fee and
 * Takaful. The fees are paid once, whenever the member chooses; a winner pays
 * them before their contract is opened. feesOnly opens it for the fees alone.
 */
function PaymentModal({ participation: p, feesOnly, onClose }: { participation: Participation | null; feesOnly: boolean; onClose: () => void }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const contribute = useContribute();
  const [amount, setAmount] = useState("");
  const [payFees, setPayFees] = useState<boolean | null>(null);
  const [payment, setPayment] = useState<MethodChoice>(emptyMethod());
  const close = () => { setAmount(""); setPayFees(null); setPayment(emptyMethod()); onClose(); };
  if (!p) return null;

  const feesOwed = !!p.fees?.accepts_payment;
  const savingsAllowed = !feesOnly && p.accepts_contributions;
  // Fees default on when they are owed: most members pay them with their first contribution.
  const withFees = feesOwed && (feesOnly || (payFees ?? true));
  const savings = savingsAllowed ? Number(amount) || 0 : 0;
  const adminFee = withFees ? Math.max(0, (p.fees?.admin_fee_due ?? 0) - (p.fees?.admin_fee_paid ?? 0)) : 0;
  const takaful = withFees ? Math.max(0, (p.fees?.takaful_fee_due ?? 0) - (p.fees?.takaful_fee_paid ?? 0)) : 0;
  const valid = (savings > 0 || withFees) && !(Number(amount) < 0) && !!payment.method;

  return (
    <Modal open onOpenChange={(o) => !o && close()} title={feesOnly ? t("payFees") : t("contribute")} className="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {feesOnly ? t("payFeesHint", { amount: formatCurrency(p.fees?.outstanding ?? 0) }) : t("contributeHint", { remaining: formatCurrency(p.standing.remaining_to_eligibility) })}
        </p>
        {savingsAllowed && (
          <Field label={t("savingsAmount")} hint={withFees ? t("savingsOptional") : undefined}>
            <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
        )}
        {!feesOnly && feesOwed && (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("includeFees", { amount: formatCurrency(p.fees?.outstanding ?? 0) })}</span>
              <span className="block text-xs text-muted-foreground">{t("includeFeesHint")}</span>
            </span>
            <Switch checked={withFees} onCheckedChange={setPayFees} />
          </label>
        )}
        {(savings > 0 || withFees) && <FeeBreakdown savings={savings} adminFee={adminFee} takaful={takaful} />}
        <MethodFields value={payment} onChange={setPayment} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
          <Button disabled={!valid || contribute.isPending}
            onClick={() => contribute.mutate(
              { id: p.id, body: { amount: savings, pay_fees: withFees || undefined, payment_method: payment.method, transaction_id: payment.reference.trim() || undefined } },
              { onSuccess: () => { toast({ title: savings > 0 ? t("contributed") : t("feesRecorded"), description: t("awaitingConfirmation") }); close(); }, onError },
            )}>
            {contribute.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {feesOnly ? t("payFees") : t("contribute")}
          </Button>
        </div>
      </div>
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
