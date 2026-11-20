"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Hand, Layers, PiggyBank, Settings2, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { CycleList } from "@/components/pilgrimage/cycle-list";
import { KindIcon } from "@/components/pilgrimage/shared";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";
import type { PilgrimageKind } from "@/types/pilgrimage";

const KINDS: PilgrimageKind[] = ["hajj", "umrah"];

/**
 * Hajj & Umrah Equb: one tab per pilgrimage, each listing its Equbs (one per
 * product per year) like the Equbs page. Tools that span every cycle —
 * products, all registrations, the decision queue, Mudarabah — sit under
 * "Manage".
 */
function PilgrimageInner() {
  const t = useTranslations("pilgrimage");
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("kind") as PilgrimageKind | null;
  const kind: PilgrimageKind = requested && KINDS.includes(requested) ? requested : "hajj";
  const setKind = (next: string) => router.replace(`/dashboard/pilgrimage?kind=${next}`, { scroll: false });
  const manage = [
    { tab: "registrations", icon: UserRoundCheck },
    { tab: "decisions", icon: Hand },
    { tab: "mudarabah", icon: PiggyBank },
    { tab: "products", icon: Layers },
  ] as const;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Settings2 size={15} className="mr-1" /> {t("manage")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {manage.map(({ tab, icon: Icon }) => (
                <DropdownMenuItem key={tab} asChild>
                  <Link href={`/dashboard/pilgrimage/manage?tab=${tab}`}><Icon className="mr-2 h-4 w-4" /> {t(`tabs.${tab}`)}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <Tabs value={kind} onValueChange={setKind}>
        <TabsList className="h-auto p-1">
          {KINDS.map((k) => (
            <TabsTrigger key={k} value={k} className="gap-2 px-5 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!">
              <KindIcon kind={k} size={22} /> {t(`list.kind_${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {KINDS.map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <CycleList kind={k} />
          </TabsContent>
        ))}
      </Tabs>
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
