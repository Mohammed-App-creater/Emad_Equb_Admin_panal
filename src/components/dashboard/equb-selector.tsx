"use client";

import { useEffect } from "react";
import { CircleDot } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEqubs } from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";

/**
 * Active-Equb picker for the Dashboard page. Auto-selects the first Equb once
 * loaded (and re-selects if the stored one no longer exists) so the overview
 * isn't empty on first visit.
 */
export function EqubSelector() {
  const t = useTranslations("overview");
  const { data: equbs } = useEqubs();
  const { activeGroupId, setActiveGroup } = useEqubStore();

  useEffect(() => {
    if (!equbs || equbs.length === 0) return;
    const stillExists = activeGroupId && equbs.some((e) => e.id === activeGroupId);
    if (!stillExists) setActiveGroup(equbs[0].id, equbs[0].name);
  }, [equbs, activeGroupId, setActiveGroup]);

  if (!equbs || equbs.length === 0) return null;

  return (
    <Select
      value={activeGroupId ?? undefined}
      onValueChange={(id) => {
        const e = equbs.find((x) => x.id === id);
        setActiveGroup(id, e?.name ?? null);
      }}
    >
      <SelectTrigger className="h-9 w-[220px] gap-2">
        <CircleDot size={15} className="shrink-0 text-primary" />
        <SelectValue placeholder={t("selectEqub")} />
      </SelectTrigger>
      <SelectContent>
        {equbs.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name} <span className="text-muted-foreground">· {e.code}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
