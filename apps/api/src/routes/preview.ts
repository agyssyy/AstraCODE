import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import { verifyPreviewToken } from "../lib/crypto.js";
import { contentTypeFor, resolvePreviewFile } from "../lib/workspace.js";

const NOT_FOUND_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Preview</title>
<style>body{font-family:system-ui;background:#0b0b0f;color:#c9c9d8;display:grid;place-items:center;min-height:100vh;margin:0}
.card{max-width:420px;padding:2rem;border:1px solid #262633;border-radius:12px;background:#131319}
h1{font-size:1.1rem;margin:0 0 .5rem}code{color:#a78bfa}p{line-height:1.5;margin:.4rem 0}</style>
</head><body><div class="card"><h1>No preview available</h1>
<p>The file was not found in this project workspace.</p>
<p>Create an <code>index.html</code> in Astra Studio, or select a file path in the preview bar.</p>
</div></body></html>`;

export async function previewRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { projectId: string; token: string; "*": string } }>(
    "/preview/:projectId/:token/*",
    async (request, reply) => {
      const { projectId, token } = request.params;
      const relative = request.params["*"] ?? "";
      if (!/^[a-f0-9-]{36}$/i.test(projectId) || !verifyPreviewToken(projectId, token)) {
        return reply.status(403).type("text/html").send(
          "<!doctype html><html><body style='font-family:system-ui;background:#0b0b0f;color:#eee;display:grid;place-items:center;min-height:100vh'>Preview link expired. Reopen the preview from Astra Studio.</body></html>",
        );
      }
      const file = await resolvePreviewFile(projectId, relative);
      if (!file) {
        return reply.status(404).type("text/html; charset=utf-8").send(NOT_FOUND_HTML);
      }
      const content = await fs.readFile(file.absolute);
      reply
        .header("Content-Type", contentTypeFor(file.relative))
        .header("Cache-Control", "no-store")
        .header("X-Content-Type-Options", "nosniff")
        .header(
          "Content-Security-Policy",
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *",
        );
      return reply.send(content);
    },
  );

  app.get<{ Params: { projectId: string; token: string } }>(
    "/preview/:projectId/:token",
    async (request, reply) => {
      const { projectId, token } = request.params;
      if (!/^[a-f0-9-]{36}$/i.test(projectId) || !verifyPreviewToken(projectId, token)) {
        return reply.status(403).type("text/plain").send("Preview link expired.");
      }
      const file = await resolvePreviewFile(projectId, "index.html");
      if (!file) {
        return reply.status(404).type("text/html; charset=utf-8").send(NOT_FOUND_HTML);
      }
      const content = await fs.readFile(file.absolute);
      reply
        .header("Content-Type", contentTypeFor(file.relative))
        .header("Cache-Control", "no-store")
        .header("X-Content-Type-Options", "nosniff");
      return reply.send(content);
    },
  );

  app.get("/preview/:projectId", async (_request, reply) => {
    return reply.status(403).type("text/plain").send("A preview token is required.");
  });
}
