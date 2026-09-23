"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Layers, Pencil, Info, Plus, Trash2, Search, CirclePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { EqubFormModal } from "@/components/equb/equb-form-modal";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getErrorMessage } from "@/lib/utils";
import { EQUB_FREQUENCIES, EQUB_SCHEME_STATUSES } from "@/types/equb-api";
import type { EqubCategory, EqubCategoryInput } from "@/types/ekub";

const blank = (): EqubCategoryInput => ({
  code: "",
  name: "",
  description: "",
  frequency: "daily",
  contribution: 1000,
  adminFee: 50,
  takafulFee: 10,
  payout: 200000,
  membersPerEqub: 200,
  winnersPerRound: 7,
  totalRounds: 29,
});

const toInput = (c: EqubCategory): EqubCategoryInput => ({
  name: c.name,
  description: c.description,
  frequency: c.frequency,
  contribution: c.contribution,
  adminFee: c.adminFee,
  takafulFee: c.takafulFee,
  payout: c.payout,
  membersPerEqub: c.membersPerEqub,
  winnersPerRound: c.winnersPerRound,
  totalRounds: c.totalRounds,
  status: c.status as EqubCategoryInput["status"],
});

function CategoriesInner() {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const te = useTranslations("equbs");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canManage = has(EKUB_PERMS.CATEGORY_MANAGE);

  const [search, setSearch] = useState("");
  const { data, isLoading } = useCategories({ search: search || undefined });
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const [editing, setEditing] = useState<{ id: string | null; form: EqubCategoryInput } | null>(null);
  const [deleting, setDeleting] = useState<EqubCategory | null>(null);
  const [creatingEqubFor, setCreatingEqubFor] = useState<EqubCategory | null>(null);

  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });
  const freqLabel = (f: string) => (t.has(f) ? t(f) : f);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const onSave = () => {
    if (!editing) return;
    const { id, form } = editing;
    const done = { onSuccess: () => { toast({ title: id ? tc("save") : tc("create"), description: form.name }); setEditing(null); }, onError: err };
    if (id) update.mutate({ id, input: form }, done);
    else create.mutate(form, done);
  };

  const valid = !!editing && !!editing.form.name && (editing.id || !!editing.form.code) && editing.form.contribution > 0 && editing.form.payout > 0 && editing.form.membersPerEqub > 0 && editing.form.winnersPerRound > 0 && editing.form.totalRounds > 0;
  const pending = create.isPending || update.isPending;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage ? (
            <Button onClick={() => setEditing({ id: null, form: blank() })}>
              <Plus size={16} className="mr-1" /> {t("create")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} />
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground sm:max-w-md">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("advanceNote")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {isLoading || !data
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)
          : data.map((c) => (
              <Card key={c.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Layers size={20} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-foreground">{c.name}</h3>
                        <p className="truncate font-mono text-xs text-muted-foreground">{c.code}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge status={c.status} kind="lifecycle" />
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" title={t("edit")} onClick={() => setEditing({ id: c.id, form: toInput(c) })}>
                            <Pencil size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" title={tc("delete")} onClick={() => setDeleting(c)}>
                            <Trash2 size={15} className="text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}

                  <div className="rounded-2xl bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">{t("payout")}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(c.payout)}</p>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <Row label={t("frequency")} value={freqLabel(c.frequency)} />
                    <Row label={t("contribution")} value={formatCurrency(c.contribution)} />
                    <Row label={t("adminFee")} value={formatCurrency(c.adminFee)} />
                    <Row label={t("takafulFee")} value={formatCurrency(c.takafulFee)} />
                    <Row label={t("totalPerRound")} value={formatCurrency(c.contribution + c.adminFee + c.takafulFee)} strong />
                    <Row label={t("membersPerEqub")} value={String(c.membersPerEqub)} />
                    <Row label={t("winnersPerRound")} value={String(c.winnersPerRound)} />
                    <Row label={t("totalRounds")} value={String(c.totalRounds)} />
                    <Row label={t("estLength")} value={`${c.totalRounds} ${t("rounds")} · ${freqLabel(c.frequency).toLowerCase()}`} />
                  </dl>

                  {canManage && (
                    <Button variant="outline" className="mt-auto" onClick={() => setCreatingEqubFor(c)} disabled={c.status === "cancelled"}>
                      <CirclePlus size={15} className="mr-1" /> {t("createEqub")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Create / edit category — mirrors Create/UpdateEqubSchemeRequest */}
      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? t("edit") : t("create")} className="max-w-2xl">
        {editing && (
          <div className="grid max-h-[75vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            {!editing.id && (
              <Field label={t("code")}>
                <Input value={editing.form.code ?? ""} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, code: e.target.value.toUpperCase() } })} placeholder="MED-DAILY" />
                <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
              </Field>
            )}
            <Field label={t("name")} className={editing.id ? "sm:col-span-2" : ""}>
              <Input value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} />
            </Field>
            <Field label={t("description")} className="sm:col-span-2">
              <Textarea rows={2} value={editing.form.description} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} />
            </Field>
            <Field label={t("frequency")}>
              <Select value={editing.form.frequency} onValueChange={(v) => setEditing({ ...editing, form: { ...editing.form, frequency: v as EqubCategoryInput["frequency"] } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUB_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{freqLabel(f)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {editing.id && (
              <Field label={t("status")}>
                <Select value={editing.form.status ?? "draft"} onValueChange={(v) => setEditing({ ...editing, form: { ...editing.form, status: v as EqubCategoryInput["status"] } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUB_SCHEME_STATUSES.map((s) => <SelectItem key={s} value={s}>{te(`status${s.charAt(0).toUpperCase()}${s.slice(1)}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label={t("contribution")}>
              <Input type="number" min={0} value={editing.form.contribution} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, contribution: num(e.target.value) } })} />
            </Field>
            <Field label={t("adminFee")}>
              <Input type="number" min={0} value={editing.form.adminFee} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, adminFee: num(e.target.value) } })} />
            </Field>
            <Field label={t("takafulFee")}>
              <Input type="number" min={0} value={editing.form.takafulFee} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, takafulFee: num(e.target.value) } })} />
            </Field>
            <Field label={t("payout")}>
              <Input type="number" min={0} value={editing.form.payout} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, payout: num(e.target.value) } })} />
            </Field>
            <Field label={t("membersPerEqub")}>
              <Input type="number" min={1} value={editing.form.membersPerEqub} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, membersPerEqub: num(e.target.value) } })} />
            </Field>
            <Field label={t("winnersPerRound")}>
              <Input type="number" min={1} value={editing.form.winnersPerRound} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, winnersPerRound: num(e.target.value) } })} />
            </Field>
            <Field label={t("totalRounds")}>
              <Input type="number" min={1} value={editing.form.totalRounds} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, totalRounds: num(e.target.value) } })} />
            </Field>
            <div className="rounded-xl bg-muted/40 p-3 text-sm sm:col-span-2">
              {t("totalPerRound")}: <strong>{formatCurrency(editing.form.contribution + editing.form.adminFee + editing.form.takafulFee)}</strong>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setEditing(null)}>{tc("cancel")}</Button>
              <Button onClick={onSave} disabled={!valid || pending}>{pending ? tc("saving") : tc("save")}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={tc("delete")} className="max-w-md">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t("deleteConfirm")} <strong>{deleting.name}</strong></p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id, { onSuccess: () => { toast({ title: tc("delete"), description: deleting.name }); setDeleting(null); }, onError: err })}>
                {tc("delete")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <EqubFormModal open={!!creatingEqubFor} onOpenChange={(o) => !o && setCreatingEqubFor(null)} defaultCategoryId={creatingEqubFor?.id} />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-bold text-foreground" : "font-medium text-foreground"}>{value}</dd>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.CATEGORY_READ]}>
      <CategoriesInner />
    </RequirePermission>
  );
}
