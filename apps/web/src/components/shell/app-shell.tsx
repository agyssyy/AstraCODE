"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Boxes,
  ChevronDown,
  Code2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  Settings,
  X,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  buttonVariants,
  cn,
} from "@astracode/ui";
import type { PublicUser } from "@astracode/shared";
import { Logo } from "@/components/brand/logo";
import { FloatingChat } from "@/components/chat/floating-chat";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { activeFor, navGroups, pageTitles } from "@/components/shell/nav-config";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import { useUiStore } from "@/store/ui";

function SidebarContent({
  user,
  onNavigate,
  onClose,
}: {
  user: PublicUser;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-[hsl(var(--signal))]/10 blur-3xl"
      />
      <div className="relative flex h-[68px] shrink-0 items-center justify-between border-b border-[hsl(var(--border))]/70 px-4">
        <Link href="/dashboard" onClick={onNavigate} aria-label="AstraCode dashboard" className="group flex items-center gap-2.5">
          <Logo size={24} showWordmark={false} />
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-[-0.02em]">AstraCode</span>
            <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Workspace</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/60 px-2 py-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
            OSS
          </span>
          {onClose ? (
            <button
              type="button"
              aria-label="Close menu"
              className="flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative p-3">
        <Link href="/chat" onClick={onNavigate} className="group block">
          <Button className="h-10 w-full justify-between rounded-xl bg-gradient-to-br from-[hsl(var(--signal))] to-[hsl(var(--violet))] text-[hsl(var(--signal-foreground))] shadow-[0_14px_30px_-16px_hsl(var(--signal)/0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-16px_hsl(var(--signal)/0.9)]" size="sm">
            <span className="flex items-center gap-2">
              <MessageSquarePlus className="size-3.5 transition-transform duration-300 group-hover:rotate-6" />
              New chat
            </span>
            <span className="rounded-md border border-current/25 px-1.5 py-0.5 font-mono text-[9px] opacity-70">
              N
            </span>
          </Button>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-2 font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]/75">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = activeFor(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      data-active={active}
                      className={cn(
                        "nav-pill group relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium",
                        active
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/70 hover:text-[hsl(var(--foreground))]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[15.5px] transition-transform duration-300 group-hover:scale-110",
                          active
                            ? "text-[hsl(var(--signal))]"
                            : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/60 px-1.5 py-0.5 font-mono text-[8px] font-medium text-[hsl(var(--muted-foreground))]">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-[hsl(var(--border))]/70 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-transparent p-2 text-left transition-all hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--card))]/70"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--signal))]/25 to-[hsl(var(--violet))]/20 text-[10px] font-semibold text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--signal))]/20">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{user.name}</span>
                <span className="block truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                  {user.email}
                </span>
              </span>
              <ChevronDown className="size-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/settings" onClick={onNavigate}>
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/docs" onClick={onNavigate}>
                <BookOpen /> Documentation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="text-[hsl(var(--destructive))]">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mt-3 flex items-center justify-between px-2 pt-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]/80">
          <span className="inline-flex items-center gap-1.5">
            <span className="live-dot size-1.5 rounded-full bg-[hsl(var(--success))]" />
            All systems normal
          </span>
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  );
}

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/chat", label: "Chat", icon: MessageSquare, exact: false },
  { href: "/studio", label: "Studio", icon: Code2, exact: false },
  { href: "/models", label: "Models", icon: Boxes, exact: false },
];

function MobileNav({ pathname, onMore }: { pathname: string; onMore: () => void }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-5">
        {mobileItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-11 items-center justify-center rounded-lg transition-colors",
                  active && "bg-[hsl(var(--accent))]",
                )}
              >
                <Icon className={cn("size-[17px]", active && "text-[hsl(var(--signal))]")} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          <span className="flex h-7 w-11 items-center justify-center">
            <Menu className="size-[17px]" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}

export function AppShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const page = pageTitles[pathname] ?? { title: "AstraCode", description: "" };

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const flush = pathname.startsWith("/chat") || pathname.startsWith("/studio");

  return (
    <div className="min-h-dvh bg-[hsl(var(--background))]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] border-r border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] lg:block">
        <SidebarContent user={user} />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-[fade-in_180ms_ease-out_both] bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] animate-[slide-in-left_260ms_cubic-bezier(0.16,1,0.3,1)_both] border-r border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] shadow-2xl">
            <SidebarContent
              user={user}
              onNavigate={() => setSidebarOpen(false)}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/85 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <h1 className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
                {page.title}
              </h1>
              <span className="hidden truncate border-l border-[hsl(var(--border))] pl-2.5 text-[11.5px] text-[hsl(var(--muted-foreground))] md:inline">
                {page.description}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[10.5px] font-medium text-[hsl(var(--muted-foreground))] sm:flex">
              <span className="live-dot size-1.5 rounded-full bg-[hsl(var(--success))]" />
              Local
            </span>
            <Tooltip content="Docs">
              <Link
                href="/docs"
                aria-label="Documentation"
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <BookOpen />
              </Link>
            </Tooltip>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 flex size-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
                  aria-label="Account menu"
                >
                  {initials(user.name)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="normal-case tracking-normal text-[12px] text-[hsl(var(--foreground))]">
                  {user.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={async () => {
                    await api.post("/auth/logout").catch(() => null);
                    window.location.href = "/login";
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          className={cn(
            flush
              ? "h-[calc(100svh-8rem)] overflow-hidden lg:h-[calc(100svh-3.5rem)]"
              : "min-h-[calc(100svh-3.5rem)] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10",
          )}
        >
          {flush ? (
            <div key={pathname} className="page-enter h-full">
              {children}
            </div>
          ) : (
            <div key={pathname} className="page-enter mx-auto w-full max-w-[1320px]">
              {children}
            </div>
          )}
        </main>
      </div>

      <MobileNav pathname={pathname} onMore={() => setSidebarOpen(true)} />
      {!pathname.startsWith("/chat") && !pathname.startsWith("/studio") ? (
        <FloatingChat />
      ) : null}
    </div>
  );
}
