"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Kind = "lifecycle" | "round" | "member" | "winner" | "request" | "payment";

// Tone per raw status value; anything unknown falls back to muted.
const tones: Record<Kind, Record<string, string>> = {
  lifecycle: {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/15 text-success",
    completed: "bg-info/15 text-info",
    cancelled: "bg-destructive/15 text-destructive",
  },
  round: {
    scheduled: "bg-info/15 text-info",
    open: "bg-secondary/20 text-secondary-foreground",
    drawn: "bg-success/15 text-success",
    completed: "bg-success/15 text-success",
    cancelled: "bg-destructive/15 text-destructive",
    postponed: "bg-warning/15 text-warning",
  },
  member: {
    active: "bg-success/15 text-success",
    suspended: "bg-destructive/15 text-destructive",
    at_risk: "bg-warning/15 text-warning",
  },
  winner: {
    pending: "bg-warning/15 text-warning",
    approved: "bg-info/15 text-info",
    paid: "bg-success/15 text-success",
  },
  request: {
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  },
  payment: {
    paid: "bg-success/15 text-success",
    processing: "bg-info/15 text-info",
    confirmed: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    unpaid: "bg-warning/15 text-warning",
    overdue: "bg-destructive/15 text-destructive",
  },
};

// Translation namespace + key prefix per kind ("statusActive", "statusDrawn"…).
const ns: Record<Kind, string> = {
  lifecycle: "equbs",
  round: "rounds",
  member: "members",
  winner: "payouts",
  request: "hardship",
  payment: "rounds",
};

const toKey = (status: string) =>
  "status" +
  status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

/** Localised, colour-coded status pill for every Equb entity. */
export function StatusBadge({ status, kind, className }: { status: string; kind: Kind; className?: string }) {
  const t = useTranslations(ns[kind]);
  const raw = (status || "unknown").toLowerCase();
  const key = toKey(raw);
  const label = t.has(key) ? t(key) : raw.replace(/_/g, " ");
  return (
    <Badge className={cn("whitespace-nowrap capitalize", tones[kind][raw] ?? "bg-muted text-muted-foreground", className)}>
      {label}
    </Badge>
  );
}
