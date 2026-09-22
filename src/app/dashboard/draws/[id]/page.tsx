"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Play, ShieldCheck, Lock, Trophy, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useDraw, useRunDraw, useDrawPreview } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";

function DrawDetailInner({ id }: { id: string }) {
  const t = useTranslations("draws");
  const tc = useTranslations("common");
  const router = useRouter();
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canExecute = has(EKUB_PERMS.DRAW_EXECUTE);

  const { data: draw, isLoading } = useDraw(id);
  const run = useRunDraw();
  const { data: preview } = useDrawPreview(id, !!draw && draw.status !== "completed");

  if (isLoading || !draw) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const completed = draw.status === "completed";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {tc("back")}
      </button>

      <PageHeader
        title={`${t("liveSession")} — Round #${draw.round}`}
        subtitle={formatDateTime(draw.scheduledAt)}
        actions={<Badge className="bg-info/15 text-info">{t(("status" + draw.status.charAt(0).toUpperCase() + draw.status.slice(1)) as string)}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Session panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("liveSession")}</CardTitle>
            {draw.locked && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock size={12} /> {t("locked")}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label={t("eligibleCount")} value={draw.eligibleCount} />
              <Stat label={t("winnersCount")} value={draw.winnersPerDraw} />
              <Stat label={tc("status")} value={draw.winners.length} />
            </div>

            {!completed && preview && preview.members.length > 0 && (
              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("eligibleCount")} · {preview.eligibleCount}/{preview.totalMembers}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.members.slice(0, 24).map((m) => (
                    <span
                      key={m.memberId}
                      className={`rounded-md px-1.5 py-0.5 text-xs ${m.eligible ? "bg-success/15 text-success" : "bg-muted text-muted-foreground line-through"}`}
                    >
                      #{m.position} {m.handle}
                    </span>
                  ))}
                  {preview.members.length > 24 && <span className="text-xs text-muted-foreground">+{preview.members.length - 24}</span>}
                </div>
              </div>
            )}

            {draw.status === "postponed" && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>{draw.postponeReason || t("postponeZero")}</span>
              </div>
            )}

            {!completed ? (
              canExecute ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={run.isPending}
                  onClick={() =>
                    run.mutate(draw.id, {
                      onSuccess: (d) =>
                        toast({
                          title: d.status === "completed" ? t("winners") : t("postponed"),
                          description: d.status === "completed" ? `${d.winners.length} ${t("winners")}` : d.postponeReason,
                        }),
                      onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
                    })
                  }
                >
                  <Play size={18} className="mr-2" />
                  {run.isPending ? t("running") : t("runDraw")}
                </Button>
              ) : (
                <p className="rounded-xl bg-muted/40 p-3 text-center text-sm text-muted-foreground">{tc("noDataHint")}</p>
              )
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>{t("immutable")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RNG proof */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={18} className="text-primary" /> {t("rngProof")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {completed ? (
              <>
                <ProofRow label={t("algorithm")} value={draw.rngAlgorithm ?? "—"} />
                <ProofRow label={t("seed")} value={draw.rngSeed ?? "—"} mono />
                <p className="pt-2 text-xs text-muted-foreground">{t("verify")} · FR-4.16</p>
              </>
            ) : (
              <p className="text-muted-foreground">{tc("noDataHint")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Winners */}
      {completed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy size={18} className="text-secondary-foreground" /> {t("winners")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {draw.winners.map((w, i) => (
                <div key={w.ekubNumber} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("ekubNumber")}</p>
                    <p className="font-semibold text-foreground">{w.ekubNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProofRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "break-all font-mono text-foreground" : "font-medium text-foreground"}>{value}</p>
    </div>
  );
}

export default function DrawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.DRAW_READ]}>
      <DrawDetailInner id={id} />
    </RequirePermission>
  );
}
