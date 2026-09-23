"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleDot, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, TrustBadge } from "@/components/dashboard/shared";
import { EqubOverview } from "@/components/equb/overview-tab";
import { StatusBadge } from "@/components/equb/status-badge";
import { useEqubs, useEqubDashboard } from "@/hooks/ekub";
import { useEqubStore } from "@/store/equb.store";

/**
 * Dashboard: the live admin-dashboard of the Equb picked in the top bar. The
 * backend only exposes per-Equb figures, so there is no cross-Equb roll-up.
 */
export default function DashboardPage() {
  const t = useTranslations("overview");
  const te = useTranslations("equbs");
  const tb = useTranslations("brand");
  const router = useRouter();
  const activeId = useEqubStore((s) => s.activeGroupId);
  const { data: equbs, isLoading } = useEqubs();
  const equb = equbs?.find((e) => e.id === activeId) ?? equbs?.[0];
  const dashboard = useEqubDashboard(equb && equb.status !== "draft" ? equb.id : null);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<TrustBadge label={tb("tagline")} />}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      ) : !equb ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <CircleDot size={28} className="text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("noEqubs")}</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/equbs")}>{te("title")}</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CircleDot size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-bold text-foreground">{equb.name}</p>
                  <StatusBadge status={equb.status} kind="lifecycle" />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{equb.code}</span>{equb.category ? ` · ${equb.category.name}` : ""}
                </p>
              </div>
            </div>
            <Button onClick={() => router.push(`/dashboard/equbs/${equb.id}`)}>
              {t("openEqub")} <ArrowRight size={15} className="ml-1" />
            </Button>
          </div>

          {dashboard.isError && (
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <Info size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{te("noDashboard")}</span>
            </div>
          )}

          <EqubOverview equb={equb} dashboard={dashboard.data} dashboardLoading={dashboard.isLoading} />
        </>
      )}
    </div>
  );
}
