"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X, ExternalLink, Wallet, Trophy, LifeBuoy } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatCard } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  useEqubs,
  useFeeLedger,
  useConfirmPayment,
  useRejectPayment,
  useEqubWinnersMany,
  useApproveWinner,
  useEmergencyDrawsMany,
  useEqubMembersMany,
  useDecideEmergencyDraw,
} from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

type Kind = "payment" | "winner" | "hardship";
type Decision = "pending" | "approved" | "rejected";

/** One row of the queue, whatever kind of request it is. */
interface Item {
  key: string;
  kind: Kind;
  id: string;
  equb?: Equb;
  equbId: string;
  equbName: string;
  memberName: string;
  detail: string;
  amount?: number;
  date: string;
  status: Decision;
  /** Rounds the request covers (a payment can cover several). */
  roundNumbers: number[];
  /** Winner still needs a guarantee reviewed in the Equb's Winners tab. */
  needsGuarantee?: boolean;
}

const kindStyle: Record<Kind, string> = {
  payment: "bg-primary/10 text-primary",
  winner: "bg-secondary/20 text-secondary-foreground",
  hardship: "bg-info/15 text-info",
};
const statusStyle: Record<Decision, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};
const toDecision = (s: string): Decision => {
  const v = (s || "").toLowerCase();
  if (["approved", "paid", "released", "completed", "guaranteed", "ready"].includes(v)) return "approved";
  if (["rejected", "declined", "cancelled"].includes(v)) return "rejected";
  return "pending";
};

function ApprovalsInner() {
  const t = useTranslations("approvals");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { has } = useEkubAccess();
  const canPayments = has(EKUB_PERMS.PAYMENT_RECONCILE) || has(EKUB_PERMS.PAYOUT_APPROVE);
  const canWinners = has(EKUB_PERMS.PAYOUT_APPROVE);
  const canHardship = has(EKUB_PERMS.PAYOUT_APPROVE) || has(EKUB_PERMS.EQUB_MANAGE);

  const [kind, setKind] = useState<Kind | "all">("all");
  const [equbFilter, setEqubFilter] = useState("all");
  const [status, setStatus] = useState<Decision | "all">("pending");
  const [roundNo, setRoundNo] = useState("all");

  // ---- sources -------------------------------------------------------------
  const { data: equbs, isLoading: equbsLoading } = useEqubs();
  const live = (equbs ?? []).filter((e) => e.status !== "draft");
  const liveIds = live.map((e) => e.id);
  const equbById = new Map((equbs ?? []).map((e) => [e.id, e]));

  // A recorded collection leaves its contributions pending with a payment id
  // until someone confirms it; one payment can cover several rounds.
  const { data: ledger, isLoading: ledgerLoading } = useFeeLedger({ status: "pending" }, 1, 500);
  const winnersQ = useEqubWinnersMany(liveIds);
  const hardshipQ = useEmergencyDrawsMany(liveIds);
  // Hardship requests carry only a member id; load rosters just for those Equbs.
  const hardshipEqubIds = liveIds.filter((_, i) => (hardshipQ[i]?.data?.length ?? 0) > 0);
  const rostersQ = useEqubMembersMany(hardshipEqubIds);
  const nameOf = new Map(rostersQ.flatMap((q) => (q.data ?? []).map((m) => [`${m.memberId}`, m.name] as const)));
  const loading = equbsLoading || ledgerLoading || winnersQ.some((q) => q.isLoading) || hardshipQ.some((q) => q.isLoading);

  const items: Item[] = (() => {
    const out: Item[] = [];
    const byPayment = new Map<string, NonNullable<typeof ledger>["items"]>();
    for (const l of ledger?.items ?? []) {
      if (!l.paymentId || l.collected) continue;
      byPayment.set(l.paymentId, [...(byPayment.get(l.paymentId) ?? []), l]);
    }
    for (const [paymentId, lines] of byPayment) {
      const first = lines[0];
      const rounds = lines.map((l) => `#${l.roundNumber}`).join(", ");
      out.push({
        key: `payment-${paymentId}`,
        kind: "payment",
        id: paymentId,
        equb: equbById.get(first.equbId),
        equbId: first.equbId,
        equbName: first.equbName,
        memberName: first.memberName || "—",
        detail: `${t("roundsLabel")} ${rounds}${lines.some((l) => l.isCatchUp) ? ` · ${t("catchUp")}` : ""}`,
        amount: lines.reduce((a, l) => a + l.total, 0),
        date: lines.map((l) => l.scheduledAt).sort().at(-1) ?? "",
        status: "pending",
        roundNumbers: lines.map((l) => l.roundNumber),
      });
    }
    winnersQ.forEach((q, i) => {
      const equb = live[i];
      for (const w of q.data ?? []) {
        const guaranteeRequired = equb?.effectiveTerms?.guaranteeRequired ?? equb?.category?.guaranteeRequired ?? true;
        out.push({
          key: `winner-${w.id}`,
          kind: "winner",
          id: w.id,
          equb,
          equbId: equb.id,
          equbName: equb.name,
          memberName: w.name,
          detail: `${t("roundsLabel")} #${w.roundNumber ?? "—"}${guaranteeRequired ? ` · ${t("guarantee")}: ${w.guaranteeStatus.replace(/_/g, " ")}` : ""}`,
          amount: w.payoutAmount,
          date: w.createdAt,
          status: w.status === "pending" ? "pending" : "approved",
          roundNumbers: w.roundNumber ? [w.roundNumber] : [],
          needsGuarantee: guaranteeRequired && w.guaranteeStatus !== "approved",
        });
      }
    });
    hardshipQ.forEach((q, i) => {
      const equb = live[i];
      for (const h of q.data ?? []) {
        out.push({
          key: `hardship-${h.id}`,
          kind: "hardship",
          id: h.id,
          equb,
          equbId: equb.id,
          equbName: equb.name,
          memberName: nameOf.get(h.memberId) ?? t("unknownMember"),
          detail: h.reason,
          date: h.createdAt,
          status: toDecision(h.status),
          roundNumbers: [],
        });
      }
    });
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  })();

  const shown = items.filter((i) => (kind === "all" || i.kind === kind) && (equbFilter === "all" || i.equbId === equbFilter) && (status === "all" || i.status === status) && (roundNo === "all" || i.roundNumbers.includes(Number(roundNo))));
  // Rounds that appear in the chosen Equb's requests.
  const roundOptions = Array.from(new Set(items.filter((i) => i.equbId === equbFilter).flatMap((i) => i.roundNumbers))).sort((a, b) => a - b);
  const pendingOf = (k: Kind) => items.filter((i) => i.kind === k && i.status === "pending").length;

  // ---- actions ---------------------------------------------------------------
  const confirm = useConfirmPayment();
  const rejectPay = useRejectPayment();
  const approveWinner = useApproveWinner();
  const decideHardship = useDecideEmergencyDraw();
  const [rejecting, setRejecting] = useState<Item | null>(null);
  const [reason, setReason] = useState("");
  const busy = confirm.isPending || rejectPay.isPending || approveWinner.isPending || decideHardship.isPending;
  const fail = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
  const ok = (title: string, i: Item) => toast({ title, description: `${i.memberName} · ${i.equbName}` });

  const approve = (i: Item) => {
    if (i.kind === "payment") confirm.mutate({ equbId: i.equbId, paymentId: i.id }, { onSuccess: () => ok(t("approved"), i), onError: fail });
    else if (i.kind === "winner") approveWinner.mutate({ equbId: i.equbId, winnerId: i.id }, { onSuccess: () => ok(t("approved"), i), onError: fail });
    else decideHardship.mutate({ equbId: i.equbId, id: i.id, decision: "approve" }, { onSuccess: () => ok(t("approved"), i), onError: fail });
  };
  const reject = () => {
    if (!rejecting) return;
    const i = rejecting;
    const done = { onSuccess: () => { ok(t("rejected"), i); setRejecting(null); setReason(""); }, onError: fail };
    if (i.kind === "payment") rejectPay.mutate({ paymentId: i.id, reason }, done);
    else decideHardship.mutate({ equbId: i.equbId, id: i.id, decision: "reject", note: reason }, done);
  };
  const allowed = (k: Kind) => (k === "payment" ? canPayments : k === "winner" ? canWinners : canHardship);

  const columns: DataTableColumn<Item>[] = [
    { id: "kind", sortValue: (r) => r.kind, header: t("type"), mobile: "badge", cell: (r) => <Badge className={kindStyle[r.kind]}>{t(`kind_${r.kind}` as never)}</Badge> },
    { id: "member", sortValue: (r) => r.memberName, header: t("member"), mobile: "title", cell: (r) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{r.memberName}</p>
        <Link href={`/dashboard/equbs/${r.equbId}`} className="truncate text-xs text-muted-foreground hover:underline">{r.equbName}</Link>
      </div>
    ) },
    { id: "detail", header: t("detail"), mobile: "detail", cell: (r) => <span className="line-clamp-2 text-sm text-muted-foreground">{r.detail}</span> },
    { id: "amount", sortValue: (r) => r.amount ?? null, header: t("amount"), mobile: "detail", align: "right", cell: (r) => <span className="font-medium tabular-nums">{r.amount === undefined ? "—" : formatCurrency(r.amount)}</span> },
    { id: "date", sortValue: (r) => r.date, header: t("date"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.date)}</span> },
    { id: "status", sortValue: (r) => r.status, header: tc("status"), mobile: "badge", cell: (r) => <Badge className={statusStyle[r.status]}>{t(`status_${r.status}` as never)}</Badge> },
    { id: "actions", header: "", align: "right", cell: (r) => {
      if (r.status !== "pending" || !allowed(r.kind)) return null;
      if (r.kind === "winner" && r.needsGuarantee) {
        return (
          <Link href={`/dashboard/equbs/${r.equbId}?tab=winners`} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-accent">
            <ExternalLink size={14} className="mr-1" /> {t("reviewGuarantee")}
          </Link>
        );
      }
      return (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" disabled={busy} onClick={() => approve(r)}><Check size={14} className="mr-1" /> {t("approve")}</Button>
          {r.kind !== "winner" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => { setReason(""); setRejecting(r); }}><X size={14} className="mr-1" /> {t("reject")}</Button>
          )}
        </div>
      );
    } },
  ];

  const kindCard = (k: Kind, icon: typeof Wallet, tone: "primary" | "secondary" | "info") => (
    <button type="button" onClick={() => setKind(kind === k ? "all" : k)} className={cn("rounded-2xl text-left transition", kind === k && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
      <StatCard label={t(`pending_${k}` as never)} value={loading ? "…" : pendingOf(k)} icon={icon} tone={tone} />
    </button>
  );

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kindCard("payment", Wallet, "primary")}
        {kindCard("winner", Trophy, "secondary")}
        {kindCard("hardship", LifeBuoy, "info")}
      </div>

      <DataTable
        filters={{
          search: { keys: (r) => [r.memberName, r.equbName, r.detail] },
          extra: (
            <div className="flex flex-wrap gap-2">
              <Select value={kind} onValueChange={(v) => setKind(v as Kind | "all")}>
                <SelectTrigger className="h-9 sm:w-47.5"><span className="truncate"><span className="text-muted-foreground">{t("type")}: </span><SelectValue /></span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {(["payment", "winner", "hardship"] as Kind[]).map((k) => <SelectItem key={k} value={k}>{t(`kind_${k}` as never)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={equbFilter} onValueChange={(v) => { setEqubFilter(v); setRoundNo("all"); }}>
                <SelectTrigger className="h-9 sm:w-55"><span className="truncate"><span className="text-muted-foreground">{t("equb")}: </span><SelectValue /></span></SelectTrigger>
                <SelectContent loading={equbsLoading}>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {live.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={roundNo} onValueChange={setRoundNo} disabled={equbFilter === "all"}>
                <SelectTrigger className="h-9 sm:w-40"><span className="truncate"><span className="text-muted-foreground">{t("round")}: </span><SelectValue /></span></SelectTrigger>
                <SelectContent empty={equbFilter !== "all" && roundOptions.length === 0}>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {roundOptions.map((n) => <SelectItem key={n} value={String(n)}>#{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as Decision | "all")}>
                <SelectTrigger className="h-9 sm:w-45"><span className="truncate"><span className="text-muted-foreground">{tc("status")}: </span><SelectValue /></span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {(["pending", "approved", "rejected"] as Decision[]).map((s) => <SelectItem key={s} value={s}>{t(`status_${s}` as never)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ),
        }}
        columns={columns}
        data={shown}
        rowKey={(r) => r.key}
        isLoading={loading}
        emptyTitle={t("empty")}
      />

      <Modal open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} title={t("rejectTitle")} className="max-w-md">
        {rejecting && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t(`kind_${rejecting.kind}` as never)} · {rejecting.memberName} · {rejecting.equbName}</p>
            <div className="space-y-1.5">
              <Label>{t("rejectReason")}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejecting(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" disabled={!reason.trim() || busy} onClick={reject}><X size={14} className="mr-1" /> {t("reject")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PAYMENT_RECONCILE, EKUB_PERMS.PAYOUT_APPROVE, EKUB_PERMS.EQUB_MANAGE]}>
      <ApprovalsInner />
    </RequirePermission>
  );
}
