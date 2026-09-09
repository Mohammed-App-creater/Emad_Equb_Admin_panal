"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "motion/react";
import {
  ShieldCheck,
  ArrowRight,
  Ticket,
  PiggyBank,
  Users,
  Trophy,
  BadgeCheck,
  Languages,
} from "lucide-react";
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// ============================================================================
// Public marketing landing page — /landingpage (bilingual EN/AM)
// Genuine CSS 3D (transform-style: preserve-3d) phone with mouse-parallax tilt,
// a floating idle animation, and a screen that cycles through the app views.
// ============================================================================

const GOLD = "hsl(38 94% 56%)";
const GREEN_DEEP = "hsl(149 74% 16%)";

/* ---- Dark language toggle (same cookie mechanism as the admin LocaleToggle) ---- */
// Module-level so the cookie write lives outside React's render analysis.
function writeLocaleCookie(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000`;
}

function DarkLocaleToggle() {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const setLocale = (l: Locale) => {
    if (l === active) return;
    writeLocaleCookie(l);
    startTransition(() => router.refresh());
  };
  return (
    <div className={cn("flex items-center rounded-full border border-white/15 bg-white/10 p-0.5 backdrop-blur", isPending && "opacity-60")} role="group" aria-label="Language">
      <Languages size={15} className="mx-1.5 text-white/60" />
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition",
            active === l ? "bg-[hsl(38_94%_56%)] text-[#0a120d]" : "text-white/60 hover:text-white"
          )}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}

/* ---- The phone screens that cycle inside the 3D device ---- */
function ScreenDashboard() {
  const t = useTranslations("landing");
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/50">{t("greeting")}</p>
          <p className="text-sm font-bold text-white">{t("appName")}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/95 p-1 shadow">
          <img src="/images/emad-small-logo.png" alt="Emad" className="h-full w-full object-contain" />
        </div>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(149_74%_25%)] to-[hsl(149_74%_16%)] p-4 text-white shadow-lg">
        <p className="text-[10px] text-white/60">{t("nextPayout")}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">200,000 Br</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/20">
          <div className="h-full w-2/3 rounded-full bg-[hsl(38_94%_56%)]" />
        </div>
        <p className="mt-1.5 text-[9px] text-white/60">{t("progress")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t("screenMembers"), value: "200", icon: Users },
          { label: t("screenCollected"), value: "3.8M", icon: PiggyBank },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/5 p-3">
            <s.icon size={14} className="text-[hsl(38_94%_56%)]" />
            <p className="mt-1.5 text-base font-bold text-white">{s.value}</p>
            <p className="text-[9px] text-white/50">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenDraw() {
  const t = useTranslations("landing");
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{t("liveDraw")}</p>
        <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[8px] font-bold text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> LIVE
        </span>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(149_74%_20%)] to-[hsl(149_74%_12%)] py-4">
        {/* concentric pulse rings */}
        {[0, 1].map((r) => (
          <motion.div
            key={r}
            className="absolute h-24 w-24 rounded-full border border-[hsl(38_94%_56%)]/30"
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: r * 1.2, ease: "easeOut" }}
          />
        ))}
        <motion.div
          className="z-10 grid h-16 w-16 place-items-center rounded-full border-2 border-[hsl(38_94%_56%)]/70 bg-[#0a120d]/40"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <Trophy size={26} className="text-[hsl(38_94%_56%)]" />
        </motion.div>

        {/* shuffling winner reel — 7 slots flickering digits */}
        <div className="z-10 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="grid h-7 w-6 place-items-center rounded-md bg-white/10 text-[11px] font-bold text-[hsl(38_94%_56%)]"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
            >
              <motion.span
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
              >
                {(i * 3 + 1) % 10}
              </motion.span>
            </motion.div>
          ))}
        </div>
        <p className="z-10 text-[10px] text-white/70">{t("selecting")}</p>
      </div>
      <div className="space-y-1.5">
        {["EK-000201", "EK-000144", "EK-000342"].map((n, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.25 }}
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
          >
            <span className="text-[11px] font-medium text-white">{n}</span>
            <BadgeCheck size={13} className="text-[hsl(149_74%_45%)]" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScreenTakaful() {
  const t = useTranslations("landing");
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <p className="text-sm font-bold text-white">{t("takaful")}</p>
      <div className="rounded-2xl border border-[hsl(38_94%_56%)]/30 bg-white/5 p-4">
        <p className="text-[10px] text-white/50">{t("mutualBalance")}</p>
        <p className="mt-1 text-2xl font-extrabold text-[hsl(38_94%_56%)]">3,820,000</p>
        <p className="text-[9px] text-white/50">{t("tabarruNote")}</p>
      </div>
      <div className="space-y-2">
        {[
          [t("jualah"), t("jualahV")],
          [t("equalSadaqah"), t("equalV")],
        ].map(([a, b]) => (
          <div key={a} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
            <span className="text-[11px] text-white">{a}</span>
            <span className="text-[10px] text-white/50">{b}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2 rounded-lg bg-[hsl(149_74%_25%)]/40 px-3 py-2">
        <ShieldCheck size={14} className="text-[hsl(149_74%_45%)]" />
        <span className="text-[10px] text-white/70">{t("zeroInterestAmanah")}</span>
      </div>
    </div>
  );
}

const SCREENS = [ScreenDashboard, ScreenDraw, ScreenTakaful];

/* ---- The 3D phone ---- */
function Phone3D() {
  const t = useTranslations("landing");
  const [screen, setScreen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-22, 22]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [16, -16]), { stiffness: 120, damping: 18 });

  useEffect(() => {
    const id = setInterval(() => setScreen((s) => (s + 1) % SCREENS.length), 3500);
    return () => clearInterval(id);
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const Screen = SCREENS[screen];

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="grid place-items-center" style={{ perspective: 1100 }}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div
          className="relative h-[560px] w-[276px] rounded-[3rem] p-3 shadow-2xl"
          style={{
            transformStyle: "preserve-3d",
            background: "linear-gradient(150deg, #1a2b22, #0c140f)",
            boxShadow: `0 40px 80px -20px ${GREEN_DEEP}, 0 0 0 2px rgba(255,255,255,0.06)`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[3rem]" style={{ boxShadow: `inset 0 1px 0 ${GOLD}55, inset 0 0 40px rgba(0,0,0,0.6)` }} />
          <div className="absolute -right-1 top-32 h-16 w-1 rounded-r bg-[#2a3b31]" style={{ transform: "translateZ(-6px)" }} />
          <div className="absolute -left-1 top-28 h-10 w-1 rounded-l bg-[#2a3b31]" style={{ transform: "translateZ(-6px)" }} />
          <div className="absolute -left-1 top-40 h-16 w-1 rounded-l bg-[#2a3b31]" style={{ transform: "translateZ(-6px)" }} />

          <div className="relative h-full w-full overflow-hidden rounded-[2.3rem] bg-[#0a120d]" style={{ transform: "translateZ(4px)" }}>
            <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black/80" />
            <div className="flex items-center justify-between px-5 pt-3 text-[9px] font-medium text-white/70">
              <span>9:41</span>
              <span>Emad</span>
            </div>
            <div className="h-[calc(100%-1.75rem)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={screen}
                  initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
                  transition={{ duration: 0.5 }}
                  className="h-full"
                >
                  <Screen />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
          </div>
        </div>

        {/* High translateZ pulls these clearly in front of the screen; strong
            shadow + solid backdrop so they read as floating above the device. */}
        <motion.div
          className="absolute -right-8 top-16 hidden rounded-2xl border border-white/20 bg-[#12211a]/95 p-3 shadow-2xl backdrop-blur-md sm:block"
          style={{ z: 90, transformStyle: "preserve-3d" }}
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Trophy size={16} className="shrink-0 text-[hsl(38_94%_56%)]" />
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold text-white">{t("cardWinners")}</p>
              <p className="whitespace-nowrap text-[8px] text-white/60">{t("cardRng")}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="absolute -left-8 bottom-28 hidden rounded-2xl border border-white/20 bg-[#12211a]/95 p-3 shadow-2xl backdrop-blur-md sm:block"
          style={{ z: 110, transformStyle: "preserve-3d" }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="shrink-0 text-[hsl(149_74%_45%)]" />
            <p className="whitespace-nowrap text-[10px] font-semibold text-white">{t("cardZero")}</p>
          </div>
        </motion.div>
      </motion.div>

      <div className="mt-8 flex gap-2">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setScreen(i)}
            className="h-2 rounded-full transition-all"
            style={{ width: i === screen ? 22 : 8, background: i === screen ? GOLD : "rgba(255,255,255,0.25)" }}
            aria-label={`Screen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const t = useTranslations("landing");

  const features = [
    { icon: Ticket, title: t("f1Title"), body: t("f1Body") },
    { icon: PiggyBank, title: t("f2Title"), body: t("f2Body") },
    { icon: ShieldCheck, title: t("f3Title"), body: t("f3Body") },
    { icon: Users, title: t("f4Title"), body: t("f4Body") },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0a120d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[hsl(149_74%_25%)]/40 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-[hsl(38_94%_56%)]/15 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/95 p-1.5 shadow">
            <img src="/images/emad-small-logo.png" alt="Emad" className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-bold">{t("appName")}</span>
        </div>
        <div className="flex items-center gap-3">
          <DarkLocaleToggle />
          <Link href="/login" className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
            {t("console")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:py-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(38_94%_56%)]/30 bg-[hsl(38_94%_56%)]/10 px-4 py-1.5 text-xs font-medium text-[hsl(38_94%_56%)]"
          >
            <ShieldCheck size={14} /> {t("badge")}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl"
          >
            <span className="block leading-[1.1]">{t("title1")}</span>
            {/* pb + looser leading so gradient-clipped descenders (g, j) aren't cut */}
            <span className="mt-1 inline-block bg-gradient-to-r from-[hsl(149_74%_45%)] to-[hsl(38_94%_56%)] bg-clip-text pb-3 leading-[1.15] text-transparent">
              {t("title2")}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-4 max-w-md text-lg text-white/70"
          >
            {t("subtitle")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link href="/login" className="group inline-flex items-center gap-2 rounded-full bg-[hsl(38_94%_56%)] px-6 py-3 font-semibold text-[#0a120d] transition hover:brightness-110">
              {t("ctaOpen")}
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              {t("ctaLearn")}
            </a>
          </motion.div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/50">
            <span><b className="text-white">200</b> {t("statMembers")}</span>
            <span><b className="text-white">7</b> {t("statWinners")}</span>
            <span><b className="text-white">10M Br</b> {t("statPayout")}</span>
          </div>
        </div>

        <div className="flex justify-center px-16 sm:px-20">
          <Phone3D />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-[hsl(38_94%_56%)]/30 hover:bg-white/10"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(149_74%_25%)]/40 text-[hsl(149_74%_55%)]">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-white/60">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[hsl(149_74%_20%)] to-[hsl(149_74%_12%)] p-10 text-center">
          <h2 className="text-3xl font-extrabold">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">{t("ctaBody")}</p>
          <Link href="/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[hsl(38_94%_56%)] px-7 py-3 font-semibold text-[#0a120d] transition hover:brightness-110">
            {t("ctaBtn")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-white/40">
        {t("footer")}
      </footer>
    </main>
  );
}
