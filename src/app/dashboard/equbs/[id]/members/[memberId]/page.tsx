"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, Wallet, Ban, RotateCcw, CheckCircle2, AlertTriangle, Clock, Trophy, Coins, PiggyBank, Heart,
  Phone, Mail, MapPin, Building2, UserRound, CalendarDays, Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { RecordPaymentModal, type RecordPaymentTarget } from "@/components/equb/record-payment-modal";
import { WinnersTable } from "@/components/equb/winners-tab";
import { FeeLinesTable } from "@/components/equb/admin-fees-tab";
import {
  useEqub, useEqubMembers, useMemberProfile, useMemberStanding, useCatchUp, useRounds, useRoundDetails,
  useMemberAdminFees, useIsEqubManager, useEqubWinners, useTakaful, useEmergencyDraws, useSetSuspended,
} from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency, formatDate, formatDateTime, getErrorMessage } from "@/lib/utils";
import type { Round, RoundMemberPayment, TakafulTxn } from "@/types/ekub";

const isPaid = (p: RoundMemberPayment) => p.status?.toLowerCase() === "paid" || !!p.paidAt;
type ContributionRow = { round: Round; pay: RoundMemberPayment };

function MemberProfileInner({ equbId, memberId }: { equbId: string; memberId: string }) {
  const t = useTranslations("memberProfile");
  const tc = useTranslations("common");
  const tr = useTranslations("rounds");
  const tp = useTranslations("recordPayment");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.EQUB_MANAGE) || has(EKUB_PERMS.PENALTY_MANAGE);

  const { data: equb } = useEqub(equbId);
  const { data: roster, isLoading: rosterLoading } = useEqubMembers(equbId);
  const member = roster?.find((m) => m.memberId === memberId);
  const { data: profile, isLoading: profileLoading } = useMemberProfile(memberId);
  const { isManager, managerName } = useIsEqubManager(equbId);
  const { data: standing, error: standingError } = useMemberStanding(equbId, memberId, isManager === true);
  const { data: catchUp } = useCatchUp(equbId, memberId, isManager === true);
  const { data: list } = useRounds(equbId);
  const startedIds = useMemo(() => (list ?? []).filter((r) => r.status !== "scheduled").map((r) => r.id), [list]);
  const details = useRoundDetails(startedIds);
  const { data: fees } = useMemberAdminFees(equbId, memberId);
  const { data: winners } = useEqubWinners(equbId);
  const { data: takaful } = useTakaful(equbId);
  const { data: hardship } = useEmergencyDraws(equbId);
  const setSuspended = useSetSuspended();

  const [paying, setPaying] = useState<RecordPaymentTarget | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");

  // ---- this member's rows out of each round's payments ----------------------------
  const contributions: ContributionRow[] = useMemo(() => {
    const byId = new Map(startedIds.map((id, i) => [id, details[i]?.data]));
    return (list ?? [])
      .map((r) => byId.get(r.id) ?? r)
      .flatMap((round) => {
        const pay = round.memberPayments.find((p) => p.memberId === memberId);
        return pay ? [{ round, pay }] : [];
      })
      .sort((a, b) => b.round.roundNumber - a.round.roundNumber);
  }, [list, startedIds, details, memberId]);
  const paidRows = contributions.filter((c) => isPaid(c.pay));
  const paidTotal = paidRows.reduce((a, c) => a + c.pay.amount, 0);
  const unpaidTotal = contributions.filter((c) => !isPaid(c.pay)).reduce((a, c) => a + c.pay.amount, 0);
  const myWins = (winners ?? []).filter((w) => w.memberId === memberId);
  const wonAmount = myWins.filter((w) => w.status === "paid").reduce((a, w) => a + w.payoutAmount, 0);
  const myTakaful = (takaful ?? []).filter((x) => x.memberId === memberId);
  const takafulGiven = myTakaful.filter((x) => x.type === "contribution").reduce((a, x) => a + x.amount, 0);
  const myHardship = (hardship ?? []).filter((h) => h.memberId === memberId);

  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });

  if (rosterLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    );
  }
  if (!member) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Link href={`/dashboard/equbs/${equbId}?tab=members`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> {t("backToMembers")}</Link>
        <p className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const name = profile?.fullName || member.name;
  const contributionCols: DataTableColumn<ContributionRow>[] = [
    { id: "round", sortValue: (r) => r.round.roundNumber, header: t("round"), mobile: "title", cell: (r) => (
      <Link href={`/dashboard/equbs/${equbId}/rounds/${r.round.id}`} className="font-medium text-foreground hover:underline">{tr("roundNo", { n: r.round.roundNumber })}</Link>
    ) },
    { id: "due", sortValue: (r) => r.round.contributionDueDate, header: tr("dueDate"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.round.contributionDueDate)}</span> },
    { id: "amount", sortValue: (r) => r.pay.amount, header: tc("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.pay.amount)}</span> },
    { id: "paidAt", sortValue: (r) => r.pay.paidAt, header: tr("paidAt"), mobile: "detail", cell: (r) => <span className="text-sm">{r.pay.paidAt ? formatDateTime(r.pay.paidAt) : "—"}</span> },
    { id: "catchUp", header: tr("catchUp"), mobile: "detail", align: "center", cell: (r) => (r.pay.isCatchUp ? <Badge className="bg-info/15 text-info">{tr("catchUp")}</Badge> : <span className="text-muted-foreground">—</span>) },
    { id: "status", sortValue: (r) => (isPaid(r.pay) ? "paid" : r.pay.status), header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={isPaid(r.pay) ? "paid" : r.pay.status || "unpaid"} kind="payment" /> },
  ];
  const takafulCols: DataTableColumn<TakafulTxn>[] = [
    { id: "type", sortValue: (r) => r.type, header: tc("status"), mobile: "badge", cell: (r) => <Badge className="capitalize">{r.type}</Badge> },
    { id: "amount", sortValue: (r) => r.amount, header: tc("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.amount)}</span> },
    { id: "ref", header: "Ref", mobile: "detail", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
    { id: "date", sortValue: (r) => r.createdAt, header: tc("date"), mobile: "title", cell: (r) => <span className="text-sm">{formatDateTime(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href={`/dashboard/equbs/${equbId}?tab=members`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {t("backToMembers")}{equb ? ` · ${equb.name}` : ""}
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">{getInitials(name)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{name}</h2>
                <StatusBadge status={member.status} kind="member" />
                {standing && !standing.good && <StatusBadge status={standing.banned ? "banned" : standing.status} kind="request" className={cn(standing.banned ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")} />}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Hash size={13} /> {member.membershipNumber}</span>
                <span className="inline-flex items-center gap-1"><UserRound size={13} /> {t("position")} #{member.position}</span>
                {(profile?.phone || member.phone) && <span className="inline-flex items-center gap-1"><Phone size={13} /> {profile?.phone || member.phone}</span>}
                {profile?.email && <span className="inline-flex items-center gap-1"><Mail size={13} /> {profile.email}</span>}
                <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {t("joined")}: {formatDate(member.joinedAt)}</span>
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {equb?.status === "active" && (
                <Button onClick={() => setPaying({ equbId, memberId })}><Wallet size={15} className="mr-1" /> {t("recordPayment")}</Button>
              )}
              {member.status === "suspended" ? (
                <Button variant="outline" disabled={setSuspended.isPending} onClick={() => setSuspended.mutate({ equbId, memberId, suspend: false }, { onSuccess: () => toast({ title: t("unsuspend"), description: name }), onError: err })}>
                  <RotateCcw size={15} className="mr-1" /> {t("unsuspend")}
                </Button>
              ) : (
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setReason(""); setSuspending(true); }}>
                  <Ban size={15} className="mr-1" /> {t("suspend")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Money at a glance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("paidTotal")} value={formatCurrency(paidTotal)} hint={`${t("roundsPaid")}: ${paidRows.length}/${contributions.length}`} icon={CheckCircle2} tone="success" />
        <StatCard label={t("unpaidTotal")} value={formatCurrency(unpaidTotal)} hint={standing ? `${t("unpaidRounds")}: ${standing.unpaidRounds}` : undefined} icon={Clock} tone={unpaidTotal > 0 ? "warning" : "primary"} />
        <StatCard label={t("wins")} value={myWins.length} hint={t("winsHint", { count: myWins.length, amount: formatCurrency(wonAmount) })} icon={Trophy} tone="secondary" />
        <StatCard label={t("feesOutstanding")} value={fees ? formatCurrency(fees.totals.outstanding) : "…"} hint={`${t("takafulGiven")}: ${formatCurrency(takafulGiven)}`} icon={Coins} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Standing */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("standing")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isManager === false ? (
              <p className="text-sm text-muted-foreground">{managerName ? tp("managerOnly", { name: managerName }) : tp("managerOnlyNone")}</p>
            ) : standingError ? (
              <p className="text-sm text-muted-foreground">{tp("standingUnavailable")}: {getErrorMessage(standingError, "")}</p>
            ) : !standing ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : (
              <>
                <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm", standing.good ? "border-success/30 bg-success/10 text-success" : standing.banned ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning")}>
                  {standing.good ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-medium">{tp(`standing_${standing.status}` as never) || standing.status}</p>
                    {standing.whatToDo.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs opacity-90">{standing.whatToDo.map((w) => <li key={w}>{w}</li>)}</ul>}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Row label={tc("status")} value={standing.eligibleNextDraw ? <span className="text-success">{t("eligibleNextDraw")}</span> : <span className="text-warning">{t("notEligible")}</span>} />
                  <Row label={t("missed")} value={String(standing.missedCount)} />
                  <Row label={t("unpaidRounds")} value={`${standing.unpaidRounds} · ${formatCurrency(standing.unpaidAmount)}`} />
                  <Row label={t("catchUp")} value={catchUp && catchUp.roundsMissed > 0 ? `${catchUp.roundsMissed} × ${formatCurrency(catchUp.perRoundAmount)} = ${formatCurrency(catchUp.totalCatchUp)}` : formatCurrency(standing.catchUpAmount)} />
                  {standing.warningIssued && <Row label={t("warning")} value={<span className="text-warning">{tc("yes")}</span>} />}
                  {standing.banned && <Row label={t("bannedNow")} value={<span className="text-destructive">{standing.bannedUntilRound ? t("banned", { n: standing.bannedUntilRound }) : tc("yes")}</span>} />}
                </dl>
              </>
            )}
          </CardContent>
        </Card>

        {/* SACCO profile */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("profile")}</CardTitle></CardHeader>
          <CardContent>
            {profileLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : !profile ? (
              <p className="text-sm text-muted-foreground">{t("noProfile")}</p>
            ) : (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Row label={t("gender")} value={<span className="capitalize">{profile.gender || "—"}</span>} />
                  <Row label={t("age")} value={profile.age ? String(profile.age) : "—"} />
                  <Row label={t("email")} value={profile.email || "—"} />
                  <Row label={t("phone")} value={profile.phone || "—"} />
                  <Row label={t("branch")} value={<span className="inline-flex items-center gap-1"><Building2 size={13} className="text-muted-foreground" /> {profile.branch || "—"}</span>} />
                  <Row label={t("category")} value={<span className="capitalize">{profile.category.replace(/_/g, " ") || "—"}</span>} />
                  <Row label={t("saccoStatus")} value={<span className="capitalize">{profile.status || "—"}</span>} />
                  <Row label={t("memberSince")} value={formatDate(profile.memberSince)} />
                  <div className="col-span-2"><Row label={t("address")} value={<span className="inline-flex items-start gap-1"><MapPin size={13} className="mt-0.5 shrink-0 text-muted-foreground" /> {profile.address || "—"}</span>} /></div>
                </dl>
                {profile.emergencyContacts.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("emergencyContacts")}</p>
                    <ul className="space-y-1 text-sm">
                      {profile.emergencyContacts.map((c, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-x-2 rounded-lg bg-muted/40 px-3 py-1.5">
                          <span className="font-medium text-foreground">{c.name}</span>
                          {c.relationship && <span className="text-xs text-muted-foreground">· {c.relationship}</span>}
                          {c.phone && <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Tabs defaultValue="contributions">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="contributions" className="gap-1.5"><Wallet size={14} /> {t("tabContributions")}</TabsTrigger>
          <TabsTrigger value="fees" className="gap-1.5"><Coins size={14} /> {t("tabFees")}</TabsTrigger>
          <TabsTrigger value="wins" className="gap-1.5"><Trophy size={14} /> {t("tabWins")}</TabsTrigger>
          <TabsTrigger value="takaful" className="gap-1.5"><PiggyBank size={14} /> {t("tabTakaful")}</TabsTrigger>
          <TabsTrigger value="hardship" className="gap-1.5"><Heart size={14} /> {t("tabHardship")}</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="mt-4">
          <DataTable
            filters={{ facets: [{ id: "status", label: tc("status"), get: (r) => (isPaid(r.pay) ? "paid" : r.pay.status || "unpaid") }] }}
            columns={contributionCols}
            data={contributions}
            rowKey={(r) => r.round.id}
            isLoading={details.some((d) => d.isLoading)}
            emptyTitle={tc("noData")}
            emptyMessage={t("noContributions")}
            defaultSort={{ id: "round", dir: "desc" }}
            renderLeadingActions={(r) =>
              canManage && equb?.status === "active" && !isPaid(r.pay) && (r.pay.status || "").toLowerCase() !== "processing" ? (
                <Button size="sm" onClick={() => setPaying({ equbId, memberId, roundIds: [r.round.id] })}><Wallet size={13} className="mr-1" /> {tp("pay")}</Button>
              ) : null
            }
          />
        </TabsContent>
        <TabsContent value="fees" className="mt-4">
          {fees ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">{t("tabFees")}</CardTitle>
                <span className="text-xs text-muted-foreground">{formatCurrency(fees.totals.collected)} / {formatCurrency(fees.totals.charged)}</span>
              </CardHeader>
              <CardContent><FeeLinesTable lines={fees.lines} by="round" /></CardContent>
            </Card>
          ) : <Skeleton className="h-40 rounded-xl" />}
        </TabsContent>
        <TabsContent value="wins" className="mt-4">
          <WinnersTable equbId={equbId} winners={myWins} isLoading={!winners} guaranteeRequired={equb?.effectiveTerms?.guaranteeRequired ?? equb?.category?.guaranteeRequired ?? true} />
        </TabsContent>
        <TabsContent value="takaful" className="mt-4">
          <DataTable filters={{ facets: [{ id: "type", label: tc("status"), get: (r) => r.type }] }} columns={takafulCols} data={myTakaful} rowKey={(r) => r.id} isLoading={!takaful} emptyTitle={tc("noData")} emptyMessage={t("noTakaful")} defaultSort={{ id: "date", dir: "desc" }} />
        </TabsContent>
        <TabsContent value="hardship" className="mt-4 space-y-3">
          {myHardship.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("noHardship")}</p>
          ) : (
            myHardship.map((h) => (
              <div key={h.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                  <StatusBadge status={h.status} kind="request" />
                </div>
                <p className="mt-2 text-sm text-foreground">{h.reason}</p>
                {h.reviewNote && <p className="mt-1 text-xs text-muted-foreground">{h.reviewNote}</p>}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <RecordPaymentModal target={paying} onClose={() => setPaying(null)} />

      <Modal open={suspending} onOpenChange={setSuspending} title={t("suspend")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("suspendReason")}</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSuspending(false)}>{tc("cancel")}</Button>
            <Button variant="destructive" disabled={!reason || setSuspended.isPending} onClick={() => setSuspended.mutate({ equbId, memberId, suspend: true, reason }, { onSuccess: () => { toast({ title: t("suspend"), description: name }); setSuspending(false); }, onError: err })}>
              {t("suspend")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default function MemberProfilePage({ params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.EQUB_READ, EKUB_PERMS.APPLICATION_READ, EKUB_PERMS.PENALTY_READ]}>
      <MemberProfileInner equbId={id} memberId={memberId} />
    </RequirePermission>
  );
}
