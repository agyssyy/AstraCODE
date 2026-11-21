import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { eq, lt, and } from "drizzle-orm";
import {
  benchmarkRuns,
  createDatabase,
  seedExtensions,
  sessions,
} from "@astracode/database";
import { env, allowedOrigins } from "./env.js";
import { ApiError } from "./lib/errors.js";
import { registerAuth } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { providerRoutes } from "./routes/providers.js";
import { modelRoutes } from "./routes/models.js";
import { projectRoutes } from "./routes/projects.js";
import { execRoutes } from "./routes/exec.js";
import { previewRoutes } from "./routes/preview.js";
import { conversationRoutes } from "./routes/conversations.js";
import { chatRoutes } from "./routes/chat.js";
import { benchmarkRoutes } from "./routes/benchmark.js";
import { apiCenterRoutes } from "./routes/api-center.js";
import { extensionRoutes } from "./routes/extensions.js";
import { settingsRoutes } from "./routes/settings.js";

const app = Fastify({
  logger: {
    level: env.nodeEnv === "production" ? "info" : "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      censor: "[redacted]",
    },
  },
  bodyLimit: 1_500_000,
});

const handle = await createDatabase({
  databaseUrl: env.databaseUrl,
  dataDir: env.dataDir,
});
app.decorate("db", handle.db);
app.decorate("dbDriver", handle.driver);

await seedExtensions(handle.db);
await handle.db
  .update(benchmarkRuns)
  .set({ status: "failed", completedAt: new Date() })
  .where(eq(benchmarkRuns.status, "running"));
await handle.db
  .delete(sessions)
  .where(and(lt(sessions.expiresAt, new Date())));

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) callback(null, true);
    else callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});

await app.register(cookie);

registerAuth(app);

await app.register(rateLimit, {
  global: true,
  max: 600,
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({
    error: { code: "rate_limited", message: "Too many requests. Slow down and try again." },
  }),
});

app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, details: error.details },
    });
  }
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: { code: "rate_limited", message: "Too many requests. Slow down and try again." },
    });
  }
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: { code: "bad_request", message: error.message },
    });
  }
  request.log.error({ err: error }, "Unhandled request error");
  return reply.status(500).send({
    error: { code: "server_error", message: "Something went wrong on our side." },
  });
});

app.setNotFoundHandler((_request, reply) => {
  reply.status(404).send({ error: { code: "not_found", message: "Endpoint not found" } });
});

app.get("/health", async () => ({
  status: "ok",
  version: "0.1.0",
  driver: app.dbDriver,
  origin: env.webOrigin,
  uptimeSeconds: Math.round(process.uptime()),
}));

await app.register(authRoutes);
await app.register(providerRoutes);
await app.register(modelRoutes);
await app.register(projectRoutes);
await app.register(execRoutes);
await app.register(previewRoutes);
await app.register(conversationRoutes);
await app.register(chatRoutes);
await app.register(benchmarkRoutes);
await app.register(apiCenterRoutes);
await app.register(extensionRoutes);
await app.register(settingsRoutes);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down AstraCode API");
  try {
    await app.close();
    await handle.close();
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.port, host: env.host });
  app.log.info(
    `AstraCode API ready on http://${env.host}:${env.port} · database: ${app.dbDriver} · web origin: ${env.webOrigin}`,
  );
} catch (error) {
  app.log.error(error);
  await handle.close().catch(() => {});
  process.exit(1);
}
