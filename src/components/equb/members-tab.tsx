"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserPlus, UserMinus, Ban, RotateCcw, ArrowLeftRight, Search, Wallet } from "lucide-react";
import { RecordPaymentModal, type RecordPaymentTarget } from "@/components/equb/record-payment-modal";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
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
import { StatusBadge } from "@/components/equb/status-badge";
import {
  useEqubMembers,
  useMemberSearch,
  useAddMember,
  useRemoveMember,
  useSetSuspended,
  useSwapPositions,
} from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getErrorMessage } from "@/lib/utils";
import type { Equb, EqubMember } from "@/types/ekub";

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Roster of one Equb: positions, status, add / remove / suspend / swap. */
export function MembersTab({ equb }: { equb: Equb }) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const router = useRouter();
  const canManage = has(EKUB_PERMS.EQUB_MANAGE) || has(EKUB_PERMS.PENALTY_MANAGE);

  const [status, setStatus] = useState("all");
  // A roster is at most a few hundred rows: load it whole, filter and page locally.
  const { data, isLoading } = useEqubMembers(equb.id, status);
  const { data: roster } = useEqubMembers(equb.id);
  const add = useAddMember();
  const remove = useRemoveMember();
  const setSuspended = useSetSuspended();
  const swap = useSwapPositions();

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const { data: results, isFetching: searching } = useMemberSearch(adding ? debounced : "");

  const [swapping, setSwapping] = useState(false);
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const [suspending, setSuspending] = useState<EqubMember | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [removing, setRemoving] = useState<EqubMember | null>(null);
  const [paying, setPaying] = useState<RecordPaymentTarget | null>(null);
  const tp = useTranslations("recordPayment");

  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });

  const columns: DataTableColumn<EqubMember>[] = [
    { id: "pos", sortValue: (r) => r.position, header: t("position"), mobile: "detail", align: "center", cell: (r) => <span className="font-mono text-sm text-muted-foreground">#{r.position}</span> },
    { id: "name", sortValue: (r) => r.name, header: t("member"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.membershipNumber}</p>
      </div>
    ) },
    { id: "phone", sortValue: (r) => r.phone, header: t("phone"), mobile: "detail", cell: (r) => <span className="text-sm">{r.phone || "—"}</span> },
    { id: "joined", sortValue: (r) => r.joinedAt, header: t("joined"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.joinedAt)}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <StatusBadge status={r.status} kind="member" /> },
  ];

  const alreadyIn = new Set((roster ?? []).map((m) => m.memberId));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="active">{t("filterActive")}</SelectItem>
            <SelectItem value="suspended">{t("filterSuspended")}</SelectItem>
          </SelectContent>
        </Select>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSwapA(""); setSwapB(""); setSwapping(true); }} disabled={(roster?.length ?? 0) < 2}>
              <ArrowLeftRight size={15} className="mr-1" /> {t("swap")}
            </Button>
            <Button onClick={() => { setQuery(""); setAdding(true); }} disabled={equb.currentMembers >= equb.maxMembers}>
              <UserPlus size={16} className="mr-1" /> {t("add")}
            </Button>
          </div>
        )}
      </div>

      <DataTable
        defaultSort={{ id: "joined", dir: "desc" }}
        filters={{ search: { placeholder: t("searchMember"), keys: (r) => [r.name, r.phone, r.membershipNumber] } }}
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        onRowClick={(r) => router.push(`/dashboard/equbs/${equb.id}/members/${r.memberId}`)}
        avatar={(r) => ({ initials: getInitials(r.name), colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        actions={
          canManage
            ? [
                { label: tp("title"), icon: Wallet, show: () => equb.status === "active", onClick: (r) => setPaying({ equbId: equb.id, memberId: r.memberId }) },
                { label: t("suspend"), icon: Ban, show: (r) => r.status !== "suspended", destructive: true, onClick: (r) => { setSuspendReason(""); setSuspending(r); } },
                { label: t("unsuspend"), icon: RotateCcw, show: (r) => r.status === "suspended", onClick: (r) => setSuspended.mutate({ equbId: equb.id, memberId: r.memberId, suspend: false }, { onSuccess: () => toast({ title: t("unsuspend"), description: r.name }), onError: err }) },
                { label: t("remove"), icon: UserMinus, destructive: true, onClick: (r) => setRemoving(r) },
              ]
            : undefined
        }
      />

      <RecordPaymentModal target={paying} onClose={() => setPaying(null)} />

      {/* Add member: search the Sacco member directory */}
      <Modal open={adding} onOpenChange={setAdding} title={t("add")} className="max-w-lg">
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchMember")} />
          </div>
          <p className="text-xs text-muted-foreground">{t("searchHint")}</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {searching && <p className="p-2 text-sm text-muted-foreground">{tc("loading")}</p>}
            {!searching && debounced.trim().length >= 2 && (results?.length ?? 0) === 0 && (
              <p className="p-2 text-sm text-muted-foreground">{t("noResults")}</p>
            )}
            {(results ?? []).map((m) => {
              const inEqub = alreadyIn.has(m.id);
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{m.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.membershipNumber} · {m.phone || "—"}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={inEqub || add.isPending}
                    onClick={() => add.mutate({ equbId: equb.id, memberId: m.id }, { onSuccess: () => toast({ title: t("add"), description: m.fullName }), onError: err })}
                  >
                    <UserPlus size={14} className="mr-1" /> {inEqub ? "✓" : t("add")}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Swap positions */}
      <Modal open={swapping} onOpenChange={setSwapping} title={t("swap")} className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("swapHint")}</p>
          <MemberPick label={t("first")} value={swapA} onChange={setSwapA} members={roster ?? []} exclude={swapB} />
          <MemberPick label={t("second")} value={swapB} onChange={setSwapB} members={roster ?? []} exclude={swapA} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSwapping(false)}>{tc("cancel")}</Button>
            <Button
              disabled={!swapA || !swapB || swapA === swapB || swap.isPending}
              onClick={() => swap.mutate({ equbId: equb.id, a: swapA, b: swapB }, { onSuccess: () => { toast({ title: t("swap") }); setSwapping(false); }, onError: err })}
            >
              {tc("confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend (needs a reason) */}
      <Modal open={!!suspending} onOpenChange={(o) => !o && setSuspending(null)} title={t("suspend")} className="max-w-md">
        {suspending && (
          <div className="space-y-4">
            <p className="text-sm"><span className="font-medium text-foreground">{suspending.name}</span> · {suspending.membershipNumber}</p>
            <div className="space-y-1.5"><Label>{t("suspendReason")}</Label><Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSuspending(null)}>{tc("cancel")}</Button>
              <Button
                variant="destructive"
                disabled={!suspendReason || setSuspended.isPending}
                onClick={() => setSuspended.mutate({ equbId: equb.id, memberId: suspending.memberId, suspend: true, reason: suspendReason }, { onSuccess: () => { toast({ title: t("suspend"), description: suspending.name }); setSuspending(null); }, onError: err })}
              >
                {t("suspend")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove (confirm) */}
      <Modal open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title={t("remove")} className="max-w-md">
        {removing && (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t("removeConfirm", { name: removing.name })}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoving(null)}>{tc("cancel")}</Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ equbId: equb.id, memberId: removing.memberId }, { onSuccess: () => { toast({ title: t("remove"), description: removing.name }); setRemoving(null); }, onError: err })}
              >
                {t("remove")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function MemberPick({ label, value, onChange, members, exclude }: { label: string; value: string; onChange: (v: string) => void; members: EqubMember[]; exclude?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          {members.filter((m) => m.memberId !== exclude).map((m) => (
            <SelectItem key={m.memberId} value={m.memberId}>#{m.position} · {m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
