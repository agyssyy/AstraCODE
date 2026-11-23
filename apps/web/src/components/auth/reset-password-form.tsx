"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, Eye, EyeOff, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { Button, Field, Input } from "@astracode/ui";
import { passwordSchema } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("This reset link is missing its token. Request a new link.");
      return;
    }
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await api.post("/auth/reset-password", { token, password: parsed.data });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] shadow-xs">
          <ShieldCheck className="size-3.5 text-[hsl(var(--success))]" />
          Password updated
        </p>
        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em]">
          You are all set
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          Your password changed and every other session was signed out. Continue with your new
          password and the usual email code.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-[13px] font-semibold text-[hsl(var(--primary-foreground))]"
        >
          <Check className="size-4" /> Sign in
        </Link>
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
        Choose a new password
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        Use at least 10 characters. The link works once and expires after 30 minutes.
      </p>

      {!token ? (
        <div className="mt-6 border-l-2 border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/8 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[hsl(var(--destructive))]">
          This link is missing its token.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <Field label="New password" htmlFor="password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45 pl-10 pr-11 shadow-xs"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-12 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45 pl-10 shadow-xs"
              required
            />
          </div>
        </Field>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--destructive))]/25 bg-[hsl(var(--destructive))]/8 px-3.5 py-3 text-[12px] leading-relaxed text-[hsl(var(--destructive))]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" className="h-12 w-full rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--violet)))] shadow-[0_16px_40px_-18px_hsl(var(--primary)/0.9)]" size="lg" disabled={pending || !token}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <>
              Update password <Check className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
        <Link href="/login" className="font-medium text-[hsl(var(--primary))] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
