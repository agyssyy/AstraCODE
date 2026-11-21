"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";

const links = [
  { href: "#assistant", label: "Assistant" },
  { href: "#platform", label: "Platform" },
  { href: "#architecture", label: "Architecture" },
  { href: "#open-source", label: "Open source" },
  { href: "/docs", label: "Docs" },
];

export function LandingHeader() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="AstraCode home" className="shrink-0">
          <Logo size={24} />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle sync={false} />
          <Link
            href="/login"
            className="hidden rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "sm" }), "group ml-0.5 hidden sm:inline-flex")}
          >
            Start building
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            onClick={() => setOpen((value) => !value)}
            className="ml-0.5 flex size-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
    </header>
      {open ? (
        <div id="marketing-mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 md:hidden">
          <div
            className="absolute inset-0 animate-[fade-in_160ms_ease-out_both] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] animate-[slide-in-right_260ms_cubic-bezier(0.16,1,0.3,1)_both] flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
              <p className="text-[12px] font-semibold">Menu</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 p-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between rounded-lg px-3 py-3 text-[14px] font-medium transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  {link.label}
                  <ArrowUpRight className="size-4 text-[hsl(var(--muted-foreground))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </nav>
            <div className="space-y-2 border-t border-[hsl(var(--border))] p-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Start building <ArrowRight className="size-4" />
              </Link>
              <p className="pt-2 text-center text-[10.5px] text-[hsl(var(--muted-foreground))]">
                Apache-2.0 · Self-hosted
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
