import type { FastifyRequest, FastifyReply } from "fastify";
import type { Database } from "@astracode/database";
import type { PublicUser } from "@astracode/shared";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    dbDriver: "pglite" | "postgres";
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: PublicUser & { passwordHash?: string };
    sessionId?: string;
  }
}
