"use client";

import { useTranslations } from "next-intl";
import { Languages, Moon, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/shared";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export default function SettingsPage() {
  const t = useTranslations("nav");
  const tt = useTranslations("topbar");

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("settings")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages size={18} className="text-primary" /> {tt("language")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LocaleToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon size={18} className="text-primary" /> {tt("toggleTheme")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Use the theme toggle in the top bar.</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={18} className="text-primary" /> Sharia principles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="font-semibold text-foreground">Qard al-Hasan</p>
              <p className="text-muted-foreground">Benevolent loan — principal returned, never interest.</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="font-semibold text-foreground">Ujrah</p>
              <p className="text-muted-foreground">Flat service fee for administration, not a return on lending.</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="font-semibold text-foreground">Amanah</p>
              <p className="text-muted-foreground">Funds held in trust, transferred to winners without diversion.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
