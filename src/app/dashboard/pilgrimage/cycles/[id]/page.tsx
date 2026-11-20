"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Ban, CalendarClock, CheckCircle2, Dices, Lock, ShieldCheck, Target, Trophy, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { Detail, Field, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { WinnersTab } from "@/components/pilgrimage/winners-tab";
import { CycleCalendar, editableDates, EditCycleDatesModal } from "@/components/pilgrimage/cycle-dates";
import { DecisionsTab } from "@/components/pilgrimage/decisions-tab";
import { useApproveDraw, useCancelCycle, useDrawResult, useLockCycle, useRunDraw } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { DrawEntry, PilgrimageCycle } from "@/types/pilgrimage";

/**
 * One cycle's draw: lock → draw → approve (by a second person), and the draw
 * record — every entry with its balance, eligibility, group and outcome, plus
 * the seed commitment anyone can verify once the seed is revealed.
 */
function CycleInner({ id }: { id: string }) {
  const t = useTranslations("pilgrimage.cycle");
  const { data, isLoading } = useDrawResult(id);

  if (isLoading || !data) {
    return <div className="space-y-4 p-4 lg:p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }
  const { cycle, entries } = data;
  const settled = cycle.status === "approved" || cycle.status === "closed";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href="/dashboard/pilgrimage?tab=cycles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> {t("back")}
      </Link>
      <PageHeader
        title={cycle.name}
        subtitle={`${cycle.product?.name ?? ""} · #${cycle.number} · ${t("drawAt")} ${formatDate(cycle.draw_at)}`}
        actions={<><PStatus status={cycle.status} /><CycleActions cycle={cycle} /></>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("required")} value={formatCurrency(cycle.required_contribution)} hint={t("ofPackage", { percent: cycle.eligibility_percent, amount: formatCurrency(cycle.package_cost) })} icon={Target} tone="info" />
        <StatCard label={t("entries")} value={cycle.status === "open" ? "—" : entries.length} hint={cycle.status === "open" ? t("notLocked") : t("eligibleCount", { count: cycle.eligible_count })} icon={UsersRound} tone="primary" />
        <StatCard label={t("winners")} value={cycle.drawn_at ? `${cycle.winner_count} / ${cycle.winners_per_cycle}` : `— / ${cycle.winners_per_cycle}`} hint={cycle.overflow > 0 ? t("overflowHint", { count: cycle.overflow }) : undefined} icon={Trophy} tone={cycle.overflow > 0 ? "warning" : "success"} />
        <StatCard label={t("decisionDeadline")} value={formatDate(cycle.decision_deadline || cycle.closes_at)} hint={cycle.decision_deadline ? undefined : t("planned")} icon={CheckCircle2} tone="secondary" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CalendarCard cycle={cycle} />
        <FairnessCard cycle={cycle} />
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">{t("tabEntries")}</TabsTrigger>
          {settled && <TabsTrigger value="winners">{t("tabWinners")}</TabsTrigger>}
          {settled && <TabsTrigger value="decisions">{t("tabDecisions")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="entries"><EntriesTable entries={entries} /></TabsContent>
        {settled && <TabsContent value="winners"><WinnersTab cycleId={cycle.id} /></TabsContent>}
        {settled && <TabsContent value="decisions"><DecisionsTab cycleId={cycle.id} /></TabsContent>}
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

/** The cycle's dates, with an edit button while they may still change. */
function CalendarCard({ cycle }: { cycle: PilgrimageCycle }) {
  const t = useTranslations("pilgrimage.cycleDates");
  const { has } = useEkubAccess();
  const [editing, setEditing] = useState(false);
  const canEdit = has(EKUB_PERMS.PILGRIMAGE_MANAGE) && editableDates(cycle.status).length > 0;
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><CalendarClock size={14} className="mr-1" /> {t("edit")}</Button>
        )}
      </div>
      <CycleCalendar cycle={cycle} />
      <EditCycleDatesModal cycle={editing ? cycle : null} onClose={() => setEditing(false)} />
    </Card>
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
      <CycleInner id={id} />
    </RequirePermission>
  );
}
