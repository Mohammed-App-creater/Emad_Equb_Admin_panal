"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Hand, Layers, PiggyBank, Trophy, UsersRound, UserRoundCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { ParticipationsTab } from "@/components/pilgrimage/participations-tab";
import { DecisionsTab } from "@/components/pilgrimage/decisions-tab";
import { WinnersTab } from "@/components/pilgrimage/winners-tab";
import { MudarabahTab } from "@/components/pilgrimage/mudarabah-tab";
import { ProductsTab } from "@/components/pilgrimage/products-tab";
import { GroupsTab } from "@/components/pilgrimage/groups-tab";
import { usePilgrimageProducts } from "@/hooks/pilgrimage";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";

const TABS = ["registrations", "decisions", "winners", "mudarabah", "groups", "products"] as const;
type Tab = (typeof TABS)[number];
const tabIcon: Record<Tab, typeof Layers> = {
  registrations: UserRoundCheck,
  decisions: Hand,
  winners: Trophy,
  mudarabah: PiggyBank,
  groups: UsersRound,
  products: Layers,
};

/**
 * Hajj & Umrah work that spans every cycle: products and their terms, all
 * registrations, the queue of non-winner decisions awaiting approval, every
 * winner, Mudarabah investments and lottery groups.
 */
function ManageInner() {
  const t = useTranslations("pilgrimage");
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "registrations";
  const setTab = (next: string) => router.replace(`/dashboard/pilgrimage/manage?tab=${next}`, { scroll: false });
  const { data: products } = usePilgrimageProducts();
  const [productId, setProductId] = useState("all");
  const product = productId === "all" ? undefined : productId;
  const filtered = tab === "registrations" || tab === "groups";

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
        <TabsContent value="registrations"><ParticipationsTab key={productId} productId={product} /></TabsContent>
        <TabsContent value="decisions"><DecisionsTab /></TabsContent>
        <TabsContent value="winners"><WinnersTab /></TabsContent>
        <TabsContent value="mudarabah"><MudarabahTab /></TabsContent>
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
