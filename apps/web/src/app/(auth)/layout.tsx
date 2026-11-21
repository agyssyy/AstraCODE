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

      <div className="flex min-h-dvh flex-col">
        <div className="flex h-16 items-center justify-between border-b border-[hsl(var(--border))] px-4 lg:justify-end lg:border-b-0 lg:px-8">
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

        <div className="flex flex-1 items-center justify-center px-4 pb-14 pt-6 sm:px-8 lg:pb-20">
          <div className="w-full max-w-[390px]">{children}</div>
        </div>

        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-4 text-[10.5px] text-[hsl(var(--muted-foreground))] sm:px-8">
          <span>AstraCode</span>
          <span>Encrypted in transit</span>
        </div>
      </div>
    </div>
  );
}
