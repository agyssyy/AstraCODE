import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[hsl(var(--muted))]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(46rem_32rem_at_50%_-8%,hsl(var(--signal)/0.24),transparent_62%),radial-gradient(30rem_26rem_at_8%_108%,hsl(var(--violet)/0.16),transparent_68%),radial-gradient(26rem_22rem_at_96%_88%,hsl(var(--primary)/0.12),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-[-12rem] size-[34rem] -translate-x-1/2 rounded-full bg-[hsl(var(--signal)/0.10)] blur-[120px]"
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
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--card))]/70 hover:text-[hsl(var(--foreground))]"
        >
          Back to home <ArrowUpRight className="size-3" />
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 pb-12 pt-2 sm:px-8">
        <div className="w-full max-w-[460px] animate-[page-enter_520ms_cubic-bezier(0.16,1,0.3,1)]">
          <div className="relative overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_0_0_hsl(var(--card))_inset,0_40px_110px_-48px_hsl(var(--primary)/0.6),0_20px_60px_-36px_hsl(var(--violet)/0.45)] sm:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--signal)/0.75),hsl(var(--violet)/0.65),transparent)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-[hsl(var(--signal)/0.09)] blur-3xl"
            />
            <div className="relative">{children}</div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[hsl(var(--success))]" />
              All systems normal
            </span>
            <span className="size-1 rounded-full bg-[hsl(var(--border))]" />
            <span>Encrypted in transit</span>
            <span className="size-1 rounded-full bg-[hsl(var(--border))]" />
            <span>Apache-2.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
