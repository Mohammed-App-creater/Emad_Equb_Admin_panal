"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Heart, ShieldAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/equb/status-badge";
import { useEmergencyDraws, useDecideEmergencyDraw, useSubmitEmergencyDraw, useEqubMembers } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import type { EmergencyDrawRequest, Equb } from "@/types/ekub";

/** Hardship early-turn (emergency draw) requests of one Equb. */
export function HardshipTab({ equb }: { equb: Equb }) {
  const t = useTranslations("hardship");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canDecide = has(EKUB_PERMS.PAYOUT_APPROVE) || has(EKUB_PERMS.EQUB_MANAGE);

  const { data, isLoading } = useEmergencyDraws(equb.id);
  const { data: members } = useEqubMembers(equb.id);
  const decide = useDecideEmergencyDraw();
  const submit = useSubmitEmergencyDraw();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ memberId: "", reason: "", evidence: "" });
  const [rejecting, setRejecting] = useState<EmergencyDrawRequest | null>(null);
  const [note, setNote] = useState("");

  const memberName = (id: string) => members?.find((m) => m.memberId === id)?.name ?? id;
  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
  const isOpen = (s: string) => s === "pending" || s === "requested" || s === "submitted";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-primary" /> {t("note")}
        </p>
        {canDecide && (
          <Button variant="outline" onClick={() => { setForm({ memberId: "", reason: "", evidence: "" }); setCreating(true); }}>
            <Plus size={15} className="mr-1" /> {t("submit")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Heart size={22} className="mx-auto mb-2 text-muted-foreground/60" />
          {t("noRequests")}
        </div>
      ) : (
        <div className="space-y-3">
          {data!.map((h) => (
            <div key={h.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{memberName(h.memberId)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={h.status} kind="request" />
                  {canDecide && isOpen(h.status) && (
                    <>
                      <Button size="sm" title={t("approve")} disabled={decide.isPending} onClick={() => decide.mutate({ equbId: equb.id, id: h.id, decision: "approve" }, { onSuccess: () => toast({ title: t("approve") }), onError: err })}>
                        <Check size={13} />
                      </Button>
                      <Button size="sm" variant="outline" title={t("reject")} onClick={() => { setNote(""); setRejecting(h); }}>
                        <X size={13} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground">{h.reason}</p>
              {(h.reviewNote || h.reviewedBy) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("reviewNote")}: {h.reviewNote || "—"}{h.reviewedBy ? ` · ${t("reviewedBy")}: ${h.reviewedBy}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New request (on behalf of a member) */}
      <Modal open={creating} onOpenChange={setCreating} title={t("submit")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("member")}</Label>
            <Select value={form.memberId} onValueChange={(v) => setForm({ ...form, memberId: v })}>
              <SelectTrigger><SelectValue placeholder={t("member")} /></SelectTrigger>
              <SelectContent>
                {(members ?? []).map((m) => <SelectItem key={m.memberId} value={m.memberId}>#{m.position} · {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t("reason")}</Label><Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("evidence")}</Label><Input value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreating(false)}>{tc("cancel")}</Button>
            <Button
              disabled={!form.memberId || !form.reason || submit.isPending}
              onClick={() => submit.mutate({ equbId: equb.id, memberId: form.memberId, reason: form.reason, evidence: form.evidence || undefined }, { onSuccess: () => { toast({ title: t("submit") }); setCreating(false); }, onError: err })}
            >
              {tc("submit")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject with note */}
      <Modal open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} title={t("reject")} className="max-w-md">
        {rejecting && (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t("reviewNote")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejecting(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" disabled={!note || decide.isPending} onClick={() => decide.mutate({ equbId: equb.id, id: rejecting.id, decision: "reject", note }, { onSuccess: () => { toast({ title: t("reject") }); setRejecting(null); }, onError: err })}>
                {t("reject")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
