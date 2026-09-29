"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Equb } from "@/types/ekub";

/** Page-level "Equb: All / one Equb" filter that every section below follows. */
export function EqubFilter({ value, onChange, equbs, loading, label, allLabel }: {
  value: string;
  onChange: (id: string) => void;
  equbs: Equb[];
  loading?: boolean;
  label: string;
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full sm:w-80">
        <span className="truncate"><span className="text-muted-foreground">{label}: </span><SelectValue /></span>
      </SelectTrigger>
      <SelectContent loading={loading} empty={!loading && equbs.length === 0}>
        <SelectItem value="all">{allLabel}</SelectItem>
        {equbs.map((e) => (
          <SelectItem key={e.id} value={e.id}>{e.name} <span className="text-muted-foreground">· {e.code}</span></SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
