"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  motion,
  animate,
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
  Download,
  Bell,
  Home,
  Receipt,
  BarChart3,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Hand,
  ChevronDown,
  HandCoins,
  Scale,
  Landmark,
  Smartphone,
} from "lucide-react";
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// ============================================================================
// Public marketing landing page — /landingpage (bilingual EN/AM)
// Genuine CSS 3D (transform-style: preserve-3d) phones: mouse-parallax hero
// device with a cycling screen, plus three tilted member-app devices. Ambient
// aurora + particles, scroll reveals, count-up stats, animated borders.
// ============================================================================

const GOLD = "hsl(38 94% 56%)";
const GREEN = "hsl(149 74% 45%)";
const GREEN_DEEP = "hsl(149 74% 16%)";
// Replace with the real Play Store / APK URL when available.
const APP_DOWNLOAD_URL = "#";

/* ============================================================================
   Ambient atmosphere
============================================================================ */

// Deterministic (index-based) positions — no Math.random in render, so the
// server and client markup match and there's no hydration mismatch.
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.7,
  dur: 7 + (i % 6),
  gold: i % 3 === 0,
}));

function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* drifting colour fields */}
      <motion.div
        className="absolute -left-48 -top-32 h-[620px] w-[620px] rounded-full blur-[130px]"
        style={{ background: "hsl(149 74% 28% / 0.45)" }}
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-56 top-24 h-[640px] w-[640px] rounded-full blur-[140px]"
        style={{ background: "hsl(38 94% 56% / 0.16)" }}
        animate={{ x: [0, -70, 20, 0], y: [0, 60, -30, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-200px] left-1/3 h-[560px] w-[560px] rounded-full blur-[140px]"
        style={{ background: "hsl(160 70% 30% / 0.28)" }}
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 30, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* fine dot grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.gold ? GOLD : GREEN,
            boxShadow: `0 0 ${p.size * 4}px ${p.gold ? GOLD : GREEN}`,
          }}
          animate={{ y: [0, -34, 0], opacity: [0.15, 0.75, 0.15] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
      {/* vignette so content stays legible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,18,13,0.7)_100%)]" />
    </div>
  );
}

/* Diagonal reflection that sweeps across a phone screen every few seconds. */
function Shine({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-y-[-20%] w-[45%] rotate-12"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.08) 55%, transparent 100%)",
      }}
      initial={{ x: "-160%" }}
      animate={{ x: ["-160%", "320%"] }}
      transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 4.5, delay, ease: "easeInOut" }}
    />
  );
}

/* Count-up number for the hero stats. */
function CountUp({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const mv = useMotionValue(0);
  const [text, setText] = useState("0");
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.8, ease: "easeOut", delay: 0.3 });
    const unsub = mv.on("change", (v) => setText(v.toFixed(decimals)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [mv, to, decimals]);
  return (
    <span>
      {text}
      {suffix}
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      className="mx-auto max-w-2xl text-center"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(38_94%_56%)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(38_94%_56%)]" />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-white/60 sm:text-lg">{subtitle}</p>}
      <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(38_94%_56%)] to-transparent" />
    </motion.div>
  );
}

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
    <div
      className={cn("flex items-center rounded-full border border-white/15 bg-white/10 p-0.5 backdrop-blur", isPending && "opacity-60")}
      role="group"
      aria-label="Language"
    >
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

/* ============================================================================
   Hero phone — cycling admin screens
============================================================================ */
function ScreenDashboard() {
  const t = useTranslations("landing");
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/50">{t("greeting")}</p>
          <p className="text-sm font-bold text-white">{t("appName")}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/95 p-1 shadow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/emad-small-logo.png" alt="Emad" className="h-full w-full object-contain" />
        </div>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(149_74%_25%)] to-[hsl(149_74%_16%)] p-4 text-white shadow-lg">
        <p className="text-[10px] text-white/60">{t("nextPayout")}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">200,000 Br</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-[hsl(38_94%_56%)]"
            initial={{ width: 0 }}
            animate={{ width: "66%" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
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
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
        </span>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(149_74%_20%)] to-[hsl(149_74%_12%)] py-4">
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
        <div className="z-10 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="grid h-7 w-6 place-items-center rounded-md bg-white/10 text-[11px] font-bold text-[hsl(38_94%_56%)]"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
            >
              <motion.span animate={{ y: [-2, 2, -2] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}>
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

/* Shared device chassis — metallic gradient shell, gold rim, side keys, recessed
   glass screen with a passing reflection. Used by the hero and how-to phones. */
function Chassis({
  children,
  width,
  height,
  radius = "3rem",
  shineDelay = 0,
  statusRight = "Emad",
}: {
  children: ReactNode;
  width: number;
  height: number;
  radius?: string;
  shineDelay?: number;
  statusRight?: string;
}) {
  return (
    <div
      className="relative p-3"
      style={{
        width,
        height,
        borderRadius: radius,
        transformStyle: "preserve-3d",
        background: "linear-gradient(150deg, #24382d 0%, #16241c 40%, #0b120e 100%)",
        boxShadow: `0 50px 90px -24px ${GREEN_DEEP}, 0 0 0 1.5px rgba(255,255,255,0.08), 0 0 60px -10px hsl(149 74% 30% / 0.35)`,
      }}
    >
      {/* metallic edge highlight + gold hairline */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          boxShadow: `inset 0 1px 0 ${GOLD}66, inset 0 -1px 0 rgba(255,255,255,0.05), inset 1px 0 0 rgba(255,255,255,0.05), inset 0 0 44px rgba(0,0,0,0.65)`,
        }}
      />
      {/* side keys */}
      <div className="absolute -right-1 top-[22%] h-16 w-1 rounded-r bg-[#2f4438]" style={{ transform: "translateZ(-6px)" }} />
      <div className="absolute -left-1 top-[19%] h-10 w-1 rounded-l bg-[#2f4438]" style={{ transform: "translateZ(-6px)" }} />
      <div className="absolute -left-1 top-[28%] h-16 w-1 rounded-l bg-[#2f4438]" style={{ transform: "translateZ(-6px)" }} />

      {/* screen */}
      <div
        className="relative h-full w-full overflow-hidden bg-[#0a120d]"
        style={{ borderRadius: `calc(${radius} - 0.7rem)`, transform: "translateZ(4px)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.9)" }}
      >
        <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black/85" />
        <div className="flex items-center justify-between px-5 pt-3 text-[9px] font-medium text-white/70">
          <span>9:41</span>
          <span>{statusRight}</span>
        </div>
        <div className="mt-2 h-[calc(100%-2.25rem)]">{children}</div>
        {/* glass */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.09]" />
        <Shine delay={shineDelay} />
      </div>
    </div>
  );
}

function Phone3D() {
  const t = useTranslations("landing");
  const [screen, setScreen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-24, 24]), { stiffness: 110, damping: 16 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [18, -18]), { stiffness: 110, damping: 16 });
  // glow follows the tilt slightly for a lit-from-behind feel
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], [-40, 40]), { stiffness: 80, damping: 20 });
  const glowY = useSpring(useTransform(my, [-0.5, 0.5], [-30, 30]), { stiffness: 80, damping: 20 });

  useEffect(() => {
    const id = setInterval(() => setScreen((s) => (s + 1) % SCREENS.length), 3800);
    return () => clearInterval(id);
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const Screen = SCREENS[screen];

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="relative grid place-items-center py-6" style={{ perspective: 1200 }}>
      {/* back glow that tracks the tilt */}
      <motion.div
        className="pointer-events-none absolute h-[520px] w-[520px] rounded-full blur-[90px]"
        style={{ x: glowX, y: glowY, background: "radial-gradient(circle, hsl(149 74% 40% / 0.55) 0%, hsl(38 94% 56% / 0.18) 45%, transparent 70%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* orbit rings */}
      <motion.div
        className="pointer-events-none absolute h-[640px] w-[640px] rounded-full border border-dashed border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(38_94%_56%)] shadow-[0_0_18px_hsl(38_94%_56%)]" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute h-[520px] w-[520px] rounded-full border border-white/[0.06]"
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-[hsl(149_74%_55%)] shadow-[0_0_14px_hsl(149_74%_55%)]" />
      </motion.div>

      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <Chassis width={284} height={576}>
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
        </Chassis>

        {/* floating badges — Motion's `z` composes with the animated `y`, so
            the depth actually holds and they render in front of the screen */}
        <motion.div
          className="absolute -right-10 top-14 hidden rounded-2xl border border-white/20 bg-[#12211a]/95 p-3 shadow-2xl backdrop-blur-md sm:block"
          style={{ z: 100, transformStyle: "preserve-3d" }}
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(38_94%_56%)]/15">
              <Trophy size={16} className="text-[hsl(38_94%_56%)]" />
            </div>
            <div>
              <p className="whitespace-nowrap text-[11px] font-semibold text-white">{t("cardWinners")}</p>
              <p className="whitespace-nowrap text-[9px] text-white/60">{t("cardRng")}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="absolute -left-10 bottom-32 hidden rounded-2xl border border-white/20 bg-[#12211a]/95 p-3 shadow-2xl backdrop-blur-md sm:block"
          style={{ z: 120, transformStyle: "preserve-3d" }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(149_74%_45%)]/15">
              <ShieldCheck size={16} className="text-[hsl(149_74%_55%)]" />
            </div>
            <p className="whitespace-nowrap text-[11px] font-semibold text-white">{t("cardZero")}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* ground shadow */}
      <motion.div
        className="pointer-events-none absolute bottom-2 h-10 w-56 rounded-full bg-black/60 blur-2xl"
        animate={{ scaleX: [1, 0.82, 1], opacity: [0.6, 0.35, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mt-6 flex gap-2">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setScreen(i)}
            className="h-2 rounded-full transition-all"
            style={{ width: i === screen ? 24 : 8, background: i === screen ? GOLD : "rgba(255,255,255,0.25)" }}
            aria-label={`Screen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   Member-app screens (recreated from the real app) + tilted how-to phones
============================================================================ */
function MemberNav({ active }: { active: "home" | "pay" | "draws" | "takaful" | "profile" }) {
  const items = [
    ["home", Home, "Home"],
    ["pay", Receipt, "Payments"],
    ["draws", BarChart3, "Draws"],
    ["takaful", ShieldCheck, "Takaful"],
    ["profile", User, "Profile"],
  ] as const;
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-white/10 bg-[#0c140f]/95 px-1 py-2">
      {items.map(([key, Icon, label]) => {
        const on = key === active;
        return (
          <div key={key} className="flex flex-col items-center gap-0.5">
            <Icon size={15} className={on ? "text-[hsl(38_94%_56%)]" : "text-white/40"} />
            <span className={`text-[7px] ${on ? "text-[hsl(38_94%_56%)]" : "text-white/40"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ScreenHomeMember() {
  return (
    <div className="h-full overflow-hidden pb-14">
      <div className="flex items-center justify-between px-4 pt-2">
        <p className="text-base font-extrabold text-white">Digital Equb</p>
        <div className="relative">
          <Bell size={16} className="text-white/70" />
          <span className="absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-red-500 text-[6px] text-white">2</span>
        </div>
      </div>
      <div className="mx-3 mt-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(149_74%_16%)] to-[#0c140f] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/60">Total Ekub Savings</p>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[7px] text-white/80">
            <ShieldCheck size={9} /> Sharia Audited
          </span>
        </div>
        <p className="mt-1 text-2xl font-extrabold text-white">
          12,500<span className="text-sm font-semibold text-white/60"> ETB</span>
        </p>
        <div className="mt-3 flex gap-6">
          <div>
            <p className="text-[8px] text-white/50">Next Draw</p>
            <p className="text-xs font-bold text-white">Sept 12</p>
          </div>
          <div>
            <p className="text-[8px] text-white/50">At Risk</p>
            <p className="text-xs font-bold text-white">0</p>
          </div>
        </div>
      </div>
      <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-[hsl(38_94%_56%)]/40 bg-[hsl(38_94%_56%)]/10 px-3 py-2">
        <Trophy size={14} className="shrink-0 text-[hsl(38_94%_56%)]" />
        <p className="text-[9px] text-white/90">
          <b className="text-[hsl(38_94%_56%)]">Latest Winner</b> · #EK-8829 won 200,000 ETB!
        </p>
      </div>
      <p className="mt-4 px-4 text-[11px] font-bold text-white">My Active Equbs</p>
      <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl bg-white/5 p-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(149_74%_25%)]/40 text-[hsl(149_74%_55%)]">
          <PiggyBank size={15} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-white">Medium Tier · Round 6</p>
          <p className="text-[8px] text-white/50">1,090 ETB · Daily</p>
        </div>
        <span className="text-[11px] font-bold text-[hsl(149_74%_55%)]">45%</span>
      </div>
      <MemberNav active="home" />
    </div>
  );
}

function ScreenPaymentsMember() {
  const rows = [
    ["Aug 24", "Due", "warning"],
    ["Aug 23", "Paid", "ok"],
    ["Aug 22", "Paid", "ok"],
    ["Aug 20", "Missed", "bad"],
    ["Aug 19", "Paid", "ok"],
  ] as const;
  const tone = { ok: "text-[hsl(149_74%_55%)]", bad: "text-red-400", warning: "text-[hsl(38_94%_56%)]" };
  const icon = { ok: CheckCircle2, bad: XCircle, warning: Clock };
  return (
    <div className="h-full overflow-hidden pb-14">
      <p className="px-4 pt-2 text-base font-extrabold text-white">Payments</p>
      <div className="mt-2 flex border-b border-white/10 px-4 text-[10px]">
        <span className="border-b-2 border-[hsl(149_74%_55%)] pb-1.5 font-semibold text-[hsl(149_74%_55%)]">Schedule</span>
        <span className="ml-5 pb-1.5 text-white/40">Ledger</span>
      </div>
      <div className="mx-3 mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[hsl(149_74%_16%)] to-[#0c140f] p-3.5">
        <div>
          <p className="text-[9px] text-white/60">Due Today</p>
          <p className="text-lg font-extrabold text-white">1,110 ETB</p>
          <p className="text-[8px] text-white/50">Medium Tier · Round 6</p>
        </div>
        <span className="rounded-lg bg-[hsl(38_94%_56%)] px-3 py-1.5 text-[10px] font-bold text-[#0a120d]">Pay Now</span>
      </div>
      <div className="mt-3 space-y-1.5 px-3">
        {rows.map(([d, s, k]) => {
          const Icon = icon[k];
          return (
            <div key={d} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <Icon size={15} className={tone[k]} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-white">{d}</p>
                <p className="text-[8px] text-white/50">1,110 ETB</p>
              </div>
              <span className={`text-[9px] font-semibold ${tone[k]}`}>{s}</span>
            </div>
          );
        })}
      </div>
      <MemberNav active="pay" />
    </div>
  );
}

function ScreenDrawMember() {
  return (
    <div className="h-full overflow-hidden pb-14">
      <p className="px-4 pt-2 text-base font-extrabold text-white">Weekly Draw Event</p>
      <div className="mx-3 mt-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(149_74%_16%)] to-[#0c140f] p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-wide text-white/50">Live session</p>
            <p className="text-sm font-bold text-white">Medium Tier · Round 6</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-0.5 text-[8px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
        </div>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-2 text-center">
          <div>
            <p className="text-[8px] text-white/50">Draw Pool</p>
            <p className="text-xs font-bold text-white">200k</p>
          </div>
          <div>
            <p className="text-[8px] text-white/50">Winners</p>
            <p className="text-xs font-bold text-white">7/200</p>
          </div>
          <div>
            <p className="text-[8px] text-white/50">Status</p>
            <p className="text-xs font-bold text-[hsl(149_74%_55%)]">Active</p>
          </div>
        </div>
      </div>
      <div className="mx-3 mt-3 grid place-items-center rounded-2xl bg-white/5 p-5 text-center">
        <motion.div
          className="grid h-14 w-14 place-items-center rounded-full bg-[hsl(149_74%_25%)]/40"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Hand size={24} className="text-[hsl(149_74%_55%)]" />
        </motion.div>
        <p className="mt-3 text-xs font-bold text-white">Attendance Required</p>
        <p className="mt-1 text-[9px] leading-relaxed text-white/50">Confirm your active presence to be eligible for this round.</p>
        <div className="mt-3 w-full rounded-xl bg-[hsl(149_74%_45%)] py-2 text-[11px] font-bold text-[#0a120d]">Check-in to Draw</div>
      </div>
      <MemberNav active="draws" />
    </div>
  );
}

function MiniPhone({ children, tilt = -14, shineDelay = 0 }: { children: ReactNode; tilt?: number; shineDelay?: number }) {
  return (
    <div style={{ perspective: 1000 }} className="relative grid place-items-center">
      {/* colour glow behind */}
      <div
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full blur-[80px]"
        style={{ background: "radial-gradient(circle, hsl(149 74% 40% / 0.4) 0%, hsl(38 94% 56% / 0.12) 50%, transparent 70%)" }}
      />
      <motion.div
        initial={{ rotateY: tilt, rotateX: 6 }}
        whileHover={{ rotateY: 0, rotateX: 0, y: -8, scale: 1.02 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" }, default: { duration: 0.5 } }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative z-10"
      >
        <Chassis width={256} height={520} radius="2.9rem" shineDelay={shineDelay} statusRight="4G⁺ ▮▮▮">
          {children}
        </Chassis>
      </motion.div>
      <div className="pointer-events-none absolute bottom-0 h-8 w-44 rounded-full bg-black/60 blur-2xl" />
    </div>
  );
}

/* ============================================================================
   Page
============================================================================ */
export default function LandingPage() {
  const t = useTranslations("landing");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    { icon: Ticket, title: t("f1Title"), body: t("f1Body") },
    { icon: PiggyBank, title: t("f2Title"), body: t("f2Body") },
    { icon: ShieldCheck, title: t("f3Title"), body: t("f3Body") },
    { icon: Users, title: t("f4Title"), body: t("f4Body") },
  ];

  const principles = [
    { icon: HandCoins, title: t("pQard"), body: t("pQardBody") },
    { icon: Scale, title: t("pUjrah"), body: t("pUjrahBody") },
    { icon: Landmark, title: t("pAmanah"), body: t("pAmanahBody") },
  ];

  const steps = [
    { title: t("s1Title"), body: t("s1Body"), screen: <ScreenHomeMember /> },
    { title: t("s2Title"), body: t("s2Body"), screen: <ScreenPaymentsMember /> },
    { title: t("s3Title"), body: t("s3Body"), screen: <ScreenDrawMember /> },
  ];

  const titleWords = t("title1").split(" ");

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0a120d] text-white">
      <Aurora />

      {/* Nav — glass on scroll */}
      <header
        className={cn(
          "sticky top-0 z-30 transition-all duration-300",
          scrolled ? "border-b border-white/10 bg-[#0a120d]/70 backdrop-blur-xl" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/95 p-1.5 shadow-[0_0_24px_hsl(38_94%_56%/0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/emad-small-logo.png" alt="Emad" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-bold">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-3">
            <DarkLocaleToggle />
            <Link
              href="/login"
              className="hidden rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20 sm:inline-flex"
            >
              {t("console")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-10 pt-8 lg:min-h-[calc(100vh-72px)] lg:grid-cols-2 lg:gap-6 lg:pb-16 lg:pt-4">
        <div className="relative">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(38_94%_56%)]/30 bg-[hsl(38_94%_56%)]/10 px-4 py-1.5 text-xs font-medium text-[hsl(38_94%_56%)] shadow-[0_0_30px_-8px_hsl(38_94%_56%)]"
          >
            <ShieldCheck size={14} /> {t("badge")}
          </motion.span>

          <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-[4.2rem]">
            <span className="block leading-[1.08]">
              {titleWords.map((w, i) => (
                <motion.span
                  key={`${w}-${i}`}
                  className="mr-[0.28em] inline-block"
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.08 + i * 0.09, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {w}
                </motion.span>
              ))}
            </span>
            {/* pb + looser leading so gradient-clipped descenders (g, j) aren't cut */}
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-1 inline-block pb-3 leading-[1.15]"
            >
              <motion.span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${GREEN} 0%, ${GOLD} 40%, #fff3c4 50%, ${GOLD} 60%, ${GREEN} 100%)`,
                  backgroundSize: "220% 100%",
                }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                {t("title2")}
              </motion.span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5 max-w-md text-lg leading-relaxed text-white/70"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a
              href={APP_DOWNLOAD_URL}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[hsl(38_94%_56%)] px-6 py-3 font-semibold text-[#0a120d] shadow-[0_10px_40px_-10px_hsl(38_94%_56%)] transition hover:brightness-110"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Download size={18} className="transition group-hover:translate-y-0.5" />
              {t("downloadApp")}
            </a>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10"
            >
              {t("ctaOpen")}
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 grid max-w-md grid-cols-3 gap-4"
          >
            {[
              { n: 200, suffix: "", label: t("statMembers") },
              { n: 7, suffix: "", label: t("statWinners") },
              { n: 10, suffix: "M Br", label: t("statPayout") },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <p className="text-2xl font-extrabold tracking-tight text-white">
                  <CountUp to={s.n} suffix={s.suffix} />
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-white/50">{s.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.a
            href="#features"
            className="mt-10 hidden items-center gap-2 text-xs font-medium text-white/40 transition hover:text-white/70 lg:inline-flex"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={16} /> {t("scrollHint")}
          </motion.a>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center px-10 sm:px-16"
        >
          <Phone3D />
        </motion.div>
      </section>

      {/* Sharia principles strip */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40"
        >
          {t("principlesTitle")}
        </motion.p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(38_94%_56%)]/12 text-[hsl(38_94%_56%)]">
                <p.icon size={18} />
              </div>
              <div>
                <p className="font-bold">{p.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-white/55">{p.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-6 py-20">
        <SectionHeading eyebrow={t("eyebrowFeatures")} title={t("ctaTitle")} subtitle={t("ctaBody")} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 1200 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -8, rotateX: 5, rotateY: -4 }}
              style={{ transformStyle: "preserve-3d" }}
              className="group relative rounded-3xl p-px"
            >
              {/* gradient border that lights up on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-100 transition-opacity duration-500 group-hover:opacity-0" />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[hsl(38_94%_56%)]/70 via-[hsl(149_74%_45%)]/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-[#0f1a14]/90 p-6 backdrop-blur">
                <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(149_74%_25%)]/40 text-[hsl(149_74%_60%)]">
                  <span className="absolute inset-0 rounded-2xl bg-[hsl(149_74%_45%)]/30 blur-md opacity-0 transition group-hover:opacity-100" />
                  <f.icon size={22} className="relative" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works — three member-app phones */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <SectionHeading eyebrow={t("eyebrowHow")} title={t("howTitle")} subtitle={t("howSubtitle")} />
        <div className="relative mt-20">
          {/* connector line behind the phones */}
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-[240px] hidden h-px bg-gradient-to-r from-transparent via-[hsl(38_94%_56%)]/50 to-transparent md:block" />
          <div className="grid gap-20 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                <MiniPhone tilt={i === 1 ? 0 : i === 0 ? -16 : 16} shineDelay={i * 1.4}>
                  {s.screen}
                </MiniPhone>
                <div className="mt-10 max-w-xs">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-[hsl(38_94%_56%)] text-base font-extrabold text-[#0a120d] shadow-[0_0_30px_-6px_hsl(38_94%_56%)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download band — animated conic border */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] p-px"
        >
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2"
            style={{ background: `conic-gradient(from 0deg, transparent 0%, ${GOLD} 12%, transparent 25%, transparent 50%, ${GREEN} 62%, transparent 75%)` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-[calc(2rem-1px)] bg-gradient-to-br from-[hsl(149_74%_18%)] via-[#0f1a14] to-[#0c140f] p-10 text-center md:flex-row md:justify-between md:text-left">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[hsl(38_94%_56%)]/15 blur-[80px]" />
            <div className="relative flex items-center gap-5">
              <div className="hidden h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[hsl(38_94%_56%)]/15 text-[hsl(38_94%_56%)] sm:grid">
                <Smartphone size={30} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(38_94%_56%)]">{t("eyebrowDownload")}</p>
                <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("dlTitle")}</h2>
                <p className="mt-2 max-w-md text-white/70">{t("dlBody")}</p>
              </div>
            </div>
            <div className="relative flex flex-col items-center gap-2">
              <a
                href={APP_DOWNLOAD_URL}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[hsl(38_94%_56%)] px-8 py-4 text-lg font-bold text-[#0a120d] shadow-[0_16px_50px_-12px_hsl(38_94%_56%)] transition hover:brightness-110"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <Download size={20} className="transition group-hover:translate-y-0.5" />
                {t("dlBtn")}
              </a>
              <span className="text-xs text-white/50">{t("dlSoon")}</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[hsl(149_74%_22%)] to-[hsl(149_74%_10%)] p-12 text-center"
        >
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(38_94%_56%)]/20 blur-[100px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <h2 className="relative text-3xl font-extrabold sm:text-4xl">{t("ctaTitle")}</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/70">{t("ctaBody")}</p>
          <Link
            href="/login"
            className="group relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[hsl(38_94%_56%)] px-8 py-3.5 font-semibold text-[#0a120d] shadow-[0_12px_40px_-10px_hsl(38_94%_56%)] transition hover:brightness-110"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {t("ctaBtn")} <ArrowRight size={18} className="transition group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-white/40 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/emad-small-logo.png" alt="Emad" className="h-full w-full object-contain" />
            </div>
            <span>{t("footer")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1">{t("cardZero")}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">{t("cardRng")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
