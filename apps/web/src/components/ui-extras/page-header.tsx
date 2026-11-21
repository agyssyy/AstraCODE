import { cn } from "@astracode/ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">
            <span className="size-1.5 rounded-full bg-[hsl(var(--signal))]" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2.5 text-[27px] font-semibold leading-tight tracking-[-0.035em] sm:text-[32px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-2xl text-pretty text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
