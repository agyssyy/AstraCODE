import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="dark relative hidden overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--signal))_0%,transparent_60%)] opacity-[0.14]"
        />
        <div aria-hidden="true" className="absolute inset-0 grid-bg opacity-[0.25]" />

        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="AstraCode home">
            <Logo size={26} />
          </Link>
          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 px-2.5 py-1 text-[10.5px] font-medium text-[hsl(var(--muted-foreground))] backdrop-blur">
            Open source
          </span>
        </div>

        <div className="relative max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] backdrop-blur">
            <span className="size-1.5 rounded-full bg-[hsl(var(--signal))]" />
            Astra Assistant included
          </p>
          <h1 className="mt-5 text-[clamp(2.2rem,3.3vw,3.2rem)] font-semibold leading-[1.04] tracking-[-0.05em]">
            Your workspace.
            <br />
            Your models.
            <br />
            <span className="text-[hsl(var(--signal))]">Your rules.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            Start with the assistant that is already here, then connect any provider you like.
            Chat, edit, run and benchmark without leaving the workspace.
          </p>

          <div className="mt-8 max-w-sm rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 p-4 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[hsl(var(--signal))] text-[hsl(var(--signal-foreground))]">
                <span className="text-[13px] font-semibold">A</span>
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">Astra Assistant</p>
                <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                  Ready out of the box
                </p>
              </div>
              <span className="ml-auto rounded-full bg-[hsl(var(--success))]/12 px-2 py-0.5 text-[9.5px] font-medium text-[hsl(var(--success))]">
                Online
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                "Streaming chat with project context",
                "A real editor, terminal and live preview",
                "Encrypted keys for the providers you add",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  <Check className="size-3 shrink-0 text-[hsl(var(--signal))]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[10.5px] text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[hsl(var(--success))]" />
            All systems normal
          </span>
          <span>v0.1.0 · Apache-2.0</span>
        </div>
      </aside>

      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[hsl(var(--muted))]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_30rem_at_88%_-4%,hsl(var(--signal)/0.22),transparent_62%),radial-gradient(32rem_26rem_at_-6%_104%,hsl(var(--violet)/0.18),transparent_66%),linear-gradient(165deg,hsl(var(--card)/0.6),transparent_45%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
        />
        <div className="relative z-10 flex h-16 items-center justify-between px-4 lg:justify-end lg:px-8">
          <Link href="/" className="lg:hidden" aria-label="AstraCode home">
            <Logo size={24} />
          </Link>
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] sm:inline-flex"
          >
            Back to home <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-8 lg:pb-16">
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-[30px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_0_0_hsl(var(--card))_inset,0_36px_100px_-44px_hsl(var(--primary)/0.55),0_18px_50px_-32px_hsl(var(--violet)/0.45)] sm:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--signal)/0.7),hsl(var(--violet)/0.6),transparent)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-[hsl(var(--signal)/0.08)] blur-3xl"
            />
            <div className="relative">{children}</div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-4 text-[10.5px] text-[hsl(var(--muted-foreground))] sm:px-8">
          <span>AstraCode</span>
          <span>Encrypted in transit</span>
        </div>
      </div>
    </div>
  );
}
