import { Logo } from "../ui/logo";

export function BrandPanel() {
  return (
    <div className="relative hidden h-full flex-col items-center justify-center gap-8 bg-[hsl(134,61%,25%)] px-12 text-white lg:flex">
      {/* Decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-white/3" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex h-44 w-72 items-center justify-center rounded-2xl bg-white/95 p-4 shadow-lg">
          <Logo className="h-full w-full" />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight">
            Emad Digital SACCO Platform
          </h1>
          <p className="text-lg font-medium text-white/80">
            {"Sharia-Compliant Savings, Financing & Cooperative Service"}
          </p>
        </div>

        <div className="mt-4 max-w-sm rounded-xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-white/90">
            {"A secure and fully digitized cooperative system for membership, savings, shares, and Islamic financing  managed transparently in real time."}
          </p>
        </div>
      </div>
    </div>
  );
}
