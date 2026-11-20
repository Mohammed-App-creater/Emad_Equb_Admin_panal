"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate } from "motion/react";
import { ArrowRight, Check, UserPlus, Wallet, Trophy, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./fintech";
import { AppShot, Chassis, GOLD, shots, type Shot } from "./device";

// ============================================================================
// The three Equbs (Hajj, Umrah, Daily) as mouse-tilting 3D cards, and the
// member journey for the selected Equb — join → contribute → draw → after —
// told with four 3D phones showing the real app screens.
// ============================================================================

type EqubKey = "hajj" | "umrah" | "daily";
const EQUBS: EqubKey[] = ["hajj", "umrah", "daily"];
const ICON: Record<EqubKey, string> = {
  hajj: "/images/hajj-icon.png",
  umrah: "/images/umrah-icon.png",
  daily: "/images/app/daily-icon.webp",
};

/* ---- 3D card that tilts towards the pointer, with a glare that follows it ---- */
function TiltCard({ children, active, className }: { children: ReactNode; active: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 140, damping: 16 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 140, damping: 16 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(my, [-0.5, 0.5], ["0%", "100%"]);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgba(255,255,255,0.13), transparent 60%)`;

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div style={{ perspective: 1100 }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative h-full rounded-[2rem] p-px"
      >
        {/* border: gold when this Equb is the one shown in the journey */}
        <div
          className={cn(
            "absolute inset-0 rounded-[2rem] transition-opacity duration-500",
            active
              ? "bg-gradient-to-b from-[hsl(38_94%_56%)] via-[hsl(38_94%_56%)]/35 to-[hsl(149_74%_45%)]/30"
              : "bg-gradient-to-b from-white/15 to-white/[0.03]"
          )}
        />
        {/* slab thickness — a darker copy pushed back in Z */}
        <div
          className="absolute inset-0 rounded-[2rem] bg-[#060b08]"
          style={{ transform: "translateZ(-18px)", boxShadow: "0 40px 70px -20px rgba(0,0,0,0.8)" }}
        />
        <div
          className="relative flex h-full flex-col rounded-[calc(2rem-1px)] bg-gradient-to-b from-[#12211a] to-[#0b130f] p-7"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div className="pointer-events-none absolute inset-0 rounded-[calc(2rem-1px)]" style={{ background: glare }} />
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ---- One phone of the journey; cycles when a step has two screens ---- */
function JourneyPhone({ frames, tilt, shineDelay }: { frames: { shot: Shot; label?: string }[]; tilt: number; shineDelay: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % frames.length), 3600);
    return () => clearInterval(id);
  }, [frames.length]);
  const frame = frames[i % frames.length];

  return (
    <div style={{ perspective: 1000 }} className="relative grid place-items-center">
      <div
        className="pointer-events-none absolute h-[380px] w-[380px] rounded-full blur-[80px]"
        style={{ background: "radial-gradient(circle, hsl(149 74% 40% / 0.38) 0%, hsl(38 94% 56% / 0.1) 50%, transparent 70%)" }}
      />
      <motion.div
        initial={{ rotateY: tilt, rotateX: 6 }}
        whileHover={{ rotateY: 0, rotateX: 0, scale: 1.03 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: shineDelay / 2 }, default: { duration: 0.5 } }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative z-10"
      >
        <Chassis width={224} height={493} radius="2.6rem" shineDelay={shineDelay} lightStatus={frame.shot.light}>
          <AnimatePresence initial={false}>
            <motion.div
              key={frame.shot.src}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <AppShot shot={frame.shot} alt={frame.label ?? ""} />
            </motion.div>
          </AnimatePresence>
        </Chassis>
        {/* which of the two outcomes is on screen — floats in front of the glass */}
        {frame.label && (
          <motion.span
            key={frame.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ z: 60 }}
            className="absolute -right-4 top-16 whitespace-nowrap rounded-full border border-[hsl(38_94%_56%)]/40 bg-[#12211a]/95 px-3 py-1 text-[10px] font-semibold text-[hsl(38_94%_56%)] shadow-xl"
          >
            {frame.label}
          </motion.span>
        )}
      </motion.div>
      <div className="pointer-events-none absolute bottom-0 h-8 w-40 rounded-full bg-black/60 blur-2xl" />
    </div>
  );
}

export function EqubShowcase() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const [active, setActive] = useState<EqubKey>("hajj");

  const name: Record<EqubKey, string> = { hajj: t("eqHajj"), umrah: t("eqUmrah"), daily: t("eqDaily") };

  const cards: Record<EqubKey, { kind: string; tagline: string; points: string[] }> = {
    hajj: { kind: t("eqKindPilgrimage"), tagline: t("eqHajjTag"), points: [t("eqHajjP1"), t("eqHajjP2"), t("eqHajjP3"), t("eqHajjP4")] },
    umrah: { kind: t("eqKindPilgrimage"), tagline: t("eqUmrahTag"), points: [t("eqUmrahP1"), t("eqUmrahP2"), t("eqUmrahP3"), t("eqUmrahP4")] },
    daily: { kind: t("eqKindRotating"), tagline: t("eqDailyTag"), points: [t("eqDailyP1"), t("eqDailyP2"), t("eqDailyP3"), t("eqDailyP4")] },
  };

  const showJourney = (k: EqubKey) => {
    setActive(k);
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // join → contribute → draw → after, per Equb
  const stages = [
    { icon: UserPlus, label: t("jStage1") },
    { icon: Wallet, label: t("jStage2") },
    { icon: Trophy, label: t("jStage3") },
    { icon: Plane, label: t("jStage4") },
  ];
  const pilgrimage = active !== "daily";
  const equb = name[active];
  const steps: { title: string; body: string; frames: { shot: Shot; label?: string }[] }[] = pilgrimage
    ? [
        { title: t("jP1T", { equb }), body: t("jP1B", { equb }), frames: [{ shot: active === "hajj" ? shots.hajj(locale) : shots.umrah(locale) }] },
        { title: t("jP2T"), body: t("jP2B"), frames: [{ shot: shots.contribute(locale) }] },
        { title: t("jP3T"), body: t("jP3B"), frames: [{ shot: shots.drawResult(locale) }] },
        {
          title: t("jP4T"),
          body: t("jP4B"),
          frames: [
            { shot: shots.won(locale), label: t("jWon") },
            { shot: shots.decision(locale), label: t("jNotDrawn") },
          ],
        },
      ]
    : [
        { title: t("jD1T"), body: t("jD1B"), frames: [{ shot: shots.login() }] },
        { title: t("jD2T"), body: t("jD2B"), frames: [{ shot: shots.payments() }] },
        { title: t("jD3T"), body: t("jD3B"), frames: [{ shot: shots.drawLive() }] },
        {
          title: t("jD4T"),
          body: t("jD4B"),
          frames: [
            { shot: shots.drawWinners(), label: t("jWinners") },
            { shot: shots.drawContract(), label: t("jContract") },
          ],
        },
      ];
  const tilts = [-14, -5, 5, 14];

  return (
    <>
      {/* ---- The three Equbs ---- */}
      <section id="equbs" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-6 py-20">
        <SectionHeading eyebrow={t("eqEyebrow")} title={t("eqTitle")} subtitle={t("eqSub")} />
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {EQUBS.map((k, i) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <TiltCard active={active === k} className="h-full">
                {/* icon floats well above the card face */}
                <div className="relative w-fit" style={{ transform: "translateZ(60px)", transformStyle: "preserve-3d" }}>
                  <div className="absolute inset-2 rounded-3xl bg-[hsl(149_74%_45%)]/50 blur-2xl" />
                  <motion.img
                    src={ICON[k]}
                    alt={name[k]}
                    className="relative h-24 w-24 rounded-3xl object-cover shadow-[0_24px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
                  />
                </div>

                <div className="mt-6" style={{ transform: "translateZ(34px)" }}>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(38_94%_56%)]">
                    {cards[k].kind}
                  </span>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{name[k]}</h3>
                  <p className="mt-1 text-sm text-white/60">{cards[k].tagline}</p>
                </div>

                <ul className="mt-6 flex-1 space-y-3 border-t border-white/10 pt-5 text-sm text-white/70" style={{ transform: "translateZ(20px)" }}>
                  {cards[k].points.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-[hsl(149_74%_55%)]" />
                      <span className="leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => showJourney(k)}
                  style={{ transform: "translateZ(40px)" }}
                  className={cn(
                    "group mt-7 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition",
                    active === k
                      ? "bg-[hsl(38_94%_56%)] text-[#0a120d] shadow-[0_12px_40px_-12px_hsl(38_94%_56%)] hover:brightness-110"
                      : "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                  )}
                >
                  {t("eqCta")}
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </button>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---- The journey for the selected Equb ---- */}
      <section id="journey" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-6 py-20">
        <SectionHeading eyebrow={t("eyebrowHow")} title={t("jTitle")} subtitle={t("jSub")} />

        {/* Equb switcher */}
        <div className="mt-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur" role="tablist">
            {EQUBS.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={active === k}
                onClick={() => setActive(k)}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  active === k ? "text-[#0a120d]" : "text-white/60 hover:text-white"
                )}
              >
                {active === k && (
                  <motion.span layoutId="journey-tab" className="absolute inset-0 rounded-full bg-[hsl(38_94%_56%)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ICON[k]} alt="" className="relative h-6 w-6 rounded-md object-cover" />
                <span className="relative">{name[k]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-16">
          {/* path behind the phones with a coin travelling join → after */}
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-[246px] hidden lg:block">
            <div className="h-px bg-gradient-to-r from-transparent via-[hsl(38_94%_56%)]/50 to-transparent" />
            <motion.span
              className="absolute -top-1.5 h-3 w-3 rounded-full"
              style={{ background: GOLD, boxShadow: `0 0 18px ${GOLD}` }}
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.1, 0.9, 1] }}
            />
          </div>

          <div className="grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => {
              const Stage = stages[i].icon;
              return (
                <motion.div
                  key={`${active}-${i}`}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center text-center"
                >
                  <JourneyPhone frames={s.frames} tilt={tilts[i]} shineDelay={i * 1.2} />
                  <div className="mt-9 max-w-[17rem]">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(38_94%_56%)] py-1 pl-1 pr-3.5 text-xs font-bold text-[#0a120d] shadow-[0_0_30px_-6px_hsl(38_94%_56%)]">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0a120d] text-[hsl(38_94%_56%)]">
                        <Stage size={14} />
                      </span>
                      {i + 1} · {stages[i].label}
                    </span>
                    <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
