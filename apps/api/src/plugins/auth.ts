import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { allowedOrigins } from "../env.js";
import { unauthorized } from "../lib/errors.js";
import { resolveSession, SESSION_COOKIE } from "../lib/session.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function registerAuth(app: FastifyInstance): void {
  app.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    const resolved = await resolveSession(app.db, request);
    if (!resolved) throw unauthorized();
    request.user = resolved.user;
    request.sessionId = resolved.sessionId;
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!MUTATING.has(request.method)) return;
    const origin = request.headers.origin;
    const hasSessionCookie = Boolean(request.cookies?.[SESSION_COOKIE]);
    if (origin) {
      if (!allowedOrigins.has(origin)) {
        return reply.status(403).send({
          error: { code: "csrf", message: "Request origin is not allowed." },
        });
      }
      return;
    }
    if (hasSessionCookie) {
      return reply.status(403).send({
        error: { code: "csrf", message: "Missing Origin header on a state-changing request." },
      });
    }
  });
}
