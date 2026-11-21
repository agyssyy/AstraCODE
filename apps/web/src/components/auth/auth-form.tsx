"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { Button, Field, Input } from "@astracode/ui";
import { loginSchema, registerSchema } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";

type LoginResult = {
  twoFactorRequired?: boolean;
  challengeId?: string;
  email?: string;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(() => params.get("error"));
  const [googleEnabled, setGoogleEnabled] = React.useState(false);
  const [fields, setFields] = React.useState({
    name: "",
    email: "",
    password: "",
  });
  const challengeParam = params.get("challenge");
  const emailParam = params.get("email");
  const [stage, setStage] = React.useState<"credentials" | "code">(
    challengeParam ? "code" : "credentials",
  );
  const [challenge, setChallenge] = React.useState<{ id: string; email: string } | null>(
    challengeParam ? { id: challengeParam, email: emailParam ?? "" } : null,
  );
  const [code, setCode] = React.useState("");
  const [cooldown, setCooldown] = React.useState(0);

  const nextParam = params.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  React.useEffect(() => {
    let active = true;
    api
      .get<{ googleEnabled?: boolean }>("/auth/config")
      .then((config) => {
        if (active) setGoogleEnabled(Boolean(config.googleEnabled));
      })
      .catch(() => {
        /* Google is optional; keep the password form working. */
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const finish = () => {
    router.push(next);
    router.refresh();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const schema = mode === "login" ? loginSchema : registerSchema;
    const parsed = schema.safeParse(fields);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setPending(true);
    try {
      const data = parsed.data as { name?: string; email: string; password: string };
      const result =
        mode === "login"
          ? await api.post<LoginResult>("/auth/login", {
              email: data.email,
              password: data.password,
            })
          : await api.post<LoginResult>("/auth/register", {
              name: data.name ?? "",
              email: data.email,
              password: data.password,
            });
      if (result.twoFactorRequired && result.challengeId) {
        setChallenge({ id: result.challengeId, email: result.email ?? data.email });
        setStage("code");
        setCode("");
        setCooldown(30);
        setPending(false);
        return;
      }
      finish();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  };

  const onVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setPending(true);
    try {
      await api.post("/auth/2fa/verify", {
        challengeId: challenge.id,
        code: code.trim(),
      });
      finish();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  };

  const onResend = async () => {
    if (!challenge || cooldown > 0) return;
    setError(null);
    setPending(true);
    try {
      await api.post("/auth/2fa/resend", { challengeId: challenge.id });
      setCooldown(30);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (stage === "code" && challenge) {
    return (
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] shadow-xs">
          <MailCheck className="size-3.5 text-[hsl(var(--signal))]" />
          Two-step verification
        </p>
        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em]">
          Check your email
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-[hsl(var(--foreground))]">{challenge.email}</span>. It
          expires in 10 minutes.
        </p>

        <form onSubmit={onVerify} className="mt-8 space-y-5" noValidate>
          <Field label="Verification code" htmlFor="code" hint="The email subject contains the code.">
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center font-mono text-[24px] tracking-[0.45em]"
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

          <Button
            type="submit"
            className="h-11 w-full"
            size="lg"
            disabled={pending || code.length !== 6}
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <>
                Verify and sign in
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => {
                setStage("credentials");
                setChallenge(null);
                setCode("");
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <ArrowLeft className="size-3.5" />
              Use another account
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={cooldown > 0 || pending}
              className="font-medium text-[hsl(var(--primary))] hover:underline disabled:text-[hsl(var(--muted-foreground))] disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>

        <p className="mt-10 border-t border-[hsl(var(--border))] pt-4 text-center text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          No email after a minute? Check spam, then resend. Codes are single-use.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] shadow-xs">
        <span className="size-1.5 rounded-full bg-[hsl(var(--signal))]" />
        {mode === "login" ? "Welcome back" : "Free workspace"}
      </p>
      <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.04em]">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        {mode === "login"
          ? "Enter your credentials to open the workspace."
          : "Astra Assistant is ready as soon as you are. No provider setup required."}
      </p>

      {googleEnabled ? (
        <div className="mt-7">
          <a
            href={`/backend/auth/google/start?next=${encodeURIComponent(next)}`}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12.5px] font-medium transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <GoogleMark />
            Continue with Google
          </a>
          <p className="mt-2 text-center text-[10.5px] text-[hsl(var(--muted-foreground))]">
            First Google sign-in creates the workspace automatically.
          </p>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              or use email
            </span>
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className={googleEnabled ? "space-y-5" : "mt-8 space-y-5"} noValidate>
        {mode === "register" ? (
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={fields.name}
              onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
        ) : null}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={fields.email}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={mode === "register" ? "At least 10 characters." : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••••"
            value={fields.password}
            onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </Field>

        {mode === "login" ? (
          <div className="-mt-1 text-right">
            <Link
              href="/forgot-password"
              className="text-[11.5px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        ) : null}

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
              {mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
        {mode === "login" ? (
          <>
            New to AstraCode?{" "}
            <Link href="/register" className="font-medium text-[hsl(var(--primary))] hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[hsl(var(--primary))] hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>

      <p className="mt-10 border-t border-[hsl(var(--border))] pt-4 text-center text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        This self-hosted instance stores your projects and provider configuration on your
        machine.
      </p>
    </div>
  );
}
