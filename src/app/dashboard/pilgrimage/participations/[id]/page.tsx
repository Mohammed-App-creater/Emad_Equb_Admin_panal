"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, Ban, HandCoins, Loader2, Pencil, Plus, Receipt, Target, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { AgentSelect, Detail, FeeStatus, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { ContributeModal, ContributionHistory } from "@/components/pilgrimage/contributions";
import { Progress } from "@/components/pilgrimage/participations-tab";
import { DeadlineCell, Journey, NextStep } from "@/components/pilgrimage/winners-tab";
import { CycleCalendar } from "@/components/pilgrimage/cycle-dates";
import {
  useCancelParticipation, useParticipation, usePilgrimageGroup, usePilgrimageWinners, useRetryWinner,
  useSetParticipationAgent,
} from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { GroupMemberView, Participation } from "@/types/pilgrimage";

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
      <Link href={p.current_cycle ? `/dashboard/pilgrimage/cycles/${p.current_cycle.id}?tab=members` : `/dashboard/pilgrimage?kind=${p.product?.kind ?? "hajj"}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> {p.current_cycle ? t("backToCycle", { name: p.current_cycle.name }) : t("back")}
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
        <StatCard label={t("balance")} value={formatCurrency(p.balance)}
          hint={(p.pending_savings ?? 0) > 0 ? t("balanceHintPending", { amount: formatCurrency(p.pending_savings ?? 0) }) : t("balanceHint")}
          icon={Wallet} tone="primary" />
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

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("history")}</h3>
        <ContributionHistory id={p.id} />
      </section>
      <ContributeModal
        target={paying ? { id: p.id, memberName: p.member_name, remainingToEligibility: s.remaining_to_eligibility, feesOnly: paying === "fees" } : null}
        onClose={() => setPaying(null)}
      />
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

/** A winner's way into EMAD SACCO, with what has to happen next. */
function WinnerCard({ participation: p }: { participation: Participation }) {
  const t = useTranslations("pilgrimage.winner");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const retry = useRetryWinner();
  const { data } = usePilgrimageWinners({ member_id: p.member_id, limit: 20 });
  const w = data?.items.find((x) => x.participation_id === p.id);
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
          {w.saving_contract && (
            <>
              <Detail label={t("contract")}>
                <span className="font-mono">{w.saving_contract.contract_number || t("draftNumber")}</span> <span className="text-xs text-muted-foreground">({w.saving_contract.status})</span>
              </Detail>
              <Detail label={t("contractTotal")}>{formatCurrency(w.saving_contract.requested_amount)}</Detail>
              <Detail label={t("toFinance")}>{w.saving_contract.financed_amount > 0 ? formatCurrency(w.saving_contract.financed_amount) : t("setInSacco")}</Detail>
            </>
          )}
        </div>
        <NextStep winner={w} canManage={canManage} />
        {canManage && w.status !== "completed" && (
          <Button size="sm" variant="outline" disabled={retry.isPending}
            onClick={() => retry.mutate(w.id, { onSuccess: (r) => toast({ title: r.failure_reason ? t("stillWaiting") : t("retried"), description: r.failure_reason }), onError })}>
            {t("retry")}
          </Button>
        )}
      </div>
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

export default function PilgrimageParticipationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PILGRIMAGE_READ]}>
      <ParticipationInner id={id} />
    </RequirePermission>
  );
}
