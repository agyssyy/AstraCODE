import { cn } from "@astracode/ui";

export function AstraMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <img
      src="/brand-mark.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0 rounded-[22%] object-cover", className)}
    />
  );
}

export function Logo({
  className,
  size = 28,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AstraMark size={size} />
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))]">
          Astra<span className="text-[hsl(var(--muted-foreground))]">Code</span>
        </span>
      ) : null}
    </span>
  );
}
