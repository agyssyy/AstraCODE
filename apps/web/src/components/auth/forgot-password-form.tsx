"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { Button, Field, Input } from "@astracode/ui";
import { emailSchema } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    setPending(true);
    try {
      await api.post("/auth/forgot-password", { email: parsed.data });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] shadow-xs">
          <MailCheck className="size-3.5 text-[hsl(var(--signal))]" />
          Check your inbox
        </p>
        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em]">
          Reset link sent
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          If an account exists for <span className="font-medium text-[hsl(var(--foreground))]">{email}</span>,
          a one-time reset link is on its way. It expires in 30 minutes.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 text-[12.5px] font-medium text-[hsl(var(--primary))] hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
        <p className="mt-10 border-t border-[hsl(var(--border))] pt-4 text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          Nothing after a minute? Check spam, then request another link.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] shadow-xs">
        <span className="size-1.5 rounded-full bg-[hsl(var(--signal))]" />
        Account recovery
      </p>
      <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em]">
        Forgot your password?
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        Enter the email on your account and we will send a one-time link to choose a new password.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        {error ? (
          <div
            role="alert"
            className="border-l-2 border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/8 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[hsl(var(--destructive))]"
          >
            {error}
          </div>
        ) : null}

        <Button type="submit" className="h-11 w-full" size="lg" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <>
              Send reset link <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-[hsl(var(--primary))] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
