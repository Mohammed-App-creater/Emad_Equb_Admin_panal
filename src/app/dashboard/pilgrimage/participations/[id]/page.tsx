"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Ban, Plus, Target, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { Detail, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { ContributeModal, ContributionHistory } from "@/components/pilgrimage/contributions";
import { Progress } from "@/components/pilgrimage/participations-tab";
import { useCancelParticipation, useParticipation, usePilgrimageGroup } from "@/hooks/pilgrimage";
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
  const [contributing, setContributing] = useState(false);

  if (isLoading || !p) {
    return <div className="space-y-4 p-4 lg:p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }
  const s = p.standing;
  const canCancel = p.status === "active" && s.balance === 0 && has(EKUB_PERMS.PILGRIMAGE_MANAGE);

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

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("history")}</h3>
        <ContributionHistory id={p.id} />
      </section>
      <ContributeModal target={contributing ? { id: p.id, memberName: p.member_name, remainingToEligibility: s.remaining_to_eligibility } : null} onClose={() => setContributing(false)} />
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

export default function PilgrimageParticipationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PILGRIMAGE_READ]}>
      <ParticipationInner id={id} />
    </RequirePermission>
  );
}
