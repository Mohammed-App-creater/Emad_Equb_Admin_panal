"use client";

import { Suspense, use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Ban, Dices, Hand, LayoutDashboard, Lock, ShieldCheck, Trophy, UserRoundCog, UsersRound, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { RequirePermission } from "@/components/auth/require-permission";
import { Detail, Field, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { WinnersTab } from "@/components/pilgrimage/winners-tab";
import { DecisionsTab } from "@/components/pilgrimage/decisions-tab";
import { CycleGroupsTab } from "@/components/pilgrimage/groups-tab";
import { CycleOverview } from "@/components/pilgrimage/cycle-overview";
import { CycleMembersTab } from "@/components/pilgrimage/cycle-members-tab";
import { CyclePaymentsTab } from "@/components/pilgrimage/cycle-payments-tab";
import { cycleYear, isLive, useCycleMembers } from "@/components/pilgrimage/cycle-members";
import { useApproveDraw, useCancelCycle, useDrawResult, useLockCycle, usePilgrimageProduct, useRunDraw } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { DrawEntry, PilgrimageCycle } from "@/types/pilgrimage";

const TABS = ["overview", "members", "payments", "draw", "groups", "winners", "decisions"] as const;
type Tab = (typeof TABS)[number];
const tabIcon: Record<Tab, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  members: UsersRound,
  payments: Wallet,
  draw: Dices,
  groups: UserRoundCog,
  winners: Trophy,
  decisions: Hand,
};

/**
 * One Hajj/Umrah Equb (a product's cycle), laid out like an Equb's page:
 * overview, members, their payments, the draw record with its lock -> draw ->
 * approve (by a second person) steps, groups, winners and non-winners'
 * decisions.
 */
function CycleInner({ id }: { id: string }) {
  const t = useTranslations("pilgrimage.cycle");
  const tl = useTranslations("pilgrimage.list");
  const tt = useTranslations("pilgrimage.cycleTabs");
  const tp = useTranslations("pilgrimage.product");
  const router = useRouter();
  const params = useSearchParams();
  const { data, isLoading, isError } = useDrawResult(id);
  const { data: fetchedProduct } = usePilgrimageProduct(data?.cycle.product_id ?? "");
  const { members, isLoading: membersLoading } = useCycleMembers(data?.cycle, data?.entries);
  const memberIds = useMemo(() => new Set(members.map((m) => m.participationId)), [members]);

  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "overview";
  const setTab = (next: string) => router.replace(`/dashboard/pilgrimage/cycles/${id}?tab=${next}`, { scroll: false });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Link href="/dashboard/pilgrimage" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> {tl("backToList")}
        </Link>
        <p className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{tl("notFound")}</p>
      </div>
    );
  }
  const { cycle, entries } = data;
  const product = fetchedProduct ?? cycle.product ?? undefined;
  const live = isLive(cycle, entries);
  const kind = product?.kind ?? "hajj";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href={`/dashboard/pilgrimage?kind=${kind}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {tl("backTo", { kind: tl(`kind_${kind}`) })}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{cycle.name}</h2>
            <PStatus status={cycle.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product && <><span className="font-mono">{product.code}</span> · {tp(`kind_${product.kind}` as never)} · </>}
            #{cycle.number} · {cycleYear(cycle)}
            {" · "}{t("drawAt")}: <span className="text-foreground">{formatDate(cycle.draw_at)}</span>
            {" · "}{tl("membersCount", { count: members.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2"><CycleActions cycle={cycle} /></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {TABS.map((k) => {
            const Icon = tabIcon[k];
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!">
                <Icon size={15} /> {tt(k)}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <CycleOverview cycle={cycle} product={product} members={members} membersLoading={membersLoading} live={live} />
        </TabsContent>
        <TabsContent value="members" className="mt-4"><CycleMembersTab cycle={cycle} members={members} isLoading={membersLoading} live={live} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><CyclePaymentsTab cycle={cycle} members={members} isLoading={membersLoading} live={live} /></TabsContent>
        <TabsContent value="draw" className="mt-4 space-y-4">
          <FairnessCard cycle={cycle} />
          <EntriesTable entries={entries} />
        </TabsContent>
        <TabsContent value="groups" className="mt-4"><CycleGroupsTab productId={cycle.product_id} participationIds={memberIds} /></TabsContent>
        <TabsContent value="winners" className="mt-4"><WinnersTab cycleId={cycle.id} /></TabsContent>
        <TabsContent value="decisions" className="mt-4"><DecisionsTab cycleId={cycle.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

/** The next step this cycle allows, for a user with the permission for it. */
function CycleActions({ cycle }: { cycle: PilgrimageCycle }) {
  const t = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const lock = useLockCycle();
  const draw = useRunDraw();
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canDraw = has(EKUB_PERMS.PILGRIMAGE_DRAW);
  // Read once per mount; the backend enforces the date in any case.
  const [now] = useState(() => Date.now());
  const drawDue = new Date(cycle.draw_at).setHours(0, 0, 0, 0) <= now;

  return (
    <>
      {cycle.status === "open" && canDraw && (
        <Button variant="outline" disabled={lock.isPending} onClick={() => lock.mutate(cycle.id, { onSuccess: () => toast({ title: t("locked") }), onError })}>
          <Lock size={15} className="mr-1" /> {t("lock")}
        </Button>
      )}
      {cycle.status === "locked" && canDraw && (
        <Button disabled={draw.isPending || !drawDue} title={drawDue ? undefined : t("drawNotDue", { date: formatDate(cycle.draw_at) })}
          onClick={() => draw.mutate(cycle.id, { onSuccess: () => toast({ title: t("drawn"), description: t("awaitingApproval") }), onError })}>
          <Dices size={15} className="mr-1" /> {t("runDraw")}
        </Button>
      )}
      {cycle.status === "drawn" && has(EKUB_PERMS.PILGRIMAGE_APPROVE) && (
        <Button onClick={() => setApproving(true)}><ShieldCheck size={15} className="mr-1" /> {t("approve")}</Button>
      )}
      {(cycle.status === "open" || cycle.status === "locked") && has(EKUB_PERMS.PILGRIMAGE_MANAGE) && (
        <Button variant="outline" onClick={() => setCancelling(true)}><Ban size={15} className="mr-1" /> {tc("cancel")}</Button>
      )}
      <ApproveModal cycle={approving ? cycle : null} onClose={() => setApproving(false)} />
      <CancelModal cycle={cancelling ? cycle : null} onClose={() => setCancelling(false)} />
    </>
  );
}

function ApproveModal({ cycle, onClose }: { cycle: PilgrimageCycle | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const approve = useApproveDraw();
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState("");
  const needsAck = !!cycle && cycle.overflow > 0;
  return (
    <Modal open={!!cycle} onOpenChange={(o) => !o && onClose()} title={t("approveTitle")} className="max-w-lg">
      {cycle && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("approveHint", { winners: cycle.winner_count })}</p>
          {needsAck && (
            <label className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>{t("overflowAck", { count: cycle.overflow, slots: cycle.winners_per_cycle })}</span>
            </label>
          )}
          <Field label={`${t("note")} (${tc("optional")})`}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button disabled={approve.isPending || (needsAck && !ack)}
              onClick={() => approve.mutate({ id: cycle.id, acknowledge_overflow: ack, note: note.trim() || undefined }, {
                onSuccess: () => { toast({ title: t("approved") }); onClose(); }, onError,
              })}>
              {t("approve")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CancelModal({ cycle, onClose }: { cycle: PilgrimageCycle | null; onClose: () => void }) {
  const t = useTranslations("pilgrimage.cycle");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const cancel = useCancelCycle();
  const [reason, setReason] = useState("");
  return (
    <Modal open={!!cycle} onOpenChange={(o) => !o && onClose()} title={t("cancelTitle")} className="max-w-md">
      {cycle && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("cancelHint")}</p>
          <Field label={tc("reason")}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{tc("back")}</Button>
            <Button variant="destructive" disabled={cancel.isPending || reason.trim().length < 5}
              onClick={() => cancel.mutate({ id: cycle.id, reason: reason.trim() }, { onSuccess: () => { toast({ title: t("cancelled") }); onClose(); }, onError })}>
              {t("cancelCycle")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** The commit-reveal record: commitment from opening, seed after approval. */
function FairnessCard({ cycle }: { cycle: PilgrimageCycle }) {
  const t = useTranslations("pilgrimage.cycle");
  return (
    <Card className="space-y-2 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("fairness")}</h3>
        {cycle.verified !== undefined && (
          <Badge className={cycle.verified ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
            {cycle.verified ? t("verifiedYes") : t("verifiedNo")}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("fairnessHint")}</p>
      <Detail label={t("commitment")}><span className="break-all font-mono text-xs">{cycle.draw_seed_commitment}</span></Detail>
      <Detail label={t("seed")}><span className="break-all font-mono text-xs">{cycle.revealed_seed || t("seedHidden")}</span></Detail>
      {cycle.drawn_at && <Detail label={t("drawnAt")}>{formatDateTime(cycle.drawn_at)}</Detail>}
      {cycle.approved_at && <Detail label={t("approvedAt")}>{formatDateTime(cycle.approved_at)}</Detail>}
      {cycle.algorithm && <Detail label={t("algorithm")}><span className="font-mono text-xs">{cycle.algorithm}</span></Detail>}
      {cycle.selection_input && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">{t("selectionInput")}</summary>
          <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-muted p-3 font-mono">{cycle.selection_input}</pre>
        </details>
      )}
      {cycle.note && <Detail label={t("note")}>{cycle.note}</Detail>}
    </Card>
  );
}

function EntriesTable({ entries }: { entries: DrawEntry[] }) {
  const t = useTranslations("pilgrimage.cycle");
  const ts = useTranslations("pilgrimage.status");
  const tc = useTranslations("common");
  // Short group labels (G1, G2…) in order of first appearance keep the table readable.
  const groupLabel = new Map<string, string>();
  entries.forEach((e) => e.group_id && !groupLabel.has(e.group_id) && groupLabel.set(e.group_id, `G${groupLabel.size + 1}`));

  const columns: DataTableColumn<DrawEntry>[] = [
    { id: "member", header: tc("member"), mobile: "title", sortValue: (e) => e.member_name ?? "", cell: (e) => (
      <Link href={`/dashboard/pilgrimage/participations/${e.participation_id}`} className="hover:underline" onClick={(ev) => ev.stopPropagation()}>
        <p className="font-medium text-foreground">{e.member_name || tc("unknownMember")}</p>
        <p className="font-mono text-xs text-muted-foreground">{e.participation_number}</p>
      </Link>
    ) },
    { id: "group", header: t("group"), mobile: "detail", sortValue: (e) => (e.group_id ? groupLabel.get(e.group_id) : ""), cell: (e) => (e.group_id ? <span className="font-mono text-xs">{groupLabel.get(e.group_id)}</span> : "—") },
    { id: "balance", header: t("balance"), align: "right", mobile: "detail", sortValue: (e) => e.balance, cell: (e) => <span className="tabular-nums">{formatCurrency(e.balance)}</span> },
    { id: "eligible", header: t("eligible"), mobile: "detail", sortValue: (e) => (e.eligible ? 1 : 0), cell: (e) => (
      <div>
        <span className={e.eligible ? "text-success" : "text-muted-foreground"}>{e.eligible ? tc("yes") : tc("no")}</span>
        {e.reason && <p className="text-xs text-muted-foreground">{e.reason}</p>}
      </div>
    ) },
    { id: "pick", header: t("pick"), align: "right", mobile: "detail", sortValue: (e) => e.pick ?? 9999, cell: (e) => (e.pick ? `#${e.pick}` : "—") },
    { id: "outcome", header: t("outcome"), mobile: "badge", sortValue: (e) => e.outcome, cell: (e) => <PStatus status={e.outcome} outcome /> },
  ];
  return (
    <DataTable
      columns={columns}
      data={entries}
      rowKey={(e) => e.participation_id}
      emptyTitle={tc("noData")}
      emptyMessage={t("noEntries")}
      defaultSort={{ id: "pick", dir: "asc" }}
      pagination={{ pageSize: 50 }}
      filters={{
        search: { placeholder: tc("search"), keys: (e) => [e.member_name, e.participation_number] },
        facets: [{ id: "outcome", label: t("outcome"), get: (e) => e.outcome, labelOf: (v) => ts((v === "drawn" ? "drawn_outcome" : v) as never) }],
      }}
    />
  );
}

export default function PilgrimageCyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PILGRIMAGE_READ]}>
      <Suspense fallback={<div className="p-6"><Skeleton className="h-72 rounded-xl" /></div>}>
        <CycleInner id={id} />
      </Suspense>
    </RequirePermission>
  );
}
