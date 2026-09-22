"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const t = useTranslations("unauthorized");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX size={32} />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("message")}</p>
      <Link href="/dashboard">
        <Button variant="outline">{t("back")}</Button>
      </Link>
    </div>
  );
}
