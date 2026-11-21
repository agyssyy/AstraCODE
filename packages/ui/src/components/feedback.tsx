import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../lib/utils.js";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]", className)}>
      <LoaderCircle className="size-3.5 animate-spin" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[hsl(var(--muted))]",
        className,
      )}
    />
  );
}

export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      role="separator"
      className={cn(
        "shrink-0 bg-[hsl(var(--border))]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]", className)}>
      <div
        className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-300"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
