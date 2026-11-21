import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]",
        secondary:
          "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
        outline: "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
        signal:
          "border-transparent bg-[hsl(var(--signal))]/12 text-[hsl(var(--signal))]",
        success:
          "border-transparent bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]",
        warning:
          "border-transparent bg-[hsl(var(--warning))]/14 text-[hsl(var(--warning))]",
        destructive:
          "border-transparent bg-[hsl(var(--destructive))]/12 text-[hsl(var(--destructive))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
