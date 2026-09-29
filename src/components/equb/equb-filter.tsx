"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import type { Equb, Round } from "@/types/ekub";

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

/** Page-level "Round: All / one round" filter. Rounds belong to one Equb, so it is disabled until an Equb is picked. */
export function RoundFilter({ value, onChange, rounds, loading, disabled, label, allLabel }: {
  value: string;
  onChange: (id: string) => void;
  rounds: Round[];
  loading?: boolean;
  disabled?: boolean;
  label: string;
  allLabel: string;
}) {
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-10 w-full sm:w-52">
        <span className="truncate"><span className="text-muted-foreground">{label}: </span><SelectValue /></span>
      </SelectTrigger>
      <SelectContent loading={loading} empty={!loading && !disabled && rounds.length === 0}>
        <SelectItem value="all">{allLabel}</SelectItem>
        {sorted.map((r) => (
          <SelectItem key={r.id} value={r.id}>#{r.roundNumber} <span className="text-muted-foreground">· {formatDate(r.contributionDueDate)}</span></SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
