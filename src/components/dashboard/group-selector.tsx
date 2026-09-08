"use client";

import { useEffect } from "react";
import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroups } from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";

/**
 * Active-cycle picker. The group-scoped surfaces (Overview, Draws, Payouts,
 * Penalties, Takaful) read the selection from useEqubStore. Auto-selects the
 * first group once loaded so those pages aren't empty on first visit.
 */
export function GroupSelector() {
  const { data: groups } = useGroups();
  const { activeGroupId, setActiveGroup } = useEqubStore();

  useEffect(() => {
    if (!activeGroupId && groups && groups.length > 0) {
      setActiveGroup(groups[0].id, groups[0].name);
    }
  }, [groups, activeGroupId, setActiveGroup]);

  if (!groups || groups.length === 0) return null;

  return (
    <Select
      value={activeGroupId ?? undefined}
      onValueChange={(id) => {
        const g = groups.find((x) => x.id === id);
        setActiveGroup(id, g?.name ?? null);
      }}
    >
      <SelectTrigger className="h-9 w-[190px] gap-2">
        <Layers size={15} className="shrink-0 text-primary" />
        <SelectValue placeholder="Select cycle" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
