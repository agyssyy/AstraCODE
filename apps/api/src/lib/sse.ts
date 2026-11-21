import type { FastifyReply, FastifyRequest } from "fastify";
import { allowedOrigins } from "../env.js";

export function openSse(
  request: FastifyRequest,
  reply: FastifyReply,
): { send: (event: string, data: unknown) => void; end: () => void; closed: () => boolean } {
  const origin = request.headers.origin;
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }

  reply.hijack();
  reply.raw.writeHead(200, headers);
  let finished = false;

  return {
    send(event, data) {
      if (finished || reply.raw.writableEnded) return;
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (finished) return;
      finished = true;
      if (!reply.raw.writableEnded) reply.raw.end();
    },
    closed() {
      return finished || reply.raw.writableEnded || reply.raw.destroyed;
    },
  };
}
