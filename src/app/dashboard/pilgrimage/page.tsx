"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, Hand, Layers, PiggyBank, Trophy, UsersRound, UserRoundCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { ParticipationsTab } from "@/components/pilgrimage/participations-tab";
import { CyclesTab } from "@/components/pilgrimage/cycles-tab";
import { DecisionsTab } from "@/components/pilgrimage/decisions-tab";
import { WinnersTab } from "@/components/pilgrimage/winners-tab";
import { MudarabahTab } from "@/components/pilgrimage/mudarabah-tab";
import { ProductsTab } from "@/components/pilgrimage/products-tab";
import { usePilgrimageGroups, usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import type { PilgrimageGroup } from "@/types/pilgrimage";

const TABS = ["registrations", "cycles", "decisions", "winners", "mudarabah", "groups", "products"] as const;
type Tab = (typeof TABS)[number];
const tabIcon: Record<Tab, typeof Layers> = {
  registrations: UserRoundCheck,
  cycles: CalendarClock,
  decisions: Hand,
  winners: Trophy,
  mudarabah: PiggyBank,
  groups: UsersRound,
  products: Layers,
};

/**
 * Hajj & Umrah Equb: a savings-and-lottery product separate from the rotating
 * Equb. Members register individually and save on their own SACCO contract;
 * those who reach the eligibility threshold enter the draw, groups win
 * together, winners get Murabaha financing and the others decide what to do
 * with their savings.
 */
function PilgrimageInner() {
  const t = useTranslations("pilgrimage");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "registrations";
  const setTab = (next: string) => router.replace(`/dashboard/pilgrimage?tab=${next}`, { scroll: false });
  const { data: products } = usePilgrimageProducts();
  const [productId, setProductId] = useState("all");
  const product = productId === "all" ? undefined : productId;
  const filtered = tab === "registrations" || tab === "cycles" || tab === "groups";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={filtered && (
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allProducts")}</SelectItem>
              {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {TABS.map((k) => {
            const Icon = tabIcon[k];
            return <TabsTrigger key={k} value={k}><Icon size={14} className="mr-1.5" />{t(`tabs.${k}`)}</TabsTrigger>;
          })}
        </TabsList>
        <TabsContent value="registrations"><ParticipationsTab key={productId} productId={product} /></TabsContent>
        <TabsContent value="cycles"><CyclesTab key={productId} productId={product} /></TabsContent>
        <TabsContent value="decisions"><DecisionsTab /></TabsContent>
        <TabsContent value="winners"><WinnersTab /></TabsContent>
        <TabsContent value="mudarabah"><MudarabahTab /></TabsContent>
        <TabsContent value="groups"><GroupsTab key={productId} productId={product} emptyLabel={tc("noData")} /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/** Lottery groups, read-only for staff: members create and run them in the app. */
function GroupsTab({ productId, emptyLabel }: { productId?: string; emptyLabel: string }) {
  const t = useTranslations("pilgrimage.group");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { data, isLoading } = usePilgrimageGroups({ product_id: productId, page, limit: perPage });
  const active = (g: PilgrimageGroup) => (g.members ?? []).filter((m) => m.status === "active");
  // Only open invitations; declined, left and removed members are history.
  const invited = (g: PilgrimageGroup) => (g.members ?? []).filter((m) => m.status === "invited");
  const columns: DataTableColumn<PilgrimageGroup>[] = [
    { id: "name", header: tc("name"), mobile: "title", cell: (g) => (
      <div>
        <p className="font-medium text-foreground">{g.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{g.number}</p>
      </div>
    ) },
    { id: "members", header: t("members"), mobile: "detail", cell: (g) => (
      <span className="text-sm">{t("membersLine", { active: active(g).length, max: g.max_members, invited: invited(g).length })}</span>
    ) },
    { id: "eligible", header: t("eligibleMembers"), mobile: "detail", cell: (g) => <span className="text-sm">{active(g).filter((m) => m.eligible).length}</span> },
    { id: "admin", header: t("admin"), mobile: "detail", cell: (g) => <span className="text-sm">{(g.members ?? []).find((m) => m.role === "admin")?.member_name ?? "—"}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (g) => (
      <span className="text-xs">{g.status === "dissolved" ? t("dissolved") : g.locked ? t("locked") : t("open")}</span>
    ) },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(g) => g.id}
        isLoading={isLoading}
        emptyTitle={emptyLabel}
        emptyMessage={t("empty")}
        onRowClick={(g) => router.push(`/dashboard/pilgrimage/participations/${g.admin_participation_id}`)}
        pagination={{ page, pageSize: perPage, total: data?.meta.total ?? 0, onPageChange: setPage, onPageSizeChange: (n) => { setPerPage(n); setPage(1); } }}
      />
    </div>
  );
}

export default function PilgrimagePage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PILGRIMAGE_READ]}>
      <Suspense>
        <PilgrimageInner />
      </Suspense>
    </RequirePermission>
  );
}
