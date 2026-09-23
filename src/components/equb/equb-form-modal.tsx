"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { useCategories, useCreateEqub, useUpdateEqub } from "@/hooks/ekub";
import { useToast } from "@/hooks/use-toast";
import { formatDateForInput, getErrorMessage } from "@/lib/utils";
import type { Equb } from "@/types/ekub";

// Date-only input → RFC3339 at midnight UTC, which the Go backend parses.
export const dateToIso = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toISOString() : undefined);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the modal edits this Equb; otherwise it creates a new one. */
  equb?: Equb | null;
  /** Pre-select a category when creating (e.g. from the Categories page). */
  defaultCategoryId?: string;
  onSaved?: (equb: Equb) => void;
}

const blank = { categoryId: "", name: "", code: "", maxMembers: 0, startDate: "", expectedEndDate: "" };

/** Create / edit an Equb. Mirrors Create/UpdateEqubGroupRequest field for field. */
export function EqubFormModal({ open, onOpenChange, equb, defaultCategoryId, onSaved }: Props) {
  const t = useTranslations("equbs");
  const isEdit = !!equb;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEdit ? t("editEqub") : t("newEqub")} className="max-w-lg">
      {/* The body mounts fresh each time the dialog opens, so its initial
          state is derived from props without an effect. */}
      {open && <EqubFormBody key={equb?.id ?? "new"} equb={equb} defaultCategoryId={defaultCategoryId} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
    </Modal>
  );
}

function EqubFormBody({ equb, defaultCategoryId, onClose, onSaved }: { equb?: Equb | null; defaultCategoryId?: string; onClose: () => void; onSaved?: (equb: Equb) => void }) {
  const t = useTranslations("equbs");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const create = useCreateEqub();
  const update = useUpdateEqub();
  const isEdit = !!equb;

  const [form, setForm] = useState(() => {
    if (equb) {
      return {
        categoryId: equb.categoryId,
        name: equb.name,
        code: equb.code,
        maxMembers: equb.maxMembers,
        startDate: formatDateForInput(equb.startDate),
        expectedEndDate: formatDateForInput(equb.expectedEndDate),
      };
    }
    const cat = categories?.find((c) => c.id === defaultCategoryId) ?? categories?.[0];
    return { ...blank, categoryId: cat?.id ?? "", maxMembers: cat?.membersPerEqub ?? 0 };
  });
  const [maxTouched, setMaxTouched] = useState(isEdit);

  const selectCategory = (id: string) => {
    const cat = categories?.find((c) => c.id === id);
    setForm((f) => ({ ...f, categoryId: id, maxMembers: !maxTouched && cat ? cat.membersPerEqub : f.maxMembers }));
  };

  const pending = create.isPending || update.isPending;
  const valid = !!form.name && !!form.code && (isEdit || !!form.categoryId) && form.maxMembers > 0;

  const submit = () => {
    const done = {
      onSuccess: (e: Equb) => {
        toast({ title: isEdit ? tc("save") : tc("create"), description: e?.name ?? form.name });
        onClose();
        onSaved?.(e);
      },
      onError: (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }),
    };
    const dates = { startDate: dateToIso(form.startDate), expectedEndDate: dateToIso(form.expectedEndDate) };
    if (isEdit && equb) update.mutate({ id: equb.id, input: { name: form.name, code: form.code, maxMembers: form.maxMembers, ...dates } }, done);
    else create.mutate({ name: form.name, code: form.code, categoryId: form.categoryId, maxMembers: form.maxMembers, ...dates }, done);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{t("category")}</Label>
        <Select value={form.categoryId} onValueChange={selectCategory} disabled={isEdit}>
          <SelectTrigger><SelectValue placeholder={t("category")} /></SelectTrigger>
          <SelectContent>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name} <span className="text-muted-foreground">· {c.code}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("name")}</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("code")}</Label>
        <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MED-2026-01" />
      </div>
      <div className="space-y-1.5">
        <Label>{t("maxMembers")}</Label>
        <Input type="number" min={1} value={form.maxMembers || ""} onChange={(e) => { setMaxTouched(true); setForm({ ...form, maxMembers: Number(e.target.value) || 0 }); }} />
        {!isEdit && <p className="text-xs text-muted-foreground">{t("maxMembersHint")}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{t("start")}</Label>
        <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("end")}</Label>
        <Input type="date" value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
        <Button disabled={!valid || pending} onClick={submit}>
          {pending ? tc("saving") : isEdit ? tc("save") : tc("create")}
        </Button>
      </div>
    </div>
  );
}
