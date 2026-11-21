import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { apiRequests } from "@astracode/database";
import type { HeaderPair } from "@astracode/shared";
import { apiSendSchema } from "@astracode/shared";
import { maskHeaderValue } from "../lib/crypto.js";
import { badRequest, notFound, parseWith } from "../lib/errors.js";

const MAX_RESPONSE_CHARS = 400_000;
const TIMEOUT_MS = 20_000;

async function readLimited(
  response: Response,
  limit: number,
): Promise<{ text: string; bytes: number; truncated: boolean }> {
  if (!response.body) return { text: "", bytes: 0, truncated: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (text.length < limit) {
        text += decoder.decode(value, { stream: true });
        if (text.length > limit) {
          text = text.slice(0, limit);
          truncated = true;
        }
      } else {
        truncated = true;
      }
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return { text, bytes, truncated };
}

export async function apiCenterRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api-center/send",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 40, timeWindow: "1 minute" } },
    },
    async (request) => {
      const body = parseWith(apiSendSchema, request.body);
      const headers: Record<string, string> = {};
      for (const pair of body.headers) {
        if (!pair.key.trim()) continue;
        if (!/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/.test(pair.key.trim())) {
          throw badRequest(`Invalid header name: ${pair.key}`);
        }
        headers[pair.key.trim()] = pair.value;
      }

      const method = body.method;
      const started = performance.now();
      let response: Response;
      try {
        response = await fetch(body.url, {
          method,
          headers,
          body: method === "GET" || method === "HEAD" ? undefined : body.body ?? undefined,
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        const message =
          error instanceof Error && /timeout|aborted/i.test(error.message)
            ? `Request timed out after ${TIMEOUT_MS / 1000}s.`
            : `Request failed: ${error instanceof Error ? error.message : "unknown error"}`;
        throw badRequest(message);
      }

      const latencyMs = Math.round(performance.now() - started);
      const { text, bytes, truncated } = await readLimited(response, MAX_RESPONSE_CHARS);
      const responseHeaders: HeaderPair[] = [];
      response.headers.forEach((value, key) => {
        responseHeaders.push({ key, value });
      });

      const sanitizedHeaders = body.headers.map((pair) => ({
        key: pair.key,
        value: pair.key ? maskHeaderValue(pair.key, pair.value) : pair.value,
      }));

      const inserted = await app.db
        .insert(apiRequests)
        .values({
          userId: request.user.id,
          method,
          url: body.url,
          headers: sanitizedHeaders,
          body: body.body ? body.body.slice(0, 100_000) : null,
          status: response.status,
          responseSnippet: text.slice(0, 4000),
          latencyMs,
        })
        .returning();

      const contentType = response.headers.get("content-type") ?? "";
      return {
        id: inserted[0]!.id,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: text,
        latencyMs,
        sizeBytes: bytes,
        truncated,
        isText: contentType.includes("json") || contentType.includes("text") || contentType.includes("xml") || contentType.includes("javascript") || contentType === "",
        createdAt: inserted[0]!.createdAt.toISOString(),
      };
    },
  );

  app.get("/api-center/history", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select()
      .from(apiRequests)
      .where(eq(apiRequests.userId, request.user.id))
      .orderBy(desc(apiRequests.createdAt))
      .limit(60);
    return {
      history: rows.map((row) => ({
        id: row.id,
        method: row.method,
        url: row.url,
        headers: row.headers,
        body: row.body,
        status: row.status,
        responseSnippet: row.responseSnippet,
        latencyMs: row.latencyMs,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

  app.delete<{ Params: { id: string } }>(
    "/api-center/history/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const rows = await app.db
        .select({ id: apiRequests.id })
        .from(apiRequests)
        .where(
          and(eq(apiRequests.id, request.params.id), eq(apiRequests.userId, request.user.id)),
        )
        .limit(1);
      if (!rows[0]) throw notFound("Request not found");
      await app.db.delete(apiRequests).where(eq(apiRequests.id, rows[0].id));
      return { ok: true };
    },
  );

  app.delete("/api-center/history", { preHandler: app.authenticate }, async (request) => {
    await app.db.delete(apiRequests).where(eq(apiRequests.userId, request.user.id));
    return { ok: true };
  });
}
