import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils.js";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 pr-8 text-[13.5px] text-[hsl(var(--foreground))] shadow-xs transition-[border-color,box-shadow] hover:border-[hsl(var(--foreground))]/20 focus-visible:border-[hsl(var(--signal))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--signal))]/15 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
);
Select.displayName = "Select";
