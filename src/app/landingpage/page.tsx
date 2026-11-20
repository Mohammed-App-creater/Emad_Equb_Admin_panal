"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
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
  Languages,
  Download,
  ChevronDown,
  HandCoins,
  Scale,
  Landmark,
  Smartphone,
} from "lucide-react";
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import {
  SectionHeading,
  TrustMarquee,
  MetricsBar,
  PaymentRails,
  SecuritySection,
  ComparisonSection,
  FaqSection,
} from "./fintech";
import { AppShot, Chassis, GOLD, GREEN, shots } from "./device";
import { EqubShowcase } from "./equb-showcase";

// ============================================================================
// Public marketing landing page — /landingpage (bilingual EN/AM)
// Genuine CSS 3D (transform-style: preserve-3d) phones showing the real member
// app: a mouse-parallax hero device cycling through its screens, then the three
// Equbs and their join → contribute → draw → after journey (equb-showcase.tsx).
// Ambient aurora + particles, scroll reveals, count-up stats, animated borders.
// ============================================================================

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

function Phone3D() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const [screen, setScreen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // the real app: home, my Equbs, the live draw wheel, a winner's Equb
  const screens = [shots.home(), shots.myEqubs(locale), shots.drawLive(), shots.won(locale)];

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-24, 24]), { stiffness: 110, damping: 16 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [18, -18]), { stiffness: 110, damping: 16 });
  // glow follows the tilt slightly for a lit-from-behind feel
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], [-40, 40]), { stiffness: 80, damping: 20 });
  const glowY = useSpring(useTransform(my, [-0.5, 0.5], [-30, 30]), { stiffness: 80, damping: 20 });

  useEffect(() => {
    const id = setInterval(() => setScreen((s) => (s + 1) % screens.length), 3800);
    return () => clearInterval(id);
  }, [screens.length]);

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

  const shot = screens[screen];

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
        <Chassis width={284} height={624} lightStatus={shot.light}>
          <AnimatePresence initial={false}>
            <motion.div
              key={screen}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <AppShot shot={shot} alt={t("appName")} eager />
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
        {screens.map((_, i) => (
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

          {/* in-page product nav */}
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/60 lg:flex">
            <a href="#features" className="transition hover:text-white">{t("eyebrowFeatures")}</a>
            <a href="#equbs" className="transition hover:text-white">{t("eqNav")}</a>
            <a href="#journey" className="transition hover:text-white">{t("howTitle")}</a>
            <a href="#download" className="transition hover:text-white">{t("downloadApp")}</a>
          </nav>

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
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 grid max-w-md grid-cols-3 gap-4"
          >
            {[
              { n: 200, suffix: "", label: t("statMembers") },
              { n: 5, suffix: "", label: t("statWinners") },
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

      {/* Trust marquee + headline metrics */}
      <TrustMarquee />
      <MetricsBar />

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

      {/* The three Equbs + their join → contribute → draw → after journey */}
      <EqubShowcase />

      {/* Fintech core: rails, compliance, comparison, FAQ */}
      <PaymentRails />
      <SecuritySection />
      <ComparisonSection />
      <FaqSection />

      {/* Download band — animated conic border */}
      <section id="download" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-6 py-10">
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
        <div className="border-t border-white/5 py-4 text-center text-xs text-white/35">{t("poweredBy")}</div>
      </footer>
    </main>
  );
}
