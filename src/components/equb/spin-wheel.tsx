"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WheelEntry {
  id: string;
  /** Full name, shown on the wheel when there are few slices and under the pointer. */
  label: string;
  /** Compact tag (e.g. "#12") used on the slices when there are many. */
  short: string;
}

// Slice colours cycle through theme tokens; the text colour is picked per fill.
const FILLS = [
  { fill: "hsl(var(--primary))", text: "#fff" },
  { fill: "hsl(var(--secondary))", text: "#1f1500" },
  { fill: "hsl(var(--info))", text: "#fff" },
];
const R = 100;
const mod = (a: number, m: number) => ((a % m) + m) % m;
// Angles are clockwise from 12 o'clock, matching the pointer at the top.
const pt = (deg: number, r = R) => {
  const rad = (deg * Math.PI) / 180;
  return `${(r * Math.sin(rad)).toFixed(2)} ${(-r * Math.cos(rad)).toFixed(2)}`;
};
const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);

/**
 * Lottery wheel for the round draw. It is presentation only: the backend's
 * RNG picks the winners. While `winners` is null and `spinning` is on the
 * wheel spins freely (the draw request is in flight); once the result arrives
 * it slows down and stops on each winner in turn, then calls `onDone`.
 * With `spinning` off and no winners it just sits still (before the draw).
 * `highlighted` marks winners already known, e.g. a round drawn earlier.
 */
export function SpinWheel({
  entries,
  winners,
  onDone,
  revealedLabel,
  spinning = true,
  highlighted,
  className,
}: {
  entries: WheelEntry[];
  winners: string[] | null;
  onDone?: () => void;
  revealedLabel: string;
  spinning?: boolean;
  highlighted?: string[];
  className?: string;
}) {
  const n = Math.max(entries.length, 1);
  const seg = 360 / n;
  const wheelRef = useRef<SVGGElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const rot = useRef(0);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  const [revealed, setRevealed] = useState<string[]>(highlighted ?? []);
  const [landing, setLanding] = useState<string | null>(null);

  const apply = () => {
    wheelRef.current?.setAttribute("transform", `rotate(${rot.current})`);
    const idx = Math.floor(mod(-rot.current, 360) / seg) % n;
    if (readoutRef.current) readoutRef.current.textContent = entries[idx]?.label ?? "";
  };

  // Free spin while waiting for the backend.
  useEffect(() => {
    if (winners || !spinning) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      rot.current += ((now - last) / 1000) * (reduce ? 40 : 540);
      last = now;
      apply();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winners, spinning, n]);

  // Land on each winner in turn. Keyed by ids so a re-created array doesn't restart it.
  const winnersKey = winners?.join(",") ?? null;
  useEffect(() => {
    if (!winners) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let raf = 0;
    const spinTo = (idx: number) =>
      new Promise<void>((resolve) => {
        const from = rot.current;
        // Small random offset inside the slice so it doesn't always stop dead centre.
        const a = idx * seg + seg * (0.3 + Math.random() * 0.4);
        const to = from + (reduce ? 0 : 360 * 5) + mod(-a - from, 360);
        const ms = reduce ? 400 : 5200;
        const t0 = performance.now();
        const step = (now: number) => {
          if (cancelled) return resolve();
          const p = Math.min(1, (now - t0) / ms);
          rot.current = from + (to - from) * easeOut(p);
          apply();
          if (p < 1) raf = requestAnimationFrame(step);
          else resolve();
        };
        raf = requestAnimationFrame(step);
      });
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (const id of winners) {
        const idx = entries.findIndex((e) => e.id === id);
        if (idx < 0) continue;
        setLanding(null);
        await spinTo(idx);
        if (cancelled) return;
        setLanding(id);
        setRevealed((r) => [...r, id]);
        await wait(reduce ? 400 : 1600);
        if (cancelled) return;
      }
      doneRef.current?.();
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnersKey]);

  // Few slices: names across the slice. Many (up to ~250): turn numbers along the rim, sized to the slice.
  const text = n <= 16 ? "label" : n <= 260 ? "short" : null;
  const fontSize = n <= 8 ? 9 : n <= 16 ? 7 : Math.max(2.4, Math.min(6, ((2 * Math.PI * R * 0.9) / n) * 0.8));
  const maxChars = n <= 8 ? 16 : 12;
  const byId = new Map(entries.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn("relative w-full", className ?? "max-w-[340px]")}>
        <svg viewBox="-112 -118 224 230" className="h-auto w-full drop-shadow-xl" role="img" aria-label="Draw wheel">
          <circle r={R + 8} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={2} />
          <g ref={wheelRef}>
            {n === 1 ? (
              <circle r={R} fill={FILLS[0].fill} />
            ) : (
              entries.map((e, i) => {
                const a0 = i * seg;
                const a1 = a0 + seg;
                const c = FILLS[(n % 3 === 1 && i === n - 1 ? 1 : i) % 3];
                const won = revealed.includes(e.id);
                return (
                  <path
                    key={e.id}
                    d={`M0 0 L${pt(a0)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${pt(a1)} Z`}
                    fill={won ? "hsl(var(--secondary))" : c.fill}
                    fillOpacity={revealed.length && !won ? 0.55 : 1}
                    stroke="hsl(var(--card))"
                    strokeWidth={n > 120 ? 0.15 : n > 60 ? 0.3 : 0.8}
                  />
                );
              })
            )}
            {text &&
              entries.map((e, i) => {
                const mid = i * seg + seg / 2;
                const c = FILLS[(n % 3 === 1 && i === n - 1 ? 1 : i) % 3];
                const raw = text === "label" ? e.label : e.short;
                const label = text === "label" && raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw;
                return (
                  <text
                    key={`t-${e.id}`}
                    transform={`rotate(${mid - 90}) translate(${text === "label" ? R * 0.6 : R * 0.95} 0)`}
                    textAnchor={text === "label" ? "middle" : "end"}
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight={600}
                    fill={revealed.includes(e.id) ? FILLS[1].text : c.text}
                  >
                    {label}
                  </text>
                );
              })}
          </g>
          {/* Hub */}
          <circle r={16} fill="hsl(var(--card))" stroke="hsl(var(--secondary))" strokeWidth={3} />
          <circle r={6} fill="hsl(var(--secondary))" />
          {/* Pointer */}
          <polygon points="-9,-117 9,-117 0,-95" fill="hsl(var(--destructive))" stroke="hsl(var(--card))" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      </div>

      <div className={cn("min-h-[3.25rem] w-full max-w-sm rounded-xl border px-4 py-2 text-center transition-colors", landing ? "border-secondary bg-secondary/15" : "border-border bg-muted/40")}>
        {landing ? (
          <p className="flex items-center justify-center gap-2 text-lg font-bold text-foreground">
            <Trophy size={20} className="text-secondary-foreground" /> {byId.get(landing)?.label}
          </p>
        ) : (
          <span ref={readoutRef} className="block truncate text-base font-medium text-muted-foreground" />
        )}
      </div>

      {revealed.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-secondary-foreground">{revealedLabel} · {revealed.length}{winners ? ` / ${winners.length}` : ""}</p>
          <ol className="flex flex-wrap justify-center gap-1.5">
            {revealed.map((id, i) => (
              <li key={id} className="flex items-center gap-1.5 rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-medium text-foreground">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">{i + 1}</span>
                {byId.get(id)?.label}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
