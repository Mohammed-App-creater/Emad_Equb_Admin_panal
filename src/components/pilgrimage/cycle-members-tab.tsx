"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableAction, type DataTableColumn } from "@/components/ui/data-table";
import { PStatus } from "@/components/pilgrimage/shared";
import { RegisterModal } from "@/components/pilgrimage/participations-tab";
import { ContributeModal, type ContributeTarget } from "@/components/pilgrimage/contributions";
import type { CycleMember } from "@/components/pilgrimage/cycle-members";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { PilgrimageCycle } from "@/types/pilgrimage";

/** Short group labels (G1, G2…) in order of first appearance, for rows that only know a group id. */
export function groupLabels(members: CycleMember[]) {
  const labels = new Map<string, string>();
  members.forEach((m) => m.groupId && !labels.has(m.groupId) && labels.set(m.groupId, m.groupName ?? `G${labels.size + 1}`));
  return labels;
}

export const contributeTarget = (m: CycleMember): ContributeTarget => ({
  id: m.participationId,
  memberName: m.memberName,
  remainingToEligibility: m.participation?.standing.remaining_to_eligibility ?? Math.max(0, m.required - m.balance),
});

/** Everyone in this cycle, with their savings against the threshold, group and outcome. */
export function CycleMembersTab({ cycle, members, isLoading, live }: { cycle: PilgrimageCycle; members: CycleMember[]; isLoading: boolean; live: boolean }) {
  const t = useTranslations("pilgrimage.members");
  const tp = useTranslations("pilgrimage.participation");
  const tcy = useTranslations("pilgrimage.cycle");
  const ts = useTranslations("pilgrimage.status");
  const tc = useTranslations("common");
  const router = useRouter();
  const { has } = useEkubAccess();
  const canRegister = has(EKUB_PERMS.PILGRIMAGE_REGISTER);
  const [registering, setRegistering] = useState(false);
  const [paying, setPaying] = useState<ContributeTarget | null>(null);
  const groups = groupLabels(members);
  const open = (m: CycleMember) => router.push(`/dashboard/pilgrimage/participations/${m.participationId}`);

  const columns: DataTableColumn<CycleMember>[] = [
    { id: "member", header: tc("member"), mobile: "title", sortValue: (m) => m.memberName ?? "", cell: (m) => (
      <div>
        <p className="font-medium text-foreground">{m.memberName || tc("unknownMember")}</p>
        <p className="font-mono text-xs text-muted-foreground">{m.number}{m.membershipNumber ? ` · ${m.membershipNumber}` : ""}</p>
      </div>
    ) },
    { id: "savings", header: live ? tp("progress") : tcy("balance"), mobile: "detail", sortValue: (m) => m.balance, cell: (m) => <SavingsBar member={m} /> },
    { id: "remaining", header: t("remaining"), align: "right", mobile: "detail", sortValue: (m) => Math.max(0, m.required - m.balance), cell: (m) => (
      <span className={cn("tabular-nums", m.balance >= m.required ? "text-muted-foreground" : "text-warning")}>{m.balance >= m.required ? "—" : formatCurrency(m.required - m.balance)}</span>
    ) },
    { id: "group", header: tcy("group"), mobile: "detail", sortValue: (m) => (m.groupId ? groups.get(m.groupId) : ""), cell: (m) => <span className="text-sm">{m.groupId ? groups.get(m.groupId) : "—"}</span> },
    ...(!live ? [
      { id: "pick", header: tcy("pick"), align: "right", mobile: "detail", sortValue: (m: CycleMember) => m.pick ?? 9999, cell: (m: CycleMember) => (m.pick ? `#${m.pick}` : "—") },
      { id: "outcome", header: tcy("outcome"), mobile: "detail", sortValue: (m: CycleMember) => m.outcome ?? "", cell: (m: CycleMember) => (
        <div>
          {m.outcome ? <PStatus status={m.outcome} outcome /> : "—"}
          {m.reason && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{m.reason}</p>}
        </div>
      ) },
    ] satisfies DataTableColumn<CycleMember>[] : []),
    { id: "registered", header: tp("registeredAt"), mobile: "detail", sortValue: (m) => m.participation?.created_at ?? "", cell: (m) => (
      <div className="text-sm">
        <p>{m.participation ? formatDate(m.participation.created_at) : "—"}</p>
        {m.participation && <p className="text-xs text-muted-foreground">{tp(`channel_${m.participation.channel}` as never)}</p>}
      </div>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", sortValue: (m) => m.status ?? "", cell: (m) => (m.status ? <PStatus status={m.status} /> : "—") },
  ];

  const actions: DataTableAction<CycleMember>[] = [
    { label: t("openRegistration"), icon: Eye, onClick: open },
    ...(live && canRegister
      ? [{ label: tp("contribute"), icon: Wallet, show: (m: CycleMember) => !!m.participation?.accepts_contributions, onClick: (m: CycleMember) => setPaying(contributeTarget(m)) }]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{live ? t("liveHint") : t("frozenHint")}</p>
        {live && canRegister && (
          <Button onClick={() => setRegistering(true)}><UserPlus size={16} className="mr-1" /> {tp("register")}</Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={members}
        rowKey={(m) => m.participationId}
        isLoading={isLoading}
        onRowClick={open}
        actions={actions}
        defaultSort={live ? { id: "savings", dir: "desc" } : { id: "pick", dir: "asc" }}
        pagination={{ pageSize: 25 }}
        emptyTitle={tc("noData")}
        emptyMessage={live ? tp("empty") : tcy("noEntries")}
        filters={{
          search: { placeholder: tp("searchMember"), keys: (m) => [m.memberName, m.number, m.membershipNumber] },
          facets: [
            { id: "eligible", label: tcy("eligible"), get: (m) => (m.eligible ? "yes" : "no"), options: [{ value: "yes", label: tp("eligible") }, { value: "no", label: t("belowThreshold") }] },
            { id: "group", label: tcy("group"), get: (m) => (m.groupId ? "group" : "solo"), options: [{ value: "group", label: t("inGroup") }, { value: "solo", label: t("solo") }] },
            ...(!live ? [{ id: "outcome", label: tcy("outcome"), get: (m: CycleMember) => m.outcome, labelOf: (v: string) => ts((v === "drawn" ? "drawn_outcome" : v) as never) }] : []),
            { id: "status", label: tc("status"), get: (m) => m.status, labelOf: (v) => ts(v as never) },
          ],
        }}
      />
      <RegisterModal open={registering} defaultProductId={cycle.product_id} onClose={() => setRegistering(false)} onRegistered={(p) => router.push(`/dashboard/pilgrimage/participations/${p.id}`)} />
      <ContributeModal target={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

/** Balance against the member's own threshold. */
export function SavingsBar({ member: m }: { member: CycleMember }) {
  const tp = useTranslations("pilgrimage.participation");
  const pct = m.required > 0 ? Math.min(100, (m.balance / m.required) * 100) : 0;
  return (
    <div className="min-w-40 space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="tabular-nums">{formatCurrency(m.balance)}</span>
        <span className={m.eligible ? "font-medium text-success" : "text-muted-foreground"}>{m.eligible ? tp("eligible") : `${Math.floor(pct)}%`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", m.eligible ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
