import { buildApi } from "./app.js";
import { env } from "./env.js";

const runtime = await buildApi();
const { app, close } = runtime;

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down AstraCode API");
  try {
    await close();
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
  await close().catch(() => {});
  process.exit(1);
}
