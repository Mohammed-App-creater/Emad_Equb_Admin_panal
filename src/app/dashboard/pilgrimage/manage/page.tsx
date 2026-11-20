"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Hand, LayoutDashboard, Layers, PiggyBank, Trophy, UsersRound, UserRoundCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { ParticipationsTab } from "@/components/pilgrimage/participations-tab";
import { DecisionsTab } from "@/components/pilgrimage/decisions-tab";
import { WinnersTab } from "@/components/pilgrimage/winners-tab";
import { ContributionsTab } from "@/components/pilgrimage/contributions-tab";
import { OverviewTab } from "@/components/pilgrimage/overview-tab";
import { ProductsTab } from "@/components/pilgrimage/products-tab";
import { GroupsTab } from "@/components/pilgrimage/groups-tab";
import { usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";

const TABS = ["overview", "registrations", "contributions", "winners", "decisions", "groups", "products"] as const;
type Tab = (typeof TABS)[number];
const tabIcon: Record<Tab, typeof Layers> = {
  overview: LayoutDashboard,
  registrations: UserRoundCheck,
  contributions: PiggyBank,
  winners: Trophy,
  decisions: Hand,
  groups: UsersRound,
  products: Layers,
};

/**
 * Hajj & Umrah work that spans every cycle: what needs attention, all
 * registrations, the Equb ledger (contributions and fees), every winner, the
 * queue of non-winner decisions awaiting approval, lottery groups, and
 * products and their terms.
 */
function ManageInner() {
  const t = useTranslations("pilgrimage");
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "overview";
  const setTab = (next: string) => router.replace(`/dashboard/pilgrimage/manage?tab=${next}`, { scroll: false });
  const { data: products } = usePilgrimageProducts();
  const [productId, setProductId] = useState("all");
  const product = productId === "all" ? undefined : productId;
  const filtered = tab === "overview" || tab === "registrations" || tab === "contributions" || tab === "groups";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Link href="/dashboard/pilgrimage" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {t("list.backToList")}
      </Link>
      <PageHeader
        title={t("manageTitle")}
        subtitle={t("manageSubtitle")}
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
        <TabsContent value="overview"><OverviewTab key={productId} productId={product} onOpenTab={setTab} /></TabsContent>
        <TabsContent value="registrations"><ParticipationsTab key={productId} productId={product} /></TabsContent>
        <TabsContent value="contributions"><ContributionsTab key={productId} productId={product} /></TabsContent>
        <TabsContent value="decisions"><DecisionsTab /></TabsContent>
        <TabsContent value="winners"><WinnersTab /></TabsContent>
        <TabsContent value="groups"><GroupsTab key={productId} productId={product} /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function PilgrimageManagePage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.PILGRIMAGE_READ]}>
      <Suspense>
        <ManageInner />
      </Suspense>
    </RequirePermission>
  );
}
