"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Info, Loader2, Maximize2, Minimize2, Play, Search, ShieldCheck, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { SpinWheel, type WheelEntry } from "@/components/equb/spin-wheel";
import { WinnerList, exclusionReason, toWinnerRows, withWinners, type WheelState } from "@/components/equb/draw-parts";
import { useLiveUpdates, eventRoundId } from "@/lib/realtime";
import { useEqub, useRound, useDrawPreview, useExecuteDraw, useRoundWinners } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { cn, getErrorMessage, humanizeDates } from "@/lib/utils";
import type { ExcludedMember, Round } from "@/types/ekub";

/**
 * The round draw on its own page: a full-size lottery wheel (an Equb can have
 * ~200 members, too many for a modal) next to the searchable list of who is
 * in the draw and who is excluded. The backend's RNG picks the winners; the
 * wheel only animates to them. Can go full screen for showing on a projector.
 */
function DrawInner({ equbId, roundId }: { equbId: string; roundId: string }) {
  const t = useTranslations("rounds");
  const router = useRouter();
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canExecute = has(EKUB_PERMS.DRAW_EXECUTE);

  const { data: equb } = useEqub(equbId);
  const { data: round, isLoading, isError, isFetching } = useRound(roundId);
  const drawn = !!round && (round.status === "drawn" || round.status === "completed" || round.winners.length > 0);
  const { data: preview, isLoading: previewLoading } = useDrawPreview(roundId, !!round && !drawn);
  const { data: winners, isLoading: winnersLoading } = useRoundWinners(roundId, round?.roundNumber, drawn);
  const execute = useExecuteDraw();

  const [confirming, setConfirming] = useState(false);
  const [wheel, setWheel] = useState<WheelState | null>(null);
  const [liveDone, setLiveDone] = useState(false);
  const [tab, setTab] = useState<"eligible" | "excluded">("eligible");
  const [search, setSearch] = useState("");

  // Full screen for the projector.
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen())?.catch(() => undefined);

  const names = new Map((round?.memberPayments ?? []).map((p) => [p.memberId, p]));
  const withName = <M extends { memberId: string; name: string; phone: string }>(m: M): M => ({ ...m, name: m.name || names.get(m.memberId)?.name || "—", phone: m.phone || names.get(m.memberId)?.phone || "" });
  const eligible = (preview?.eligible ?? []).map(withName);
  const excluded: ExcludedMember[] = (preview?.excluded ?? []).map(withName);
  const toEntry = (m: { memberId: string; name: string; position?: number }): WheelEntry => ({ id: m.memberId, label: m.name || "—", short: m.position ? `#${m.position}` : (m.name || "—").slice(0, 3) });
  // Before the draw the slices are the eligible members; for a round drawn earlier, everyone in the round.
  const staticEntries: WheelEntry[] = drawn ? (round?.memberPayments ?? []).map((p, i) => toEntry({ memberId: p.memberId, name: p.name, position: i + 1 })) : eligible.map(toEntry);

  useLiveUpdates(equbId, (e) => {
    const rid = eventRoundId(e);
    if (rid && rid !== roundId) return;
    if (e.type === "equb.draw.started") { setLiveDone(false); setWheel((w) => w ?? { entries: staticEntries, winners: null }); }
    // Winners arrive with the round refetch the live layer triggers.
    else if (e.type === "equb.draw.completed") setLiveDone(true);
    else if (e.type === "equb.draw.failed") { setWheel(null); toast({ title: t("drawFailed"), description: String(e.data.reason ?? e.data.message ?? ""), variant: "destructive" }); }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]"><Skeleton className="aspect-square max-h-[640px] rounded-full" /><Skeleton className="h-96 rounded-xl" /></div>
      </div>
    );
  }
  if (isError || !round) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Link href={`/dashboard/equbs/${equbId}?tab=rounds`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> {t("backToEqub")}</Link>
        <p className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  // Whether a draw can run is the backend's call alone (draw-preview's can_execute_draw).
  const canDraw = preview?.canExecute === true;
  const blockReason = humanizeDates(canDraw ? "" : preview?.reason || round.notReadyReason || "");
  const winnerRows = toWinnerRows(winners, round);
  const perRound = preview?.winnersPerRound ?? equb?.effectiveTerms?.winnersPerRound ?? "";
  // A draw run elsewhere: land on its winners once the refetched round has them.
  const shownWheel = wheel && !wheel.winners && liveDone && round.winners.length ? withWinners(wheel, round.winners) : wheel;
  const animating = !!shownWheel && !shownWheel.finished;
  const showResults = drawn && !animating;

  const runDraw = () => {
    setConfirming(false);
    setWheel({ entries: staticEntries, winners: null });
    execute.mutate(
      { roundId, equbId },
      {
        // No toast: the wheel reveals the winners.
        onSuccess: (r: Round) => setWheel((w) => (w && !w.winners ? withWinners(w, r.winners) : w)),
        onError: (e) => { setWheel(null); toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" }); },
      }
    );
  };
  const finish = () => setWheel((w) => (w ? { ...w, finished: true } : w));

  const q = search.trim().toLowerCase();
  const match = (name: string, phone: string) => !q || name.toLowerCase().includes(q) || phone.includes(q);
  const eligibleShown = eligible.filter((m) => match(m.name, m.phone));
  const excludedShown = excluded.filter((m) => match(m.name, m.phone));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Link href={`/dashboard/equbs/${equbId}/rounds/${roundId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {t("backToRound")}
      </Link>

      <div ref={stageRef} className={cn("space-y-4", fullscreen && "overflow-y-auto bg-background p-6")}>
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">{t("draw")} · {t("roundNo", { n: round.roundNumber })}</h2>
              <StatusBadge status={round.status} kind="round" />
            </div>
            {equb && <p className="mt-1 text-sm text-muted-foreground">{equb.name} · {equb.code}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 size={15} className="mr-1" /> : <Maximize2 size={15} className="mr-1" />} {fullscreen ? t("exitFullscreen") : t("fullscreen")}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Stage: the wheel */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <p className="min-h-5 text-center text-sm text-muted-foreground">
              {animating
                ? shownWheel!.winners ? t("wheelLanding", { count: shownWheel!.winners.length }) : t("runningHint", { count: shownWheel!.entries.length, winners: perRound })
                : showResults ? t("drawResultHint", { n: round.roundNumber })
                : t("drawStageHint", { count: eligible.length, winners: perRound })}
            </p>
            {shownWheel ? (
              <SpinWheel key="live" entries={shownWheel.entries} winners={shownWheel.winners} revealedLabel={t("winners")} onDone={finish} className={fullscreen ? "max-w-[min(78vh,820px)]" : "max-w-[min(70vh,640px)]"} />
            ) : previewLoading && !drawn ? (
              <Skeleton className="aspect-square w-full max-w-[min(70vh,640px)] rounded-full" />
            ) : staticEntries.length ? (
              <SpinWheel
                key={drawn ? "drawn" : "ready"}
                entries={staticEntries}
                winners={null}
                spinning={false}
                highlighted={drawn ? round.winners.map((w) => w.memberId) : undefined}
                revealedLabel={t("winners")}
                className={fullscreen ? "max-w-[min(78vh,820px)]" : "max-w-[min(70vh,640px)]"}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t("noneEligible")}</p>
            )}

            {animating && shownWheel!.winners && (
              <Button variant="ghost" size="sm" onClick={finish}>{t("skipAnimation")}</Button>
            )}
            {!drawn && !animating && (
              canExecute ? (
                <Button size="lg" className="h-14 w-full max-w-sm text-lg" disabled={!canDraw || execute.isPending} onClick={() => setConfirming(true)}>
                  {execute.isPending ? <Loader2 size={22} className="mr-2 animate-spin" /> : <Play size={22} className="mr-2" />} {t("runDraw")}
                </Button>
              ) : (
                <p className="rounded-xl bg-muted/40 p-3 text-center text-sm text-muted-foreground">{t("noDrawPermission")}</p>
              )
            )}
          </div>

          {/* Side panel: readiness + members, or the result */}
          <div className="space-y-4">
            {showResults ? (
              <>
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 p-4 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/25 text-secondary-foreground"><Trophy size={24} /></span>
                  <p className="text-lg font-semibold text-foreground">{t("drawDone")}</p>
                </div>
                <WinnerList title={`${t("winners")} · ${winnerRows.length}`} rows={winnerRows} loading={!winnerRows.length && (winnersLoading || isFetching)} empty={t("noWinnersYet")} />
                <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" /> <span>{t("immutable")}</span>
                </div>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/equbs/${equbId}/rounds/${roundId}`)}>{t("manageWinners")}</Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-success/10 p-3">
                    <p className="text-2xl font-bold text-success">{preview?.eligibleCount ?? eligible.length}</p>
                    <p className="text-xs text-muted-foreground">{t("eligible")}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <p className="text-2xl font-bold text-foreground">{preview?.excludedCount ?? round.excludedCount}</p>
                    <p className="text-xs text-muted-foreground">{t("excluded")}</p>
                  </div>
                </div>
                {previewLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin text-primary" /> {t("checkingEligibility")}</div>
                ) : (
                  <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm", canDraw ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning")}>
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <span>{canDraw ? t("canDraw") : `${t("cannotDraw")}${blockReason ? ` — ${blockReason}` : ""}`}</span>
                  </div>
                )}

                <div className="rounded-xl border border-border">
                  <div className="flex gap-1 border-b border-border p-1.5">
                    {(["eligible", "excluded"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition", tab === k ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}
                      >
                        {k === "eligible" ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {k === "eligible" ? t("drawEligibleList") : t("drawExcludedList")}
                        <Badge className="ml-1 bg-muted px-1.5 py-0 text-[11px] text-foreground">{k === "eligible" ? eligible.length : excluded.length}</Badge>
                      </button>
                    ))}
                  </div>
                  <div className="relative border-b border-border p-2">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-9 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchMembers")} />
                  </div>
                  <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
                    {tab === "eligible" ? (
                      eligibleShown.length === 0 ? (
                        <li className="px-3 py-4 text-center text-sm text-muted-foreground">{eligible.length ? tc("noData") : t("noneEligible")}</li>
                      ) : (
                        eligibleShown.map((m) => (
                          <li key={m.memberId} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{m.position ? `#${m.position}` : ""}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{m.name}</span>
                            {m.phone && <span className="shrink-0 text-xs text-muted-foreground">{m.phone}</span>}
                          </li>
                        ))
                      )
                    ) : excludedShown.length === 0 ? (
                      <li className="px-3 py-4 text-center text-sm text-muted-foreground">{excluded.length ? tc("noData") : t("noneExcluded")}</li>
                    ) : (
                      excludedShown.map((m) => (
                        <li key={m.memberId} className="px-3 py-2 text-sm">
                          <p className="truncate text-foreground">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{exclusionReason(m, t) || t("unpaidContribution")}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm */}
      <Modal open={confirming} onOpenChange={setConfirming} title={`${t("runDraw")} · ${t("roundNo", { n: round.roundNumber })}`} className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-foreground">{t("confirmDraw", { n: round.roundNumber })}</p>
          <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{t("drawStageHint", { count: eligible.length, winners: perRound })}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>{tc("cancel")}</Button>
            <Button disabled={!canDraw || execute.isPending} onClick={runDraw}><Play size={14} className="mr-1" /> {t("runDraw")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function DrawPage({ params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.DRAW_READ, EKUB_PERMS.EQUB_READ]}>
      <DrawInner equbId={id} roundId={roundId} />
    </RequirePermission>
  );
}
