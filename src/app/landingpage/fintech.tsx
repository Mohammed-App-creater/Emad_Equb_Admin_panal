"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import {
  Check,
  Minus,
  ChevronDown,
  Smartphone,
  Building2,
  HandCoins,
  Scale,
  Fingerprint,
  FileClock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Fintech-style sections: trust metrics, payment
// rails, security/compliance, a comparison table and an FAQ. Every figure here
// is a product parameter from the Ekub guideline — no invented traction claims.
// ============================================================================

/* ---- Shared section heading (also used by the hero page) ---- */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
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
      {subtitle && <p className="mt-4 text-base leading-relaxed text-white/60 sm:text-lg">{subtitle}</p>}
      <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(38_94%_56%)] to-transparent" />
    </motion.div>
  );
}

/* ---- Infinite trust marquee ---- */
export function TrustMarquee() {
  const t = useTranslations("landing");
  const items = [
    t("marquee1"),
    t("marquee2"),
    t("marquee3"),
    t("marquee4"),
    t("marquee5"),
    t("marquee6"),
    t("marquee7"),
    t("marquee8"),
  ];
  const run = [...items, ...items];
  return (
    <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/[0.02] py-4 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a120d] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a120d] to-transparent" />
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {run.map((label, i) => (
          <span key={i} className="flex items-center gap-3 text-sm font-medium text-white/45">
            <Sparkles size={13} className="text-[hsl(38_94%_56%)]" />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---- Key metrics bar ---- */
export function MetricsBar() {
  const t = useTranslations("landing");
  const metrics = [
    { v: "0%", l: t("mInterest") },
    { v: "5", l: t("mWinners") },
    { v: "200", l: t("mGroup") },
    { v: "24h", l: t("mPayout") },
    { v: "99.5%", l: t("mUptime") },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-14">
      <div className="grid divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
        {metrics.map((m, i) => (
          <motion.div
            key={m.l}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="px-6 py-6 text-center"
          >
            <p className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent lg:text-4xl">
              {m.v}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-white/45">{m.l}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---- Payment rails ---- */
export function PaymentRails() {
  const t = useTranslations("landing");
  const rails = [
    { icon: Smartphone, title: t("payMobile"), body: t("payMobileD") },
    { icon: Building2, title: t("payBank"), body: t("payBankD") },
    { icon: HandCoins, title: t("payAgent"), body: t("payAgentD") },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
      <SectionHeading eyebrow={t("payEyebrow")} title={t("payTitle")} subtitle={t("paySub")} />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {rails.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur transition hover:border-[hsl(38_94%_56%)]/30"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(149_74%_45%)]/10 blur-2xl transition group-hover:bg-[hsl(38_94%_56%)]/15" />
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(149_74%_25%)]/40 text-[hsl(149_74%_60%)]">
              <r.icon size={22} />
            </div>
            <h3 className="relative mt-5 text-lg font-bold">{r.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-white/60">{r.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---- Security & compliance ---- */
export function SecuritySection() {
  const t = useTranslations("landing");
  const items = [
    { icon: Building2, title: t("sec1T"), body: t("sec1B") },
    { icon: Scale, title: t("sec2T"), body: t("sec2B") },
    { icon: Fingerprint, title: t("sec3T"), body: t("sec3B") },
    { icon: FileClock, title: t("sec4T"), body: t("sec4B") },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-8 backdrop-blur sm:p-12">
        <SectionHeading eyebrow={t("secEyebrow")} title={t("secTitle")} subtitle={t("secSub")} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {items.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="flex gap-4 rounded-2xl border border-white/10 bg-[#0d1712]/60 p-5"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsl(38_94%_56%)]/12 text-[hsl(38_94%_56%)]">
                <s.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Traditional vs digital comparison ---- */
export function ComparisonSection() {
  const t = useTranslations("landing");
  const rows = [
    [t("cmpR1"), t("cmpR1a"), t("cmpR1b")],
    [t("cmpR2"), t("cmpR2a"), t("cmpR2b")],
    [t("cmpR3"), t("cmpR3a"), t("cmpR3b")],
    [t("cmpR4"), t("cmpR4a"), t("cmpR4b")],
    [t("cmpR5"), t("cmpR5a"), t("cmpR5b")],
  ];
  return (
    <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
      <SectionHeading eyebrow={t("cmpEyebrow")} title={t("cmpTitle")} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur"
      >
        <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-4 text-[11px] font-semibold uppercase tracking-wider sm:px-7 sm:text-xs">
          <span className="text-white/35" />
          <span className="text-center text-white/40">{t("cmpTrad")}</span>
          <span className="text-center text-[hsl(38_94%_56%)]">{t("cmpDigital")}</span>
        </div>
        {rows.map(([label, trad, digital], i) => (
          <div
            key={label}
            className={cn(
              "grid grid-cols-[1.1fr_1fr_1fr] items-center gap-2 px-4 py-4 text-sm sm:px-7",
              i % 2 === 1 && "bg-white/[0.02]"
            )}
          >
            <span className="font-medium text-white/80">{label}</span>
            <span className="flex items-start justify-center gap-1.5 text-center text-xs text-white/40 sm:text-sm">
              <Minus size={14} className="mt-0.5 shrink-0 text-white/25" />
              {trad}
            </span>
            <span className="flex items-start justify-center gap-1.5 text-center text-xs font-medium text-white sm:text-sm">
              <Check size={15} className="mt-0.5 shrink-0 text-[hsl(149_74%_55%)]" />
              {digital}
            </span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ---- FAQ accordion ---- */
export function FaqSection() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState<number | null>(0);
  const qa = [
    [t("q1"), t("a1")],
    [t("q2"), t("a2")],
    [t("q3"), t("a3")],
    [t("q4"), t("a4")],
    [t("q5"), t("a5")],
  ];
  return (
    <section className="relative z-10 mx-auto max-w-3xl px-6 py-20">
      <SectionHeading eyebrow={t("faqEyebrow")} title={t("faqTitle")} />
      <div className="mt-12 space-y-3">
        {qa.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={q}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur transition",
                isOpen ? "border-[hsl(38_94%_56%)]/30" : "border-white/10"
              )}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-semibold">{q}</span>
                <ChevronDown
                  size={18}
                  className={cn(
                    "shrink-0 text-white/40 transition-transform duration-300",
                    isOpen && "rotate-180 text-[hsl(38_94%_56%)]"
                  )}
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p className="px-6 pb-5 text-sm leading-relaxed text-white/60">{a}</p>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
