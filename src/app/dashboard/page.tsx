"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  TrendingUp,
  Ticket,
  Scale,
  ShieldCheck,
  ClipboardCheck,
  PiggyBank,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader, StatCard, TrustBadge } from "@/components/dashboard/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/ekub";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations("overview");
  const tb = useTranslations("brand");
  const { data, isLoading } = useOverview();

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<TrustBadge label={tb("tagline")} />}
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label={t("activeMembers")} value={data.activeMembers.toLocaleString()} icon={Users} tone="primary" />
            <StatCard label={t("collectionRate")} value={`${data.collectionRate}%`} icon={TrendingUp} tone="success" />
            <StatCard label={t("upcomingDraws")} value={data.upcomingDraws} icon={Ticket} tone="secondary" />
            <StatCard label={t("pendingApprovals")} value={data.pendingApprovals} icon={ClipboardCheck} tone="info" />
            <StatCard label={t("flaggedDisputes")} value={data.flaggedDisputes} icon={Scale} tone="warning" />
            <StatCard label={t("guarantorExposure")} value={formatCurrency(data.guarantorExposure)} icon={ShieldCheck} tone="destructive" />
            <StatCard label={t("takafulBalance")} value={formatCurrency(data.takafulBalance)} icon={PiggyBank} tone="primary" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("collectionsTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.collectionsTrend} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(149 74% 25%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(149 74% 25%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[80, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(149 74% 25%)" strokeWidth={2.5} fill="url(#collGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("membersByTier")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.membersByTier} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="tier" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <RTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(38 94% 56%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
