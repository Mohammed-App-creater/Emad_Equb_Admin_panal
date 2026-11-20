"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useMemberSearch } from "@/hooks/ekub";
import { useParticipations, usePilgrimageProducts, useRegisterParticipant } from "@/hooks/pilgrimage";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn, formatCurrency } from "@/lib/utils";
import { AgentSelect, Field, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import type { Participation } from "@/types/pilgrimage";
import type { MemberSummary } from "@/types/ekub";

const STATUSES = ["active", "deciding", "won", "withdrawn", "cancelled"] as const;

/** Individual registrations: their Equb savings, eligibility, group and agent. */
export function ParticipationsTab({ productId }: { productId?: string }) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const ts = useTranslations("pilgrimage.status");
  const router = useRouter();
  const { has } = useEkubAccess();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [registering, setRegistering] = useState(false);
  const { data, isLoading } = useParticipations({ product_id: productId, status: status === "all" ? undefined : status, page, limit: perPage });

  const columns: DataTableColumn<Participation>[] = [
    { id: "member", header: tc("member"), mobile: "title", cell: (p) => (
      <div>
        <p className="font-medium text-foreground">{p.member_name || tc("unknownMember")}</p>
        <p className="font-mono text-xs text-muted-foreground">{p.number} · {p.membership_number}</p>
      </div>
    ) },
    { id: "product", header: t("product"), mobile: "detail", cell: (p) => <span className="text-sm">{p.product?.name ?? "—"}</span> },
    { id: "progress", header: t("progress"), mobile: "detail", cell: (p) => <Progress participation={p} /> },
    { id: "agent", header: t("agent"), mobile: "detail", cell: (p) => <span className="text-sm">{p.agent_name || (p.agent_user_id ? t("agentUnnamed") : "—")}</span> },
    { id: "group", header: t("group"), mobile: "detail", cell: (p) => <span className="text-sm">{p.group ? p.group.name : "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (p) => <PStatus status={p.status} /> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        {has(EKUB_PERMS.PILGRIMAGE_REGISTER) && (
          <Button onClick={() => setRegistering(true)}><UserPlus size={16} className="mr-1" /> {t("register")}</Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        emptyTitle={tc("noData")}
        emptyMessage={t("empty")}
        onRowClick={(p) => router.push(`/dashboard/pilgrimage/participations/${p.id}`)}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
      <RegisterModal open={registering} defaultProductId={productId} onClose={() => setRegistering(false)} onRegistered={(p) => router.push(`/dashboard/pilgrimage/participations/${p.id}`)} />
    </div>
  );
}

/** Equb savings against the eligibility threshold of the current draw. */
export function Progress({ participation: p }: { participation: Participation }) {
  const t = useTranslations("pilgrimage.participation");
  const s = p.standing;
  const pct = s.required_contribution > 0 ? Math.min(100, (s.balance / s.required_contribution) * 100) : 0;
  return (
    <div className="min-w-40 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="tabular-nums">{formatCurrency(s.balance)}</span>
        <span className={s.eligible ? "font-medium text-success" : "text-muted-foreground"}>
          {s.eligible ? t("eligible") : t("percentOfPackage", { percent: s.contribution_percent })}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", s.eligible ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Registers a SACCO member for a product on their behalf. No contract is
 * opened: the member saves on the Equb ledger until they win. An agent
 * registering is linked automatically; staff may name the agent.
 */
export function RegisterModal({ open, defaultProductId, onClose, onRegistered }: {
  open: boolean; defaultProductId?: string; onClose: () => void; onRegistered: (p: Participation) => void;
}) {
  const t = useTranslations("pilgrimage.participation");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: products } = usePilgrimageProducts(true);
  const register = useRegisterParticipant();
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [agentId, setAgentId] = useState("");
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<MemberSummary | null>(null);
  const debounced = useDebounce(query, 300);
  const { data: results, isFetching } = useMemberSearch(open && !member ? debounced : "");
  const close = () => { setQuery(""); setMember(null); setAgentId(""); onClose(); };

  return (
    <Modal open={open} onOpenChange={(o) => !o && close()} title={t("register")} className="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("registerHint")}</p>
        <Field label={t("product")}>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
            <SelectContent empty={!products?.length}>
              {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={tc("member")}>
          {member ? (
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{member.fullName}</p>
                <p className="text-xs text-muted-foreground">{member.membershipNumber} · {member.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMember(null)}>{t("change")}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchMember")} autoFocus />
              </div>
              {debounced.trim().length >= 2 && (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
                  {isFetching && <p className="p-3 text-xs text-muted-foreground">{tc("loading")}</p>}
                  {!isFetching && !results?.length && <p className="p-3 text-xs text-muted-foreground">{tc("noData")}</p>}
                  {results?.map((m) => (
                    <button key={m.id} type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setMember(m)}>
                      <span>{m.fullName}</span>
                      <span className="text-xs text-muted-foreground">{m.membershipNumber} · {m.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>
        <Field label={`${t("agent")} (${tc("optional")})`} hint={t("agentHint")}>
          <AgentSelect value={agentId} onChange={setAgentId} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
          <Button disabled={!productId || !member || register.isPending}
            onClick={() => member && register.mutate({ product_id: productId, member_id: member.id, agent_user_id: agentId || undefined }, {
              onSuccess: (p) => { toast({ title: t("registered"), description: p.number }); close(); onRegistered(p); }, onError,
            })}>
            {register.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("register")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
