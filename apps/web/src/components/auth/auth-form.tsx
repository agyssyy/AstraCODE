"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  MailCheck,
  User,
} from "lucide-react";
import { Button, Field, Input } from "@astracode/ui";
import { loginSchema, registerSchema } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";

type LoginResult = {
  twoFactorRequired?: boolean;
  challengeId?: string;
  email?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  const existing = document.getElementById("google-gsi") as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
}

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

function ModeTabs({
  mode,
  onSelect,
}: {
  mode: "login" | "register";
  onSelect: (mode: "login" | "register") => void;
}) {
  const tabs = [
    { mode: "login" as const, label: "Log in" },
    { mode: "register" as const, label: "Sign up" },
  ];
  const active = mode === "register" ? 1 : 0;

  return (
    <div
      role="tablist"
      aria-label="Authentication mode"
      className="relative grid grid-cols-2 gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/70 p-1"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-[hsl(var(--card))] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_10px_24px_-16px_hsl(var(--primary)/0.7)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          active === 0 ? "translate-x-0" : "translate-x-full"
        }`}
      />
      {tabs.map((tab) => {
        const selected = tab.mode === mode;
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.mode)}
            className={
              selected
                ? "relative z-10 rounded-lg py-2 text-center text-[12.5px] font-semibold text-[hsl(var(--foreground))] transition-colors"
                : "relative z-10 rounded-lg py-2 text-center text-[12.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AuthForm({ mode: initialMode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"login" | "register">(initialMode);
  const params = useSearchParams();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(() => params.get("error"));
  const [googleEnabled, setGoogleEnabled] = React.useState(false);
  const [googleClientId, setGoogleClientId] = React.useState("");
  const [googlePending, setGooglePending] = React.useState(false);
  const googleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fields, setFields] = React.useState({
    name: "",
    username: "",
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
  const [showPassword, setShowPassword] = React.useState(false);

  const nextParam = params.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam
      : "/dashboard";

  React.useEffect(() => {
    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const config = await api.get<{ googleEnabled?: boolean; googleClientId?: string }>(
          "/auth/config",
        );
        if (!active) return;
        setGoogleEnabled(Boolean(config.googleEnabled));
        setGoogleClientId(config.googleClientId ?? "");
      } catch {
        if (!active || attempt >= 3) return;
        attempt += 1;
        timer = setTimeout(load, attempt * 1200);
      }
    };

    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const switchMode = (next: "login" | "register") => {
    if (next === mode) return;
    setMode(next);
    const path = next === "login" ? "/login" : "/register";
    window.history.replaceState(null, "", `${path}${window.location.search}`);
    document.title = next === "login" ? "Sign in · AstraCode" : "Create account · AstraCode";
  };

  const finish = () => {
    router.push(next);
    router.refresh();
  };

  const clearGoogleTimer = () => {
    if (googleTimer.current) {
      clearTimeout(googleTimer.current);
      googleTimer.current = null;
    }
  };

  React.useEffect(() => () => clearGoogleTimer(), []);

  const completeGoogle = async (response: GoogleTokenResponse) => {
    clearGoogleTimer();
    if (!response.access_token) {
      setError(response.error_description || "Google sign-in was cancelled.");
      setGooglePending(false);
      return;
    }
    try {
      const result = await api.post<LoginResult>("/auth/google/token", {
        accessToken: response.access_token,
      });
      if (result.twoFactorRequired && result.challengeId) {
        setChallenge({ id: result.challengeId, email: result.email ?? "" });
        setStage("code");
        setCode("");
        setCooldown(30);
        setGooglePending(false);
        return;
      }
      finish();
    } catch (err) {
      setError(errorMessage(err));
      setGooglePending(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGooglePending(true);
    try {
      await loadGoogleScript();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2 || !googleClientId) {
        throw new Error("Google sign-in is not configured. Add the site as an authorized origin in Google Cloud.");
      }
      const client = oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        callback: (response) => {
          void completeGoogle(response);
        },
      });
      googleTimer.current = setTimeout(() => {
        setGooglePending(false);
        setError("Google sign-in timed out. Close any blocked popup and try again.");
      }, 90_000);
      client.requestAccessToken({ prompt: "select_account" });
    } catch (err) {
      clearGoogleTimer();
      setError(errorMessage(err));
      setGooglePending(false);
    }
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
      const data = parsed.data as {
        name?: string;
        username?: string;
        email: string;
        password: string;
      };
      const result =
        mode === "login"
          ? await api.post<LoginResult>("/auth/login", {
              email: data.email,
              password: data.password,
            })
          : await api.post<LoginResult>("/auth/register", {
              name: data.name ?? "",
              username: data.username || undefined,
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
      <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 px-3 py-1 text-[10.5px] font-medium text-[hsl(var(--muted-foreground))]">
        <span className="size-1.5 rounded-full bg-[hsl(var(--signal))] shadow-[0_0_10px_hsl(var(--signal))]" />
        {mode === "login" ? "Welcome back" : "Free workspace"}
      </p>
      <h1 className="mt-4 text-[28px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[32px]">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        {mode === "login"
          ? "Sign in to pick up where you left off."
          : "Your assistant is ready. Google creates the workspace for you."}
      </p>

      <div className="mt-6 space-y-4">
        {googleEnabled && googleClientId ? (
          <button
            type="button"
            onClick={onGoogle}
            disabled={googlePending}
            className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12.5px] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all hover:border-[hsl(var(--signal))]/40 hover:bg-[hsl(var(--muted))]/60 hover:shadow-[0_12px_30px_-22px_hsl(var(--primary)/0.8)] disabled:opacity-60"
          >
            {googlePending ? <LoaderCircle className="size-4 animate-spin" /> : <GoogleMark />}
            Continue with Google
            <ArrowUpRight className="size-3.5 text-[hsl(var(--muted-foreground))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        ) : null}

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[hsl(var(--border))]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
            or use email
          </span>
          <span className="h-px flex-1 bg-[hsl(var(--border))]" />
        </div>

        <ModeTabs mode={mode} onSelect={switchMode} />
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
        {mode === "register" ? (
          <>
            <Field label="Name" htmlFor="name">
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={fields.name}
                  onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
                  className="h-12 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45 pl-10 shadow-xs"
                  required
                />
              </div>
            </Field>
            <Field
              label="Username"
              htmlFor="username"
              hint="Optional · letters, numbers and underscores."
            >
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="ada_lovelace"
                  value={fields.username}
                  onChange={(e) => setFields((f) => ({ ...f, username: e.target.value }))}
                  className="h-12 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45 pl-10 shadow-xs"
                />
              </div>
            </Field>
          </>
        ) : null}
        <Field label="Email" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={fields.email}
              onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
              className="h-12 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45 pl-10 shadow-xs"
              required
            />
          </div>
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={mode === "register" ? "At least 10 characters." : undefined}
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••••"
              value={fields.password}
              onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
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
        </motion.div>

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
            className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--destructive))]/25 bg-[hsl(var(--destructive))]/8 px-3.5 py-3 text-[12px] leading-relaxed text-[hsl(var(--destructive))]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--violet)))] shadow-[0_16px_40px_-18px_hsl(var(--primary)/0.9)]"
          size="lg"
          disabled={pending}
        >
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

      <p className="mt-6 border-t border-[hsl(var(--border))] pt-4 text-center text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        This self-hosted instance stores your projects and provider configuration on your
        machine.
      </p>
    </div>
  );
}
