"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, UserCog, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getInitials } from "@/components/ui/data-table";
import { useAssignManager, useStaffUserSearch } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { cn, getErrorMessage } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * Hand an Equb to another staff user (PUT /equb/admin/groups/{id}/manager).
 * Admin-only; works at any Equb status and is idempotent.
 */
export function AssignManagerModal({ equb, onOpenChange }: { equb: Equb | null; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("equbs");
  return (
    <Modal open={!!equb} onOpenChange={onOpenChange} title={t("assignManager")} className="max-w-lg">
      {equb && <Body key={equb.id} equb={equb} onClose={() => onOpenChange(false)} />}
    </Modal>
  );
}

function Body({ equb, onClose }: { equb: Equb; onClose: () => void }) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: users, isFetching } = useStaffUserSearch(debounced);
  const assign = useAssignManager();

  const current = equb.manager;
  const submit = () => {
    if (!selected) return;
    const name = users?.find((u) => u.id === selected)?.fullName ?? selected;
    assign.mutate(
      { id: equb.id, managerUserId: selected },
      {
        onSuccess: (r) => {
          toast({ title: r.changed ? t("managerAssigned") : t("managerUnchanged"), description: `${equb.name} → ${name}` });
          onClose();
        },
        onError: (e) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <p className="text-xs text-muted-foreground">{t("currentManager")}</p>
        {current ? (
          <p className="font-medium text-foreground">
            {current.fullName} <span className="font-normal text-muted-foreground">· {current.email || current.phone}</span>
          </p>
        ) : (
          <p className="font-medium text-muted-foreground">{t("noManager")}</p>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchUser")} />
      </div>

      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {isFetching && !users && <p className="p-2 text-sm text-muted-foreground">{tc("loading")}</p>}
        {users && users.length === 0 && <p className="p-2 text-sm text-muted-foreground">{tc("noData")}</p>}
        {(users ?? []).map((u) => {
          const isCurrent = u.id === current?.userId;
          const isSelected = u.id === selected;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelected(u.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{getInitials(u.fullName)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{u.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">{[u.role, u.email || u.phone].filter(Boolean).join(" · ")}</span>
              </span>
              {isCurrent && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{t("currentManager")}</span>}
              {isSelected && <Check size={16} className="shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0 text-primary" /> {t("assignManagerHint")}
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!selected || selected === current?.userId || assign.isPending} onClick={submit}>
          <UserCog size={15} className="mr-1" /> {assign.isPending ? tc("saving") : t("assignManager")}
        </Button>
      </div>
    </div>
  );
}
