import type { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, gt, isNull } from "drizzle-orm";
import { sessions, users } from "@astracode/database";
import type { Database } from "@astracode/database";
import type { PublicUser } from "@astracode/shared";
import { env } from "../env.js";
import { randomToken, sha256 } from "./crypto.js";

export const SESSION_COOKIE = "astra_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function publicUser(row: typeof users.$inferSelect): PublicUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? null,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createSession(
  db: Database,
  userId: string,
  request: FastifyRequest,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    userAgent: (request.headers["user-agent"] ?? "").slice(0, 400) || null,
    ip: request.ip?.slice(0, 60) ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.webOrigin.startsWith("https://"),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.setCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.webOrigin.startsWith("https://"),
    path: "/",
    maxAge: 0,
  });
}

export async function resolveSession(
  db: Database,
  request: FastifyRequest,
): Promise<{ user: PublicUser; sessionId: string } | null> {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = sha256(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      lastUsedAt: sessions.lastUsedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (Date.now() - row.lastUsedAt.getTime() > 1000 * 60 * 60) {
    await db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, row.sessionId));
  }

  return {
    user: {
      id: row.userId,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
    },
    sessionId: row.sessionId,
  };
}

export function sessionTokenFromRequest(request: FastifyRequest): string | null {
  return request.cookies[SESSION_COOKIE] ?? null;
}
