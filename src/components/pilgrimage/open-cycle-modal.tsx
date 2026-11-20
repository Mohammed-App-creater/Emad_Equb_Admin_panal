"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, useErrorToast } from "@/components/pilgrimage/shared";
import { cycleDateProblems, CycleDatesFields, defaultCycleDates, type CycleDates } from "@/components/pilgrimage/cycle-dates";
import { useOpenCycle } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { PilgrimageCycle, PilgrimageProduct } from "@/types/pilgrimage";

/**
 * Opens a product's next cycle (a new Hajj/Umrah Equb). Given one product it
 * opens that product's; given a list it asks which. Every date is shown
 * prefilled with the product's default; changing the opening or draw date
 * moves the dates that follow from it, unless they were set by hand.
 */
export function OpenCycleModal({ open, product, products, title, onClose, onOpened }: {
  open: boolean;
  product?: PilgrimageProduct | null;
  products?: PilgrimageProduct[];
  title?: string;
  onClose: () => void;
  onOpened?: (c: PilgrimageCycle) => void;
}) {
  const t = useTranslations("pilgrimage.cycle");
  const tp = useTranslations("pilgrimage.product");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const onError = useErrorToast();
  const openCycle = useOpenCycle();
  const choices = (products ?? []).filter((p) => p.status === "active");
  const [chosenId, setChosenId] = useState("");
  const [name, setName] = useState("");
  const [given, setGiven] = useState<Partial<CycleDates>>({});
  const selected = product ?? choices.find((p) => p.id === chosenId) ?? (choices.length === 1 ? choices[0] : undefined);
  const close = () => { setChosenId(""); setName(""); setGiven({}); onClose(); };
  const dates = selected ? defaultCycleDates(selected, given) : null;
  const badDates = !dates || Object.keys(cycleDateProblems(dates)).length > 0;

  const submit = () =>
    selected &&
    openCycle.mutate(
      { productId: selected.id, name: name.trim() || undefined, dates: dates ?? {} },
      { onSuccess: (c) => { toast({ title: t("opened"), description: c.name }); close(); onOpened?.(c); }, onError },
    );

  return (
    <Modal open={open} onOpenChange={(o) => !o && close()} title={title ?? t("openTitle", { product: selected?.name ?? "" })} className="max-w-lg">
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <p className="text-sm text-muted-foreground">{t("openHint")}</p>
        {!product && (
          <Field label={tp("sectionProduct")} hint={choices.length === 0 ? t("noActiveProduct") : undefined}>
            <Select value={selected?.id ?? ""} onValueChange={setChosenId}>
              <SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
              <SelectContent empty={choices.length === 0}>
                {choices.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-muted-foreground">· {formatCurrency(p.package_cost)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label={`${tc("name")} (${tc("optional")})`}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
        </Field>
        {dates && <CycleDatesFields value={dates} onChange={(k, v) => setGiven((g) => ({ ...g, [k]: v || undefined }))} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>{tc("cancel")}</Button>
          <Button onClick={submit} disabled={!selected || openCycle.isPending || badDates}>
            {openCycle.isPending && <Loader2 size={15} className="mr-1 animate-spin" />} {t("open")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
