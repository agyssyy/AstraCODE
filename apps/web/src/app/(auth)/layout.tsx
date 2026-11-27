import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(46rem_34rem_at_50%_-14%,hsl(var(--iris)/0.22),transparent_64%),radial-gradient(34rem_28rem_at_4%_106%,hsl(var(--seafoam)/0.16),transparent_66%),radial-gradient(30rem_24rem_at_98%_94%,hsl(var(--rose)/0.14),transparent_68%),radial-gradient(28rem_24rem_at_90%_-4%,hsl(var(--signal)/0.12),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="glass-grid-line pointer-events-none fixed inset-0 opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-[-14rem] size-[38rem] -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.03] blur-[2px]"
      />

      <header className="relative z-10 mx-auto flex h-20 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="AstraCode home" className="flex items-center gap-2.5">
          <Logo size={26} showWordmark={false} />
          <span className="flex flex-col leading-none">
            <span className="text-[13.5px] font-semibold tracking-[-0.02em]">AstraCode</span>
            <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              Workspace
            </span>
          </span>
        </Link>
        <Link
          href="/"
          className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          Back to home <ArrowUpRight className="size-3" />
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 pb-14 pt-2 sm:px-8">
        <div className="w-full max-w-[480px] animate-[page-enter_520ms_cubic-bezier(0.16,1,0.3,1)]">
          <div className="glass-panel glass-edge glass-sheen relative overflow-hidden rounded-[34px] p-5 sm:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(0_0%_100%/0.7),hsl(var(--signal)/0.5),transparent)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-[hsl(var(--signal)/0.16)] blur-3xl"
            />
            <div className="relative">{children}</div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-[hsl(var(--muted-foreground))]">
            <span className="inline-flex items-center gap-1.5">
              <span className="live-dot size-1.5 rounded-full bg-[hsl(var(--success))]" />
              All systems normal
            </span>
            <span className="size-1 rounded-full bg-[hsl(var(--border))]" />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3" /> Encrypted in transit
            </span>
            <span className="size-1 rounded-full bg-[hsl(var(--border))]" />
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3" /> Apache-2.0
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
