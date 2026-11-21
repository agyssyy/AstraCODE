import * as React from "react";
import { cn } from "../lib/utils.js";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-1 text-[13.5px] text-[hsl(var(--foreground))] shadow-xs transition-[border-color,box-shadow] placeholder:text-[hsl(var(--muted-foreground))]/80 hover:border-[hsl(var(--foreground))]/20 focus-visible:border-[hsl(var(--signal))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--signal))]/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] text-[hsl(var(--foreground))] shadow-xs transition-[border-color,box-shadow] placeholder:text-[hsl(var(--muted-foreground))]/80 hover:border-[hsl(var(--foreground))]/20 focus-visible:border-[hsl(var(--signal))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--signal))]/15 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[13px] font-medium leading-none text-[hsl(var(--foreground))] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
      ) : null}
    </div>
  );
}
