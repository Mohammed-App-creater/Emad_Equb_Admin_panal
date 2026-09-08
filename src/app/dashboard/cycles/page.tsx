"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Layers, Plus, Play, Ban, Trash2, CalendarPlus, Zap } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  useGroups,
  useTiers,
  useCreateGroup,
  useActivateGroup,
  useCancelGroup,
  useExtendGroup,
  useDeleteGroup,
  useAutoCancel,
} from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { Group } from "@/types/ekub";

const statusBadge: Record<string, string> = {
  active: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
  completed: "bg-info/15 text-info",
  cancelled: "bg-destructive/15 text-destructive",
};

function CyclesInner() {
  const t = useTranslations("cycles");
  const tc = useTranslations("common");
  const { data, isLoading } = useGroups();
  const { data: tiers } = useTiers();
  const { activeGroupId, setActiveGroup } = useEqubStore();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.TIER_MANAGE);

  const create = useCreateGroup();
  const activate = useActivateGroup();
  const cancel = useCancelGroup();
  const extend = useExtendGroup();
  const del = useDeleteGroup();
  const autoCancel = useAutoCancel();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", schemeId: "", maxMembers: 200 });
  const [reasonModal, setReasonModal] = useState<{ kind: "cancel" | "extend"; group: Group } | null>(null);
  const [reason, setReason] = useState("");
  const [rounds, setRounds] = useState(1);

  const err = (e: unknown) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" });

  const columns: DataTableColumn<Group>[] = [
    { id: "name", header: t("name"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.code}</p>
      </div>
    ) },
    { id: "members", header: t("members"), mobile: "detail", align: "right", cell: (r) => <span>{r.currentMembers}/{r.maxMembers}</span> },
    { id: "start", header: t("start"), mobile: "detail", cell: (r) => <span className="text-sm">{r.startDate ? formatDate(r.startDate) : "—"}</span> },
    { id: "end", header: t("end"), mobile: "detail", cell: (r) => <span className="text-sm">{r.expectedEndDate ? formatDate(r.expectedEndDate) : "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (
      <Badge className={`capitalize ${statusBadge[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status}</Badge>
    ) },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => autoCancel.mutate(undefined, { onSuccess: () => toast({ title: t("autoCancel") }), onError: err })}>
                <Zap size={15} className="mr-1" /> {t("autoCancel")}
              </Button>
              <Button onClick={() => { setForm({ name: "", code: "", schemeId: tiers?.[0]?.id ?? "", maxMembers: 200 }); setCreating(true); }}>
                <Plus size={16} className="mr-1" /> {t("newCycle")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        avatar={() => ({ initials: "", colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        renderLeadingActions={(r) =>
          activeGroupId === r.id ? (
            <Badge className="bg-primary/15 text-primary">
              <CheckCircle2 size={13} className="mr-1" /> {t("active")}
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setActiveGroup(r.id, r.name)}>
              <Layers size={13} className="mr-1" /> {t("setActive")}
            </Button>
          )
        }
        actions={
          canManage
            ? [
                { label: t("activate"), icon: Play, show: (r) => r.status === "draft", onClick: (r) => activate.mutate({ id: r.id, startDate: new Date().toISOString() }, { onSuccess: () => toast({ title: t("activate") }), onError: err }) },
                { label: t("extend"), icon: CalendarPlus, show: (r) => r.status === "active", onClick: (r) => { setReasonModal({ kind: "extend", group: r }); setReason(""); setRounds(1); } },
                { label: t("cancel"), icon: Ban, show: (r) => r.status !== "cancelled" && r.status !== "completed", onClick: (r) => { setReasonModal({ kind: "cancel", group: r }); setReason(""); }, destructive: true },
                { label: tc("delete"), icon: Trash2, onClick: (r) => del.mutate(r.id, { onSuccess: () => toast({ title: tc("delete") }), onError: err }), destructive: true },
              ]
            : undefined
        }
      />

      {/* Create cycle */}
      <Modal open={creating} onOpenChange={setCreating} title={t("newCycle")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("scheme")}</Label>
            <Select value={form.schemeId} onValueChange={(v) => setForm({ ...form, schemeId: v })}>
              <SelectTrigger><SelectValue placeholder={t("scheme")} /></SelectTrigger>
              <SelectContent>
                {(tiers ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t("name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("members")}</Label><Input type="number" value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: Number(e.target.value) || 0 })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreating(false)}>{tc("cancel")}</Button>
            <Button
              disabled={!form.name || !form.code || !form.schemeId || create.isPending}
              onClick={() => create.mutate(form, { onSuccess: () => { toast({ title: tc("create") }); setCreating(false); }, onError: err })}
            >
              {tc("create")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reason modal (cancel / extend) */}
      <Modal open={!!reasonModal} onOpenChange={(o) => !o && setReasonModal(null)} title={reasonModal?.kind === "extend" ? t("extend") : t("cancel")} className="max-w-md">
        {reasonModal && (
          <div className="space-y-4">
            {reasonModal.kind === "extend" && (
              <div className="space-y-1.5"><Label>{t("additionalRounds")}</Label><Input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value) || 1)} /></div>
            )}
            <div className="space-y-1.5"><Label>{tc("reason")}</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReasonModal(null)}>{tc("cancel")}</Button>
              <Button
                disabled={!reason}
                onClick={() => {
                  const g = reasonModal.group;
                  const done = { onSuccess: () => { toast({ title: reasonModal.kind === "extend" ? t("extend") : t("cancel") }); setReasonModal(null); }, onError: err };
                  if (reasonModal.kind === "extend") extend.mutate({ id: g.id, additionalRounds: rounds, reason }, done);
                  else cancel.mutate({ id: g.id, reason }, done);
                }}
              >
                {tc("confirm")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function CyclesPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.TIER_READ, EKUB_PERMS.APPLICATION_READ]}>
      <CyclesInner />
    </RequirePermission>
  );
}
