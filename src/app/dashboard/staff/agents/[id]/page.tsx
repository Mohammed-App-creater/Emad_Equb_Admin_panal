"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CircleDot, Users, Wallet, Clock, Mail, Phone } from "lucide-react";
import { DataTable, getInitials, roundFacet, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { useAgent, useEqubs, useEqubMembersMany, useFeeLedgersMany, useAllCollections } from "@/hooks/ekub";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge as PaymentStatusBadge } from "@/components/equb/status-badge";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import { formatCurrency, formatDate, formatDateForInput, formatDateTime } from "@/lib/utils";
import type { CollectionItem, Equb, EqubMember } from "@/types/ekub";

type MemberRow = EqubMember & { equb: Equb };
/** One Equb round's collections: recorded vs confirmed. */
interface CollectionRow { key: string; equb: Equb; roundNumber: number; scheduledAt: string; members: number; collected: number; confirmed: number; pending: number }

/**
 * An agent's page. Agents run Equbs (the Equb's manager), so their members are
 * the members of those Equbs and their collections are the contributions
 * recorded there, taken from the SACCO fee ledger. (GET /equb/manager/my-collections
 * only ever reports the signed-in user, so it cannot show another agent's day.)
 */
function AgentInner({ id }: { id: string }) {
  const ta = useTranslations("agents");
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const router = useRouter();
  const [tab, setTab] = useState("equbs");
  // Collections this agent recorded (GET /equb/admin/collections?collected_by=), last 30 days by default.
  const [from, setFrom] = useState(() => formatDateForInput(new Date(Date.now() - 30 * 86400000).toISOString()));
  const [to, setTo] = useState(() => formatDateForInput(new Date().toISOString()));
  const { data: agentCollections, isLoading: agentCollectionsLoading } = useAllCollections({ from, to, collectedBy: id }, 1, 200);

  const { data: agent, isLoading } = useAgent(id);
  const { data: allEqubs, isLoading: equbsLoading } = useEqubs();
  const equbs = (allEqubs ?? []).filter((e) => e.manager?.userId === id);
  const equbIds = equbs.map((e) => e.id);

  const rostersQ = useEqubMembersMany(equbIds);
  const members: MemberRow[] = rostersQ.flatMap((q, i) => (q.data ?? []).map((m) => ({ ...m, equb: equbs[i] })));
  const membersLoading = rostersQ.some((q) => q.isLoading);

  const ledgersQ = useFeeLedgersMany(equbIds);
  const collectionsLoading = ledgersQ.some((q) => q.isLoading);
  const byRound = new Map<string, CollectionRow>();
  ledgersQ.forEach((q, i) => {
    for (const l of q.data?.items ?? []) {
      const recorded = l.collected || !!l.paymentId;
      if (!recorded) continue;
      const key = `${l.equbId}:${l.roundId}`;
      const row = byRound.get(key) ?? { key, equb: equbs[i], roundNumber: l.roundNumber, scheduledAt: l.scheduledAt, members: 0, collected: 0, confirmed: 0, pending: 0 };
      row.members += 1;
      row.collected += l.total;
      if (l.collected) row.confirmed += l.total;
      else row.pending += l.total;
      byRound.set(key, row);
    }
  });
  const roundsOfPayment = new Map<string, number[]>();
  for (const q of ledgersQ) for (const l of q.data?.items ?? []) if (l.paymentId) roundsOfPayment.set(l.paymentId, [...(roundsOfPayment.get(l.paymentId) ?? []), l.roundNumber]);
  const collections = [...byRound.values()].sort((a, b) => a.equb.name.localeCompare(b.equb.name) || b.roundNumber - a.roundNumber);

  const equbCols: DataTableColumn<Equb>[] = [
    { id: "name", sortValue: (r) => r.name, header: ta("equb"), mobile: "title", cell: (r) => (
      <div><p className="font-medium text-foreground">{r.name}</p><p className="font-mono text-xs text-muted-foreground">{r.code}</p></div>
    ) },
    { id: "category", sortValue: (r) => r.category?.name ?? null, header: ta("category"), mobile: "detail", cell: (r) => <span className="text-sm">{r.category?.name ?? "—"}</span> },
    { id: "members", sortValue: (r) => r.currentMembers, header: ta("members"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm tabular-nums">{r.currentMembers}/{r.maxMembers}</span> },
    { id: "start", sortValue: (r) => r.startDate, header: ta("start"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.startDate)}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="lifecycle" /> },
  ];

  const memberCols: DataTableColumn<MemberRow>[] = [
    { id: "name", sortValue: (r) => r.name, header: tc("member"), mobile: "title", cell: (r) => (
      <div><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.membershipNumber}</p></div>
    ) },
    { id: "equb", sortValue: (r) => r.equb.name, header: ta("equb"), mobile: "detail", cell: (r) => <span className="text-sm">{r.equb.name}</span> },
    { id: "position", sortValue: (r) => r.position, header: ta("position"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm tabular-nums">#{r.position}</span> },
    { id: "phone", sortValue: (r) => r.phone, header: t("phone"), mobile: "detail", cell: (r) => <span className="text-sm">{r.phone || "—"}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <Badge className={r.status === "active" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}>{r.status}</Badge> },
  ];

  const collectionCols: DataTableColumn<CollectionRow>[] = [
    { id: "equb", sortValue: (r) => r.equb.name, header: ta("equb"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.equb.name}</span> },
    { id: "round", sortValue: (r) => r.roundNumber, header: ta("round"), mobile: "detail", cell: (r) => <span className="text-sm">#{r.roundNumber} <span className="text-xs text-muted-foreground">· {formatDate(r.scheduledAt)}</span></span> },
    { id: "members", sortValue: (r) => r.members, header: ta("members"), mobile: "detail", align: "right", cell: (r) => <span className="text-sm tabular-nums">{r.members}</span> },
    { id: "collected", sortValue: (r) => r.collected, header: ta("collected"), mobile: "detail", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r.collected)}</span> },
    { id: "confirmed", sortValue: (r) => r.confirmed, header: ta("confirmed"), mobile: "detail", align: "right", cell: (r) => <span className="tabular-nums text-success">{formatCurrency(r.confirmed)}</span> },
    { id: "pending", sortValue: (r) => r.pending, header: ta("pendingConfirm"), mobile: "detail", align: "right", cell: (r) => <span className={r.pending > 0 ? "font-medium tabular-nums text-warning" : "tabular-nums text-muted-foreground"}>{formatCurrency(r.pending)}</span> },
  ];

  const agentCollectionCols: DataTableColumn<CollectionItem>[] = [
    { id: "member", sortValue: (r) => r.memberName, header: tc("member"), mobile: "title", cell: (r) => <span className="font-medium text-foreground">{r.memberName}</span> },
    { id: "equb", sortValue: (r) => r.equbName, header: ta("equb"), mobile: "detail", cell: (r) => <div><p className="text-sm text-foreground">{r.equbName}</p><p className="text-xs text-muted-foreground">{r.categoryName}</p></div> },
    { id: "amount", sortValue: (r) => r.amount, header: ta("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.amount)}</span> },
    { id: "ref", sortValue: (r) => r.reference, header: ta("reference"), mobile: "detail", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
    { id: "at", sortValue: (r) => r.collectedAt, header: ta("collectedAt"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDateTime(r.collectedAt)}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <PaymentStatusBadge status={r.status} kind="payment" /> },
  ];

  if (isLoading) return <div className="space-y-4 p-4 lg:p-6"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!agent) return <p className="p-6 text-sm text-muted-foreground">{tc("noData")}</p>;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href="/dashboard/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> {ta("back")}
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">{getInitials(agent.name)}</div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{agent.name}</h1>
              <Badge className={agent.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>{agent.active ? ta("active") : ta("inactive")}</Badge>
              {agent.roles.map((r) => <Badge key={r} className="bg-info/15 text-info">{r}</Badge>)}
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {agent.email && <span className="inline-flex items-center gap-1"><Mail size={13} /> {agent.email}</span>}
              {agent.phone && <span className="inline-flex items-center gap-1"><Phone size={13} /> {agent.phone}</span>}
              {agent.createdAt && <span>{ta("joined")}: {formatDate(agent.createdAt)}</span>}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={ta("equbsManaged")} value={equbsLoading ? "…" : equbs.length} icon={CircleDot} tone="primary" />
        <StatCard label={ta("members")} value={membersLoading ? "…" : members.length} icon={Users} tone="info" />
        <StatCard label={ta("collected")} value={agentCollectionsLoading ? "…" : formatCurrency(agentCollections?.totalCollected ?? 0)} hint={`${ta("confirmed")}: ${formatCurrency(agentCollections?.totalConfirmed ?? 0)} · ${formatDate(from)} – ${formatDate(to)}`} icon={Wallet} tone="success" />
        <StatCard label={ta("pendingConfirm")} value={agentCollectionsLoading ? "…" : formatCurrency(agentCollections?.totalPending ?? 0)} icon={Clock} tone={(agentCollections?.totalPending ?? 0) > 0 ? "warning" : "primary"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="equbs">{ta("tabEqubs")} · {equbs.length}</TabsTrigger>
          <TabsTrigger value="members">{ta("tabMembers")} · {members.length}</TabsTrigger>
          <TabsTrigger value="collections">{ta("tabCollections")}</TabsTrigger>
        </TabsList>

        <TabsContent value="equbs">
          <DataTable
            filters={{ search: { keys: (r) => [r.name, r.code, r.category?.name] }, facets: [{ id: "status", label: tc("status"), get: (r) => r.status }, { id: "category", label: ta("category"), get: (r) => r.category?.name }] }}
            columns={equbCols}
            data={equbs}
            rowKey={(r) => r.id}
            isLoading={equbsLoading}
            onRowClick={(r) => router.push(`/dashboard/equbs/${r.id}`)}
            emptyTitle={ta("noEqubs")}
            emptyMessage=""
          />
        </TabsContent>

        <TabsContent value="members" className="space-y-2">
          <p className="text-xs text-muted-foreground">{ta("membersHint")}</p>
          <DataTable
            filters={{ search: { keys: (r) => [r.name, r.membershipNumber, r.phone, r.equb.name] }, facets: [{ id: "equb", label: ta("equb"), get: (r) => r.equb.name }, { id: "status", label: tc("status"), get: (r) => r.status }] }}
            columns={memberCols}
            data={members}
            rowKey={(r) => `${r.equb.id}:${r.memberId}`}
            isLoading={equbsLoading || membersLoading}
            onRowClick={(r) => router.push(`/dashboard/equbs/${r.equb.id}/members/${r.memberId}`)}
            emptyTitle={equbs.length ? tc("noData") : ta("noEqubs")}
          />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">{ta("from")}</Label>
              <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{ta("to")}</Label>
              <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground sm:pb-2.5">{ta("collectionsByAgentHint")}</p>
          </div>
          <DataTable
            defaultSort={{ id: "at", dir: "desc" }}
            filters={{
              search: { keys: (r) => [r.memberName, r.reference, r.equbName, r.categoryName] },
              facets: [
                { id: "equb", label: ta("equb"), get: (r) => r.equbName },
                { id: "round", label: ta("round"), get: (r) => (roundsOfPayment.get(r.paymentId) ?? []).map((n) => `#${n}`) },
                { id: "status", label: tc("status"), get: (r) => r.status },
              ],
            }}
            columns={agentCollectionCols}
            data={agentCollections?.items ?? []}
            rowKey={(r) => r.paymentId || `${r.memberId}-${r.collectedAt}`}
            isLoading={agentCollectionsLoading}
            avatar={(r) => ({ initials: getInitials(r.memberName), colorClass: r.status === "confirmed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning" })}
            onRowClick={(r) => router.push(`/dashboard/equbs/${r.equbId}?tab=contributions`)}
            emptyTitle={tc("noData")}
          />

          <p className="text-xs text-muted-foreground">{ta("collectionsHint")}</p>
          <DataTable
            filters={{ facets: [{ id: "equb", label: ta("equb"), get: (r) => r.equb.name }, roundFacet(ta("round"), (r: CollectionRow) => r.roundNumber)] }}
            columns={collectionCols}
            data={collections}
            rowKey={(r) => r.key}
            isLoading={equbsLoading || collectionsLoading}
            onRowClick={(r) => router.push(`/dashboard/equbs/${r.equb.id}?tab=contributions`)}
            emptyTitle={equbs.length ? tc("noData") : ta("noEqubs")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.STAFF_READ]}>
      <AgentInner id={id} />
    </RequirePermission>
  );
}
