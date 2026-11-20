"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";

// ============================================================================
// Shared 3D device for the landing page: a CSS preserve-3d phone chassis and
// the real member-app screenshots that go inside it. The screenshots are
// produced by the mobile app's screen tests and live in /public/images/app.
// ============================================================================

export const GOLD = "hsl(38 94% 56%)";
export const GREEN = "hsl(149 74% 45%)";
export const GREEN_DEEP = "hsl(149 74% 16%)";

/** One app screenshot: file name (no extension), its top background colour
    (painted behind the status bar) and whether that background is light. */
export type Shot = { src: string; bg: string; light?: boolean };

const DARK = "#08140e";
const DRAW = "#101418";
const LIGHT = "#f6f8f7";

/** Screens that exist per language fall back to English for other locales. */
const lang = (locale: string) => (locale === "am" ? "am" : "en");

export const shots = {
  home: (): Shot => ({ src: "home", bg: LIGHT, light: true }),
  login: (): Shot => ({ src: "login", bg: "#0e4222" }),
  payments: (): Shot => ({ src: "payments", bg: LIGHT, light: true }),
  drawLive: (): Shot => ({ src: "draw-live", bg: DRAW }),
  drawWinners: (): Shot => ({ src: "draw-winners", bg: DRAW }),
  drawContract: (): Shot => ({ src: "draw-contract", bg: "#07090b" }),
  myEqubs: (l: string): Shot => ({ src: `my-equbs-${lang(l)}`, bg: DARK }),
  hajj: (l: string): Shot => ({ src: `hajj-${lang(l)}`, bg: DARK }),
  umrah: (l: string): Shot => ({ src: `umrah-${lang(l)}`, bg: DARK }),
  contribute: (l: string): Shot => ({ src: `contribute-${lang(l)}`, bg: DARK }),
  drawResult: (l: string): Shot => ({ src: `draw-result-${lang(l)}`, bg: DARK }),
  won: (l: string): Shot => ({ src: `won-${lang(l)}`, bg: DARK }),
  decision: (l: string): Shot => ({ src: `decision-${lang(l)}`, bg: DARK }),
};

/** A screenshot filling the phone screen, padded below the status bar. */
export function AppShot({ shot, alt, eager = false }: { shot: Shot; alt: string; eager?: boolean }) {
  return (
    <div className="h-full w-full pt-9" style={{ background: shot.bg }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/app/${shot.src}.webp`}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        className="h-full w-full select-none object-cover object-top"
      />
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

/* Device chassis — metallic gradient shell, gold rim, side keys, recessed glass
   screen with a passing reflection. Children fill the whole screen; the status
   bar and notch are drawn on top, so children should leave 36px (pt-9) free. */
export function Chassis({
  children,
  width,
  height,
  radius = "3rem",
  shineDelay = 0,
  lightStatus = false,
}: {
  children: ReactNode;
  width: number;
  height: number;
  radius?: string;
  shineDelay?: number;
  /** true when the screen behind the status bar is light (dark status text). */
  lightStatus?: boolean;
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
        className="relative h-full w-full overflow-hidden bg-[#08140e]"
        style={{ borderRadius: `calc(${radius} - 0.7rem)`, transform: "translateZ(4px)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.9)" }}
      >
        <div className="absolute inset-0">{children}</div>
        <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-3 text-[9px] font-semibold transition-colors duration-500"
          style={{ color: lightStatus ? "rgba(10,18,13,0.75)" : "rgba(255,255,255,0.75)" }}
        >
          <span>9:41</span>
          <span>4G ▮▮▮</span>
        </div>
        {/* glass */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08]" />
        <Shine delay={shineDelay} />
      </div>
    </div>
  );
}
