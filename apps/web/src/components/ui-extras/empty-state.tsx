import type { LucideIcon } from "lucide-react";
import { cn } from "@astracode/ui";

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--signal))_0%,transparent_55%)] opacity-[0.045]"
      />
      <div
        className={cn(
          "relative flex flex-col items-center px-5 text-center",
          compact ? "py-8" : "py-11 sm:py-14",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--signal))] shadow-xs">
          <Icon className="size-5" />
        </span>
        {eyebrow ? (
          <p className="mt-4 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
        {description ? (
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
        {children}
      </div>
    </div>
  );
}
