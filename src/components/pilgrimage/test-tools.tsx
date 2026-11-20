"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FastForward, FlaskConical, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useErrorToast } from "@/components/pilgrimage/shared";
import { useTestFastForward, useTestOdooReply, useTestSweep, useTestToolsOn } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { FAST_FORWARD_TARGETS, type FastForwardTarget, type PilgrimageCycle, type PilgrimageWinner } from "@/types/pilgrimage";

/**
 * Test tools, shown only where the backend serves them (development and
 * staging with PILGRIMAGE_TEST_TOOLS on; never production) to a user with
 * pilgrimage:test. They let a whole cycle be walked through in one sitting:
 * run the hourly sweep now, move an approved cycle's deadlines into the
 * past, and answer for Odoo on a winner's contract.
 */
export function CycleTestTools({ cycle }: { cycle: PilgrimageCycle }) {
  const t = useTranslations("pilgrimage.testTools");
  const { data: on } = useTestToolsOn();
  const { toast } = useToast();
  const onError = useErrorToast();
  const sweep = useTestSweep();
  const forward = useTestFastForward();
  const [running, setRunning] = useState<FastForwardTarget | null>(null);
  if (!on) return null;
  const approved = cycle.status === "approved";

  const go = (to: FastForwardTarget) => {
    setRunning(to);
    forward.mutate({ id: cycle.id, to }, {
      onSuccess: (r) => toast({
        title: t("forwarded", { target: t(`target_${to}`) }),
        description: [
          r.winners_moved ? t("winnersMoved", { count: r.winners_moved }) : null,
          r.decisions_moved ? t("decisionsMoved", { count: r.decisions_moved }) : null,
          r.sweep_error ? t("sweepError", { error: r.sweep_error }) : null,
        ].filter(Boolean).join(" ") || undefined,
        variant: r.sweep_error ? "destructive" : undefined,
      }),
      onError,
      onSettled: () => setRunning(null),
    });
  };

  return (
    <Card className="space-y-3 border-dashed border-warning/60 bg-warning/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-warning" />
          <h3 className="font-semibold text-foreground">{t("title")}</h3>
        </div>
        <Button size="sm" variant="outline" disabled={sweep.isPending}
          onClick={() => sweep.mutate(undefined, { onSuccess: () => toast({ title: t("swept") }), onError })}>
          {sweep.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />} {t("runSweep")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      {approved ? (
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FAST_FORWARD_TARGETS.map((to, i) => (
            <li key={to} className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{i + 1}. {t(`target_${to}`)}</p>
                <p className="text-xs text-muted-foreground">{t(`targetHint_${to}`)}</p>
              </div>
              <Button size="sm" variant="secondary" disabled={forward.isPending} onClick={() => go(to)} className="self-start">
                {running === to ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FastForward size={14} className="mr-1" />} {t("forward")}
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">{t("notApproved")}</p>
      )}
    </Card>
  );
}

/** Answers for Odoo on a winner's contract that was sent to it (pending). */
export function WinnerTestTools({ winner: w }: { winner: PilgrimageWinner }) {
  const t = useTranslations("pilgrimage.testTools");
  const { data: on } = useTestToolsOn();
  const { toast } = useToast();
  const onError = useErrorToast();
  const reply = useTestOdooReply();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  if (!on || !w.saving_contract_id || w.saving_contract?.status !== "pending") return null;
  const send = (confirm: boolean) =>
    reply.mutate({ contractId: w.saving_contract_id!, confirm, reason: confirm ? undefined : reason.trim() || undefined }, {
      onSuccess: () => { toast({ title: confirm ? t("odooConfirmed") : t("odooRejected") }); setRejecting(false); setReason(""); },
      onError,
    });

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-warning/60 bg-warning/5 p-3" onClick={(e) => e.stopPropagation()}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-warning"><FlaskConical size={13} /> {t("odooTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("odooHint")}</p>
      {rejecting ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-8 max-w-xs text-xs" value={reason} maxLength={200} placeholder={t("rejectReason")} onChange={(e) => setReason(e.target.value)} autoFocus />
          <Button size="sm" variant="destructive" disabled={reply.isPending} onClick={() => send(false)}>
            {reply.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <XCircle size={14} className="mr-1" />} {t("odooReject")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>{t("cancel")}</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={reply.isPending} onClick={() => send(true)}>
            {reply.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <CheckCircle2 size={14} className="mr-1" />} {t("odooConfirm")}
          </Button>
          <Button size="sm" variant="outline" disabled={reply.isPending} onClick={() => setRejecting(true)}>
            <XCircle size={14} className="mr-1" /> {t("odooReject")}
          </Button>
        </div>
      )}
    </div>
  );
}
