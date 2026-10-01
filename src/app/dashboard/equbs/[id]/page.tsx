"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, LayoutDashboard, UsersRound, CircleDot, Trophy, PiggyBank, Heart, Coins, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/components/auth/require-permission";
import { StatusBadge } from "@/components/equb/status-badge";
import { useEqubLifecycle } from "@/components/equb/equb-lifecycle";
import { EqubOverview } from "@/components/equb/overview-tab";
import { MembersTab } from "@/components/equb/members-tab";
import { RoundsTab } from "@/components/equb/rounds-tab";
import { ContributionsTab } from "@/components/equb/contributions-tab";
import { WinnersTab } from "@/components/equb/winners-tab";
import { TakafulTab } from "@/components/equb/takaful-tab";
import { HardshipTab } from "@/components/equb/hardship-tab";
import { AdminFeesTab } from "@/components/equb/admin-fees-tab";
import { useEqub, useEqubDashboard } from "@/hooks/ekub";
import { useLiveUpdates } from "@/lib/realtime";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { cn } from "@/lib/utils";

const TABS = ["overview", "members", "contributions", "rounds", "winners", "fees", "takaful", "hardship"] as const;
type Tab = (typeof TABS)[number];

const tabIcon: Record<Tab, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  members: UsersRound,
  contributions: Wallet,
  rounds: CircleDot,
  winners: Trophy,
  fees: Coins,
  takaful: PiggyBank,
  hardship: Heart,
};

function EqubDetailInner({ id }: { id: string }) {
  const t = useTranslations("equbs");
  const router = useRouter();
  const params = useSearchParams();
  const { has } = useEkubAccess();
  const canManage = has(EKUB_PERMS.EQUB_MANAGE) || has(EKUB_PERMS.CATEGORY_MANAGE);

  const { data: equb, isLoading, isError } = useEqub(id);
  // The dashboard endpoint has nothing to report for a draft Equb; treat a
  // failure there as "no figures yet" rather than an error.
  const dashboard = useEqubDashboard(equb && equb.status !== "draft" ? id : null);
  const lifecycle = useEqubLifecycle({ onDeleted: () => router.push("/dashboard/equbs") });
  useLiveUpdates(id);

  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "overview";
  const setTab = (next: string) => router.replace(`/dashboard/equbs/${id}?tab=${next}`, { scroll: false });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (isError || !equb) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Link href="/dashboard/equbs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> {t("backToList")}
        </Link>
        <p className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const cat = equb.category;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href="/dashboard/equbs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {t("backToList")}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{equb.name}</h2>
            <StatusBadge status={equb.status} kind="lifecycle" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{equb.code}</span>
            {cat && <> · {t("category")}: <span className="text-foreground">{cat.name}</span></>}
            {" · "}{t("membersOf", { current: equb.currentMembers, max: equb.maxMembers })}
            {" · "}{t("manager")}: <span className={equb.manager ? "text-foreground" : "italic"}>{equb.manager?.fullName ?? t("noManager")}</span>
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {lifecycle.actions.filter((a) => a.show(equb)).map((a) => {
              const Icon = a.icon;
              return (
                <Button
                  key={a.kind}
                  size="sm"
                  variant={a.kind === "activate" ? "default" : "outline"}
                  className={cn(a.destructive && "text-destructive hover:text-destructive")}
                  onClick={() => lifecycle.open(a.kind, equb)}
                >
                  <Icon size={14} className="mr-1" /> {a.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {TABS.map((k) => {
            const Icon = tabIcon[k];
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!">
                <Icon size={15} /> {t(`tab${k.charAt(0).toUpperCase()}${k.slice(1)}`)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <EqubOverview equb={equb} dashboard={dashboard.data} dashboardLoading={dashboard.isLoading} />
        </TabsContent>
        <TabsContent value="members" className="mt-4"><MembersTab equb={equb} /></TabsContent>
        <TabsContent value="contributions" className="mt-4"><ContributionsTab equb={equb} /></TabsContent>
        <TabsContent value="rounds" className="mt-4"><RoundsTab equb={equb} /></TabsContent>
        <TabsContent value="winners" className="mt-4"><WinnersTab equb={equb} /></TabsContent>
        <TabsContent value="fees" className="mt-4"><AdminFeesTab equb={equb} /></TabsContent>
        <TabsContent value="takaful" className="mt-4"><TakafulTab equb={equb} /></TabsContent>
        <TabsContent value="hardship" className="mt-4"><HardshipTab equb={equb} /></TabsContent>
      </Tabs>

      {lifecycle.modals}
    </div>
  );
}

export default function EqubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission anyOf={[EKUB_PERMS.EQUB_READ, EKUB_PERMS.CATEGORY_READ, EKUB_PERMS.APPLICATION_READ]}>
      <Suspense fallback={<div className="p-6"><Skeleton className="h-72 rounded-xl" /></div>}>
        <EqubDetailInner id={id} />
      </Suspense>
    </RequirePermission>
  );
}
