"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Ban, CalendarPlus, Pencil, Play, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { EqubFormModal, dateToIso } from "@/components/equb/equb-form-modal";
import { AssignManagerModal } from "@/components/equb/assign-manager-modal";
import { useActivateEqub, useCancelEqub, useDeleteEqub, useExtendEqub } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { formatDateForInput, getErrorMessage } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

export type LifecycleKind = "edit" | "manager" | "activate" | "extend" | "cancel" | "delete";

export interface LifecycleAction {
  kind: LifecycleKind;
  label: string;
  icon: typeof Play;
  destructive?: boolean;
  show: (e: Equb) => boolean;
}

/**
 * Every lifecycle transition an Equb supports (edit, activate, extend, cancel,
 * delete) with the confirm/reason modals they need. Shared by the Equb list
 * and the Equb detail header so both surfaces behave identically.
 */
export function useEqubLifecycle(opts: { onDeleted?: (equb: Equb) => void } = {}) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const activate = useActivateEqub();
  const extend = useExtendEqub();
  const cancel = useCancelEqub();
  const remove = useDeleteEqub();

  const [modal, setModal] = useState<{ kind: LifecycleKind; equb: Equb } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [reason, setReason] = useState("");
  const [rounds, setRounds] = useState(1);

  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
  const close = () => setModal(null);

  const open = (kind: LifecycleKind, equb: Equb) => {
    setReason("");
    setRounds(1);
    setStartDate(formatDateForInput(equb.startDate) || formatDateForInput(new Date().toISOString()));
    setModal({ kind, equb });
  };

  const actions: LifecycleAction[] = [
    { kind: "edit", label: t("editEqub"), icon: Pencil, show: (e) => e.status === "draft" || e.status === "active" },
    // Any status: reassigning mid-way is exactly when a manager leaves.
    { kind: "manager", label: t("assignManager"), icon: UserCog, show: () => true },
    { kind: "activate", label: t("activate"), icon: Play, show: (e) => e.status === "draft" },
    { kind: "extend", label: t("extend"), icon: CalendarPlus, show: (e) => e.status === "active" },
    { kind: "cancel", label: t("cancel"), icon: Ban, destructive: true, show: (e) => e.status === "draft" || e.status === "active" },
    { kind: "delete", label: t("delete"), icon: Trash2, destructive: true, show: () => true },
  ];

  const pending = activate.isPending || extend.isPending || cancel.isPending || remove.isPending;

  const confirm = () => {
    if (!modal) return;
    const { kind, equb } = modal;
    const done = (title: string) => ({
      onSuccess: () => { toast({ title, description: equb.name }); close(); if (kind === "delete") opts.onDeleted?.(equb); },
      onError: err,
    });
    if (kind === "activate") activate.mutate({ id: equb.id, startDate: dateToIso(startDate) ?? new Date().toISOString() }, done(t("activate")));
    else if (kind === "extend") extend.mutate({ id: equb.id, additionalRounds: rounds, reason }, done(t("extend")));
    else if (kind === "cancel") cancel.mutate({ id: equb.id, reason }, done(t("cancel")));
    else if (kind === "delete") remove.mutate(equb.id, done(t("delete")));
  };

  const titles: Record<LifecycleKind, string> = {
    edit: t("editEqub"),
    manager: t("assignManager"),
    activate: t("activateTitle"),
    extend: t("extend"),
    cancel: t("cancel"),
    delete: t("delete"),
  };

  const modals: ReactNode = (
    <>
      <EqubFormModal open={modal?.kind === "edit"} onOpenChange={(o) => !o && close()} equb={modal?.kind === "edit" ? modal.equb : null} />

      <AssignManagerModal equb={modal?.kind === "manager" ? modal.equb : null} onOpenChange={(o) => !o && close()} />

      <Modal open={!!modal && modal.kind !== "edit" && modal.kind !== "manager"} onOpenChange={(o) => !o && close()} title={modal ? titles[modal.kind] : ""} className="max-w-md">
        {modal && modal.kind !== "edit" && modal.kind !== "manager" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{modal.equb.name}</span> · {modal.equb.code}
            </p>

            {modal.kind === "activate" && (
              <div className="space-y-1.5">
                <Label>{t("start")}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("activateHint")}</p>
              </div>
            )}
            {modal.kind === "extend" && (
              <div className="space-y-1.5">
                <Label>{t("additionalRounds")}</Label>
                <Input type="number" min={1} value={rounds} onChange={(e) => setRounds(Math.max(1, Number(e.target.value) || 1))} />
              </div>
            )}
            {(modal.kind === "extend" || modal.kind === "cancel") && (
              <div className="space-y-1.5">
                <Label>{tc("reason")}</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
            {modal.kind === "delete" && <p className="text-sm text-destructive">{t("deleteConfirm")}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
              <Button
                variant={modal.kind === "delete" || modal.kind === "cancel" ? "destructive" : "default"}
                disabled={pending || ((modal.kind === "extend" || modal.kind === "cancel") && !reason) || (modal.kind === "activate" && !startDate)}
                onClick={confirm}
              >
                {pending ? tc("saving") : tc("confirm")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );

  return { actions, open, modals, pending };
}
