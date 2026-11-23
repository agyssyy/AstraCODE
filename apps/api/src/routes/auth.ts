import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import {
  oauthAccounts,
  passwordResetTokens,
  sessions,
  twoFactorChallenges,
  users,
} from "@astracode/database";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  twoFactorDisableSchema,
  twoFactorEnableSchema,
  twoFactorResendSchema,
  twoFactorVerifySchema,
  type SessionInfo,
} from "@astracode/shared";
import { badRequest, conflict, parseWith, unauthorized } from "../lib/errors.js";
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  sha256,
  verifyPassword,
} from "../lib/crypto.js";
import {
  clearSessionCookie,
  createSession,
  publicUser,
  resolveSession,
  SESSION_COOKIE,
  setSessionCookie,
} from "../lib/session.js";
import { ensureSettings } from "../lib/settings.js";
import { SESSION_TTL_MS } from "../lib/session.js";
import { allowedOrigins, env, google } from "../env.js";
import {
  maskEmail,
  sendPasswordReset,
  sendSetupEmail,
  sendVerificationCode,
  systemSender,
  type MailDelivery,
} from "../lib/mail.js";

const TWO_FACTOR_TTL_MS = 10 * 60 * 1000;
const TWO_FACTOR_MAX_ATTEMPTS = 5;
const TWO_FACTOR_WINDOW_MS = 10 * 60 * 1000;

function codeHash(userId: string, code: string): string {
  return sha256(`${userId}:${code}`);
}

function newCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function deliveryFor(
  user: { twoFactorEmail: string | null; email: string; smtpPasswordCipher: string | null },
  to: string,
): MailDelivery | null {
  const perUser = decryptSecret(user.smtpPasswordCipher);
  if (perUser) {
    return { sender: { email: user.twoFactorEmail ?? user.email, appPassword: perUser }, to };
  }
  const system = systemSender();
  if (system) return { sender: system, to };
  return null;
}

async function startEmailChallenge(
  app: FastifyInstance,
  user: { id: string; email: string; twoFactorEmail: string | null; smtpPasswordCipher: string | null },
  mask = true,
) {
  const email = user.twoFactorEmail ?? user.email;
  const delivery = deliveryFor(user, email);
  if (!delivery) {
    throw badRequest(
      "Email verification is required but email delivery is not configured on this server.",
    );
  }

  const recent = await app.db
    .select({ id: twoFactorChallenges.id })
    .from(twoFactorChallenges)
    .where(
      and(
        eq(twoFactorChallenges.userId, user.id),
        gt(twoFactorChallenges.createdAt, new Date(Date.now() - TWO_FACTOR_WINDOW_MS)),
      ),
    );
  if (recent.length >= 3) {
    throw badRequest("Too many codes requested. Wait a few minutes and try again.");
  }

  const code = newCode();
  const created = await app.db
    .insert(twoFactorChallenges)
    .values({
      userId: user.id,
      codeHash: codeHash(user.id, code),
      expiresAt: new Date(Date.now() + TWO_FACTOR_TTL_MS),
    })
    .returning({ id: twoFactorChallenges.id });
  const challenge = created[0]!;

  try {
    await sendVerificationCode(delivery, code, 10);
  } catch {
    await app.db
      .delete(twoFactorChallenges)
      .where(eq(twoFactorChallenges.id, challenge.id));
    throw badRequest("Could not send the verification code. Try again in a moment.");
  }

  return {
    twoFactorRequired: true as const,
    challengeId: challenge.id,
    email: mask ? maskEmail(email) : email,
  };
}

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const OAUTH_COOKIE = "astra_oauth";
const OAUTH_COOKIE_TTL_SECONDS = 10 * 60;

type OAuthCookie = {
  state: string;
  verifier: string;
  redirectUri: string;
  next: string;
  origin: string;
};

function externalOrigin(request: FastifyRequest): string {
  const originHeader = request.headers.origin;
  if (typeof originHeader === "string" && allowedOrigins.has(originHeader)) {
    return originHeader;
  }
  const referer = request.headers.referer;
  if (typeof referer === "string") {
    try {
      const candidate = new URL(referer).origin;
      if (allowedOrigins.has(candidate)) return candidate;
    } catch {
      /* fall through */
    }
  }
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];
  const proto =
    (typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : "")?.trim() ||
    request.protocol ||
    "http";
  const host =
    (typeof forwardedHost === "string" ? forwardedHost.split(",")[0] : "")?.trim() ||
    request.headers.host ||
    new URL(env.webOrigin).host;
  try {
    const candidate = new URL(`${proto}://${host}`).origin;
    if (allowedOrigins.has(candidate)) return candidate;
  } catch {
    /* fall through */
  }
  return env.webOrigin;
}

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function readOAuthCookie(request: FastifyRequest): OAuthCookie | null {
  const raw = request.cookies?.[OAUTH_COOKIE];
  if (!raw) return null;
  try {
    const decoded = raw.startsWith("{") ? decodeURIComponent(raw) : Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<OAuthCookie>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.verifier !== "string" ||
      typeof parsed.redirectUri !== "string" ||
      typeof parsed.origin !== "string"
    ) {
      return null;
    }
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      redirectUri: parsed.redirectUri,
      next: safeNext(parsed.next),
      origin: parsed.origin,
    };
  } catch {
    return null;
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get("/auth/config", async () => ({
    googleEnabled: Boolean(google.clientId),
    googleClientId: google.clientId,
    emailCodeRequired: env.emailCodeRequired,
  }));

  app.post(
    "/auth/google/token",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = (request.body ?? {}) as { accessToken?: unknown };
      const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
      if (!accessToken || !google.clientId) {
        throw badRequest("Google sign-in is not configured on this server.");
      }

      const infoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      );
      const profile = (await infoResponse.json()) as {
        aud?: string;
        sub?: string;
        email?: string;
        email_verified?: string | boolean;
        name?: string;
      };
      const verified =
        profile.email_verified === true || profile.email_verified === "true";
      if (
        !infoResponse.ok ||
        !profile.sub ||
        !profile.email ||
        !verified ||
        (profile.aud && profile.aud !== google.clientId)
      ) {
        throw unauthorized("Google did not confirm a verified email for this account.");
      }

      const email = profile.email.toLowerCase();
      const linkRows = await app.db
        .select()
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, "google"),
            eq(oauthAccounts.providerAccountId, profile.sub),
          ),
        )
        .limit(1);
      let user = linkRows[0]
        ? (
            await app.db
              .select()
              .from(users)
              .where(eq(users.id, linkRows[0].userId))
              .limit(1)
          )[0]
        : undefined;

      if (!user) {
        const emailRows = await app.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        user = emailRows[0];
      }

      if (!user) {
        const created = await app.db
          .insert(users)
          .values({
            name: (profile.name || email.split("@")[0] || "Astra user").slice(0, 100),
            email,
            passwordHash: hashPassword(randomBytes(32).toString("hex")),
            emailVerifiedAt: new Date(),
          })
          .returning();
        user = created[0]!;
      } else if (!user.emailVerifiedAt) {
        await app.db
          .update(users)
          .set({
            passwordHash: hashPassword(randomBytes(32).toString("hex")),
            emailVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      if (!linkRows[0]) {
        await app.db
          .insert(oauthAccounts)
          .values({
            userId: user.id,
            provider: "google",
            providerAccountId: profile.sub,
            email,
          })
          .onConflictDoNothing();
      }

      await ensureSettings(app.db, user.id);

      if (env.emailCodeRequired || user.twoFactorEnabled) {
        const challenge = await startEmailChallenge(app, user);
        return {
          twoFactorRequired: true,
          challengeId: challenge.challengeId,
          email: challenge.email,
        };
      }

      const { token, expiresAt } = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token, expiresAt);
      return { ok: true };
    },
  );

  app.post(
    "/auth/register",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = parseWith(registerSchema, request.body);
      const existing = await app.db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      const existingUser = existing[0];

      if (body.username) {
        const usernameTaken = await app.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, body.username))
          .limit(1);
        if (usernameTaken[0] && usernameTaken[0].id !== existingUser?.id) {
          throw conflict("That username is already taken. Pick another one.");
        }
      }

      let user;
      if (existingUser) {
        if (existingUser.emailVerifiedAt) {
          throw conflict("An account with this email already exists. Sign in instead.");
        }
        const updated = await app.db
          .update(users)
          .set({
            name: body.name,
            username: body.username ?? null,
            passwordHash: hashPassword(body.password),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        user = updated[0]!;
        await app.db
          .delete(twoFactorChallenges)
          .where(eq(twoFactorChallenges.userId, user.id));
        await app.db.delete(sessions).where(eq(sessions.userId, user.id));
      } else {
        const created = await app.db
          .insert(users)
          .values({
            name: body.name,
            username: body.username ?? null,
            email: body.email,
            passwordHash: hashPassword(body.password),
          })
          .returning();
        user = created[0]!;
      }

      await ensureSettings(app.db, user.id);

      if (env.emailCodeRequired) {
        return reply.status(201).send(await startEmailChallenge(app, user, false));
      }

      const { token, expiresAt } = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token, expiresAt);
      return reply.status(201).send({ user: publicUser(user) });
    },
  );

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = parseWith(loginSchema, request.body);
      const found = await app.db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      const user = found[0];
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        throw unauthorized("Invalid email or password.");
      }
      if (env.emailCodeRequired || user.twoFactorEnabled) {
        return startEmailChallenge(app, user);
      }

      await ensureSettings(app.db, user.id);
      await app.db
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));

      const { token, expiresAt } = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token, expiresAt);
      return { user: publicUser(user) };
    },
  );

  app.post(
    "/auth/forgot-password",
    { config: { rateLimit: { max: 4, timeWindow: "1 minute" } } },
    async (request) => {
      const body = parseWith(forgotPasswordSchema, request.body);
      const found = await app.db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      const user = found[0];

      if (user) {
        const origin = env.webOrigin || externalOrigin(request);
        const token = randomBytes(32).toString("base64url");
        const now = new Date();
        await app.db
          .delete(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.userId, user.id),
              lt(passwordResetTokens.expiresAt, now),
            ),
          );
        await app.db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        });

        const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
        const recipients = [...new Set([user.email, user.twoFactorEmail].filter((value): value is string => Boolean(value)))];
        let queued = 0;
        for (const to of recipients) {
          const delivery = deliveryFor(user, to);
          if (!delivery) continue;
          queued += 1;
          void sendPasswordReset(delivery, resetUrl, 30).catch((error) => {
            request.log.warn({ err: error, to }, "Could not send password reset email");
          });
        }
        if (queued === 0) {
          request.log.warn("Password reset requested but email delivery is not configured");
        }
      }

      return { ok: true };
    },
  );

  app.post(
    "/auth/reset-password",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request) => {
      const body = parseWith(resetPasswordSchema, request.body);
      const tokenHash = sha256(body.token);
      const rows = await app.db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash))
        .limit(1);
      const reset = rows[0];
      if (
        !reset ||
        reset.consumedAt ||
        reset.expiresAt.getTime() < Date.now()
      ) {
        throw badRequest("This reset link is invalid or has expired. Request a new one.");
      }

      await app.db
        .update(users)
        .set({
          passwordHash: hashPassword(body.password),
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, reset.userId));
      await app.db
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetTokens.userId, reset.userId));
      await app.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, reset.userId), isNull(sessions.revokedAt)));
      await app.db
        .delete(twoFactorChallenges)
        .where(eq(twoFactorChallenges.userId, reset.userId));

      return { ok: true };
    },
  );

  app.get("/auth/google/start", async (request, reply) => {
    if (!google.configured) {
      throw badRequest("Google sign-in is not configured on this server.");
    }
    const origin = externalOrigin(request);
    const redirectUri =
      google.redirectUri || `${origin}/backend/auth/google/callback`;
    const state = randomBytes(24).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const cookie: OAuthCookie = {
      state,
      verifier,
      redirectUri,
      next: safeNext((request.query as { next?: unknown }).next),
      origin,
    };
    reply.setCookie(OAUTH_COOKIE, Buffer.from(JSON.stringify(cookie)).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/",
      maxAge: OAUTH_COOKIE_TTL_SECONDS,
    });

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", google.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "select_account");
    return reply.redirect(url.toString());
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    const saved = readOAuthCookie(request);
    const origin = saved?.origin ?? externalOrigin(request);
    reply.clearCookie(OAUTH_COOKIE, { path: "/" });

    const fail = (message: string) =>
      reply.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

    if (query.error) return fail("Google sign-in was cancelled.");
    if (!saved || !query.code || query.state !== saved.state) {
      return fail("Google sign-in could not be verified. Please try again.");
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: query.code,
          client_id: google.clientId,
          client_secret: google.clientSecret,
          redirect_uri: saved.redirectUri,
          grant_type: "authorization_code",
          code_verifier: saved.verifier,
        }),
      });
      const tokenData = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenResponse.ok || !tokenData.access_token) {
        return fail("Google sign-in failed. Please try again.");
      }

      const profileResponse = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
      );
      const profile = (await profileResponse.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      };
      if (
        !profileResponse.ok ||
        !profile.sub ||
        !profile.email ||
        profile.email_verified === false
      ) {
        return fail("Google did not confirm a verified email for this account.");
      }

      const email = profile.email.toLowerCase();
      const linkRows = await app.db
        .select()
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, "google"),
            eq(oauthAccounts.providerAccountId, profile.sub),
          ),
        )
        .limit(1);
      let user = linkRows[0]
        ? (
            await app.db
              .select()
              .from(users)
              .where(eq(users.id, linkRows[0].userId))
              .limit(1)
          )[0]
        : undefined;

      if (!user) {
        const emailRows = await app.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        user = emailRows[0];
      }

      if (!user) {
        const created = await app.db
          .insert(users)
          .values({
            name: (profile.name || email.split("@")[0] || "Astra user").slice(0, 100),
            email,
            passwordHash: hashPassword(randomBytes(32).toString("hex")),
            emailVerifiedAt: new Date(),
          })
          .returning();
        user = created[0]!;
      } else if (!user.emailVerifiedAt) {
        await app.db
          .update(users)
          .set({
            passwordHash: hashPassword(randomBytes(32).toString("hex")),
            emailVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      if (!linkRows[0]) {
        await app.db
          .insert(oauthAccounts)
          .values({
            userId: user.id,
            provider: "google",
            providerAccountId: profile.sub,
            email,
          })
          .onConflictDoNothing();
      }

      await ensureSettings(app.db, user.id);

      if (env.emailCodeRequired || user.twoFactorEnabled) {
        const challenge = await startEmailChallenge(app, user);
        return reply.redirect(
          `${origin}/login?challenge=${encodeURIComponent(challenge.challengeId)}` +
            `&email=${encodeURIComponent(challenge.email)}` +
            `&next=${encodeURIComponent(saved.next)}`,
        );
      }

      const { token, expiresAt } = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token, expiresAt);
      return reply.redirect(`${origin}${saved.next}`);
    } catch (error) {
      request.log.warn({ err: error }, "Google sign-in failed");
      return fail("Google sign-in failed. Please try again.");
    }
  });

  app.post(
    "/auth/2fa/verify",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = parseWith(twoFactorVerifySchema, request.body);
      const found = await app.db
        .select()
        .from(twoFactorChallenges)
        .where(eq(twoFactorChallenges.id, body.challengeId))
        .limit(1);
      const challenge = found[0];
      if (
        !challenge ||
        challenge.consumedAt ||
        challenge.expiresAt.getTime() < Date.now() ||
        challenge.attempts >= TWO_FACTOR_MAX_ATTEMPTS
      ) {
        throw unauthorized("That code is invalid or expired. Request a new one.");
      }

      if (challenge.codeHash !== codeHash(challenge.userId, body.code)) {
        await app.db
          .update(twoFactorChallenges)
          .set({ attempts: challenge.attempts + 1 })
          .where(eq(twoFactorChallenges.id, challenge.id));
        throw unauthorized("Incorrect code. Try again.");
      }

      await app.db
        .update(twoFactorChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(twoFactorChallenges.id, challenge.id));

      const foundUser = await app.db
        .select()
        .from(users)
        .where(eq(users.id, challenge.userId))
        .limit(1);
      const user = foundUser[0];
      if (!user) throw unauthorized("Account not found.");

      if (!user.emailVerifiedAt) {
        await app.db
          .update(users)
          .set({ emailVerifiedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      await ensureSettings(app.db, user.id);
      await app.db
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));
      const { token, expiresAt } = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token, expiresAt);
      return { user: publicUser(user) };
    },
  );

  app.post(
    "/auth/2fa/resend",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      const body = parseWith(twoFactorResendSchema, request.body);
      const found = await app.db
        .select()
        .from(twoFactorChallenges)
        .where(eq(twoFactorChallenges.id, body.challengeId))
        .limit(1);
      const challenge = found[0];
      if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
        throw badRequest("That verification request expired. Sign in again.");
      }
      if (challenge.createdAt.getTime() < Date.now() - TWO_FACTOR_WINDOW_MS) {
        throw badRequest("That verification request expired. Sign in again.");
      }

      const foundUser = await app.db
        .select()
        .from(users)
        .where(eq(users.id, challenge.userId))
        .limit(1);
      const user = foundUser[0];
      if (!user) throw badRequest("Email delivery is not configured for this account.");
      const email = user.twoFactorEmail ?? user.email;
      const delivery = deliveryFor(user, email);
      if (!delivery) {
        throw badRequest("Email delivery is not configured for this account.");
      }

      const code = newCode();
      await app.db
        .update(twoFactorChallenges)
        .set({
          codeHash: codeHash(user.id, code),
          attempts: 0,
          expiresAt: new Date(Date.now() + TWO_FACTOR_TTL_MS),
        })
        .where(eq(twoFactorChallenges.id, challenge.id));

      try {
        await sendVerificationCode(delivery, code, 10);
      } catch {
        throw badRequest("Could not resend the code. Try again in a moment.");
      }

      return { sent: true, email: maskEmail(email) };
    },
  );

  app.get("/auth/2fa", { preHandler: app.authenticate }, async (request) => {
    const found = await app.db
      .select({
        enabled: users.twoFactorEnabled,
        email: users.twoFactorEmail,
        accountEmail: users.email,
        cipher: users.smtpPasswordCipher,
      })
      .from(users)
      .where(eq(users.id, request.user.id))
      .limit(1);
    const row = found[0];
    const system = Boolean(systemSender());
    return {
      required: env.emailCodeRequired,
      enabled: env.emailCodeRequired || (row?.enabled ?? false),
      email: row?.email ?? row?.accountEmail ?? null,
      configured: Boolean(row?.cipher) || system,
      systemMailer: system,
    };
  });

  app.post(
    "/auth/2fa/enable",
    { preHandler: app.authenticate, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      const body = parseWith(twoFactorEnableSchema, request.body);
      const found = await app.db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);
      const row = found[0];
      if (!row || !verifyPassword(body.password, row.passwordHash)) {
        throw unauthorized("Password is incorrect.");
      }
      const system = systemSender();
      const appPassword = body.appPassword;
      if (!system && appPassword.length < 8) {
        throw badRequest("Enter your Gmail app password.");
      }
      const delivery: MailDelivery = system
        ? { sender: system, to: body.email }
        : { sender: { email: body.email, appPassword }, to: body.email };

      try {
        await sendSetupEmail(delivery);
      } catch {
        throw badRequest(
          system
            ? "The workspace email sender rejected the message. Check SMTP_USER and SMTP_PASS."
            : "Gmail rejected those credentials. Use a Gmail app password (not your normal password).",
        );
      }

      await app.db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorEmail: body.email,
          smtpPasswordCipher: system ? null : encryptSecret(appPassword),
          updatedAt: new Date(),
        })
        .where(eq(users.id, request.user.id));
      await app.db
        .delete(twoFactorChallenges)
        .where(eq(twoFactorChallenges.userId, request.user.id));

      return { enabled: true, email: body.email };
    },
  );

  app.post(
    "/auth/2fa/disable",
    { preHandler: app.authenticate, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      if (env.emailCodeRequired) {
        throw badRequest("Email verification is required for every sign-in on this server.");
      }
      const body = parseWith(twoFactorDisableSchema, request.body);
      const found = await app.db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);
      const row = found[0];
      if (!row || !verifyPassword(body.password, row.passwordHash)) {
        throw unauthorized("Password is incorrect.");
      }

      await app.db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorEmail: null,
          smtpPasswordCipher: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, request.user.id));
      await app.db
        .delete(twoFactorChallenges)
        .where(eq(twoFactorChallenges.userId, request.user.id));

      return { enabled: false };
    },
  );

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await app.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.tokenHash, sha256(token)));
    }
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    const settings = await ensureSettings(app.db, request.user.id);
    return {
      user: request.user,
      settings: {
        theme: settings.theme,
        language: settings.language,
        editorFontSize: settings.editorFontSize,
        editorTabSize: settings.editorTabSize,
        editorWordWrap: settings.editorWordWrap,
        defaultModelId: settings.defaultModelId,
        agentApprovalRequired: settings.agentApprovalRequired,
        privacyTelemetry: settings.privacyTelemetry,
      },
    };
  });

  app.get("/auth/sessions", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, request.user.id),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(sessions.createdAt));

    const list: SessionInfo[] = rows.map((row) => ({
      id: row.id,
      userAgent: row.userAgent,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      current: row.id === request.sessionId,
    }));
    return { sessions: list };
  });

  app.delete<{ Params: { id: string } }>(
    "/auth/sessions/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params;
      if (!/^[a-f0-9-]{36}$/i.test(id)) throw badRequest("Invalid session id");
      const rows = await app.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, id), eq(sessions.userId, request.user.id)))
        .limit(1);
      if (!rows[0]) throw badRequest("Session not found");
      await app.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.id, id));
      if (rows[0].id === request.sessionId) clearSessionCookie(reply);
      return { ok: true };
    },
  );

  app.get("/auth/session-policy", async () => ({
    sessionTtlDays: Math.round(SESSION_TTL_MS / 86_400_000),
  }));

  app.get("/auth/verify", async (request) => {
    const resolved = await resolveSession(app.db, request);
    return { authenticated: Boolean(resolved) };
  });
}
