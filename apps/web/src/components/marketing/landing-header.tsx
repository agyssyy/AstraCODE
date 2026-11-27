"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { Logo } from "@/components/brand/logo";

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#workflow", label: "Workflow" },
  { href: "#models", label: "Models" },
  { href: "#architecture", label: "Architecture" },
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
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="glass-panel mx-auto flex h-14 max-w-[1120px] items-center gap-3 rounded-full px-3 pl-4 sm:px-4 sm:pl-5">
          <Link href="/" aria-label="AstraCode home" className="shrink-0">
            <Logo size={23} />
          </Link>
          <nav className="ml-3 hidden items-center gap-0.5 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/90"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/login"
              className="hidden rounded-full px-3 py-1.5 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/90 sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "sm" }),
                "group hidden h-9 rounded-full px-4 text-[12px] shadow-[0_14px_32px_-16px_hsl(var(--signal)/0.9)] sm:inline-flex",
              )}
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
              className="glass-pill flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 md:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div id="marketing-mobile-menu" className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 animate-[fade-in_160ms_ease-out_both] bg-black/50 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div className="glass-strong absolute inset-x-3 top-3 animate-[slide-in-right_260ms_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-[28px] p-3 shadow-2xl">
            <div className="flex items-center justify-between px-2 py-1.5">
              <Logo size={22} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="glass-pill flex size-8 items-center justify-center rounded-full text-white/70"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="mt-3 grid gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between rounded-2xl px-3.5 py-3 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/[0.07]"
                >
                  {link.label}
                  <ArrowUpRight className="size-4 text-white/30 transition-colors group-hover:text-[hsl(var(--signal))]" />
                </a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="glass-pill flex h-11 items-center justify-center rounded-full text-[13px] font-medium text-white/80"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: "sm" }), "h-11 justify-center rounded-full text-[13px]")}
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
