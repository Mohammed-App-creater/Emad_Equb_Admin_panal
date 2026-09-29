"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "cards" | "table";

/** Cards / table choice for a list page, remembered per page in this browser. */
const listeners = new Set<() => void>();
const memory = new Map<string, ViewMode>();
const read = (key: string, initial: ViewMode): ViewMode => {
  try {
    const v = window.localStorage.getItem(`view:${key}`);
    if (v === "cards" || v === "table") return v;
  } catch {
    /* storage unavailable */
  }
  return memory.get(key) ?? initial;
};
export function useViewMode(key: string, initial: ViewMode): [ViewMode, (v: ViewMode) => void] {
  // The server renders the default; the browser swaps in the saved choice after hydration.
  const mode = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => read(key, initial),
    () => initial
  );
  const set = (v: ViewMode) => {
    memory.set(key, v);
    try {
      window.localStorage.setItem(`view:${key}`, v);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };
  return [mode, set];
}

export function ViewToggle({ value, onChange, className }: { value: ViewMode; onChange: (v: ViewMode) => void; className?: string }) {
  const t = useTranslations("common");
  const options: { value: ViewMode; label: string; icon: typeof List }[] = [
    { value: "cards", label: t("viewCards"), icon: LayoutGrid },
    { value: "table", label: t("viewTable"), icon: List },
  ];
  return (
    <div role="group" aria-label={t("view")} className={cn("inline-flex h-10 shrink-0 rounded-md border border-input bg-background p-1", className)}>
      {options.map((o) => {
        const Icon = o.icon;
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cn("inline-flex items-center gap-1.5 rounded-sm px-2.5 text-sm transition", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
          >
            <Icon size={15} /> <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
