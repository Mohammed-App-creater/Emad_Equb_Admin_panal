"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, UserMinus, Ban, RotateCcw, ArrowLeftRight, Info } from "lucide-react";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  useMembers,
  useAddMember,
  useRemoveMember,
  useSetSuspended,
  useSwapPositions,
} from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import type { GroupMember } from "@/types/ekub";

const statusBadge: Record<string, string> = {
  active: "bg-success/15 text-success",
  suspended: "bg-destructive/15 text-destructive",
  at_risk: "bg-warning/15 text-warning",
};

function MembersInner() {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const { activeGroupName } = useEqubStore();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.PENALTY_MANAGE) || has(EKUB_PERMS.TIER_MANAGE);

  const { data, isLoading } = useMembers();
  const add = useAddMember();
  const remove = useRemoveMember();
  const setSuspended = useSetSuspended();
  const swap = useSwapPositions();

  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");

  const err = (e: unknown) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" });

  const columns: DataTableColumn<GroupMember>[] = [
    { id: "pos", header: "#", mobile: "detail", cell: (r) => <span className="text-sm text-muted-foreground">{r.position}</span> },
    { id: "handle", header: t("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.handle}</p>
        <p className="text-xs text-muted-foreground">{r.ekubNumber}</p>
      </div>
    ) },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (
      <Badge className={`capitalize ${statusBadge[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status.replace("_", " ")}</Badge>
    ) },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={activeGroupName ? `${t("subtitle")} · ${activeGroupName}` : t("subtitle")}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setSwapA(""); setSwapB(""); setSwapping(true); }}>
                <ArrowLeftRight size={15} className="mr-1" /> {t("swap")}
              </Button>
              <Button onClick={() => { setNewId(""); setAdding(true); }}>
                <UserPlus size={16} className="mr-1" /> {t("add")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>{t("scopeNote")}</span>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        avatar={(r) => ({ initials: getInitials(r.handle), colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        actions={
          canManage
            ? [
                { label: t("suspend"), icon: Ban, show: (r) => r.status !== "suspended", destructive: true, onClick: (r) => setSuspended.mutate({ memberId: r.memberId, suspend: true, reason: "admin" }, { onSuccess: () => toast({ title: t("suspend") }), onError: err }) },
                { label: t("unsuspend"), icon: RotateCcw, show: (r) => r.status === "suspended", onClick: (r) => setSuspended.mutate({ memberId: r.memberId, suspend: false }, { onSuccess: () => toast({ title: t("unsuspend") }), onError: err }) },
                { label: t("remove"), icon: UserMinus, destructive: true, onClick: (r) => remove.mutate(r.id, { onSuccess: () => toast({ title: t("remove") }), onError: err }) },
              ]
            : undefined
        }
      />

      {/* Add member */}
      <Modal open={adding} onOpenChange={setAdding} title={t("add")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("memberId")}</Label><Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="m-xxx" /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdding(false)}>{tc("cancel")}</Button>
            <Button disabled={!newId || add.isPending} onClick={() => add.mutate(newId, { onSuccess: () => { toast({ title: t("add") }); setAdding(false); }, onError: err })}>{tc("create")}</Button>
          </div>
        </div>
      </Modal>

      {/* Swap positions */}
      <Modal open={swapping} onOpenChange={setSwapping} title={t("swap")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("member")} 1</Label><Input value={swapA} onChange={(e) => setSwapA(e.target.value)} placeholder="member id" /></div>
          <div className="space-y-1.5"><Label>{t("member")} 2</Label><Input value={swapB} onChange={(e) => setSwapB(e.target.value)} placeholder="member id" /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSwapping(false)}>{tc("cancel")}</Button>
            <Button disabled={!swapA || !swapB || swap.isPending} onClick={() => swap.mutate({ a: swapA, b: swapB }, { onSuccess: () => { toast({ title: t("swap") }); setSwapping(false); }, onError: err })}>{tc("confirm")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function MembersPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.APPLICATION_READ, EKUB_PERMS.PENALTY_READ]}>
      <MembersInner />
    </RequirePermission>
  );
}
