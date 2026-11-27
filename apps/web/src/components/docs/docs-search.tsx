"use client";

import * as React from "react";
import { Search } from "lucide-react";

export function DocsSearch({ sections }: { sections: { id: string; label: string }[] }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const term = query.trim().toLowerCase();
  const results = term
    ? sections.filter((section) => section.label.toLowerCase().includes(term))
    : sections.slice(0, 6);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (id: string) => {
    setOpen(false);
    setQuery("");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="glass-pill flex h-10 items-center gap-2 rounded-full px-3.5">
        <Search className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) go(results[0].id);
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search documentation…"
          aria-label="Search documentation"
          className="w-full bg-transparent text-[12px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]/70"
        />
        <kbd className="hidden rounded-md border border-[hsl(var(--border))]/70 px-1.5 py-0.5 font-mono text-[8.5px] text-[hsl(var(--muted-foreground))] sm:inline">
          /
        </kbd>
      </div>
      {open ? (
        <div className="glass-strong absolute inset-x-0 top-12 z-30 overflow-hidden rounded-2xl p-1.5 shadow-2xl">
          {results.length ? (
            results.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => go(section.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] text-[hsl(var(--foreground))]/80 transition-colors hover:bg-white/[0.08]"
              >
                {section.label}
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                  section
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              No section matches “{query}”.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
