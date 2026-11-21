import type { FastifyInstance } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { aiProviders, models, userSettings } from "@astracode/database";
import { providerCreateSchema, providerUpdateSchema, type ProviderDto } from "@astracode/shared";
import { listRemoteModels } from "@astracode/ai";
import type { ProviderKind, RemoteModel } from "@astracode/ai";
import { encryptSecret } from "../lib/crypto.js";
import { badRequest, parseWith } from "../lib/errors.js";
import { providerConfigFor, toProviderDto } from "../services/providers.js";

export async function providerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/providers", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({
        provider: aiProviders,
        modelCount: sql<number>`count(${models.id})::int`,
      })
      .from(aiProviders)
      .leftJoin(models, eq(models.providerId, aiProviders.id))
      .where(eq(aiProviders.userId, request.user.id))
      .groupBy(aiProviders.id)
      .orderBy(aiProviders.createdAt);

    const providers: ProviderDto[] = rows.map((r) => toProviderDto(r.provider, r.modelCount));
    return { providers };
  });

  app.post("/providers", { preHandler: app.authenticate }, async (request, reply) => {
    const body = parseWith(providerCreateSchema, request.body);
    const created = await app.db
      .insert(aiProviders)
      .values({
        userId: request.user.id,
        name: body.name,
        kind: body.kind,
        baseUrl: body.baseUrl.replace(/\/+$/, ""),
        apiKeyCipher: body.apiKey ? encryptSecret(body.apiKey) : null,
      })
      .returning();
    return reply.status(201).send({ provider: toProviderDto(created[0]!, 0) });
  });

  app.patch<{ Params: { id: string } }>(
    "/providers/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(providerUpdateSchema, request.body);
      const providerId = request.params.id;
      const existing = await providerConfigFor(app.db, request.user.id, providerId);

      const update: Partial<typeof aiProviders.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (body.name !== undefined) update.name = body.name;
      if (body.kind !== undefined) update.kind = body.kind;
      if (body.baseUrl !== undefined) update.baseUrl = body.baseUrl.replace(/\/+$/, "");
      if (body.clearKey) update.apiKeyCipher = null;
      else if (body.apiKey) update.apiKeyCipher = encryptSecret(body.apiKey);

      const updated = await app.db
        .update(aiProviders)
        .set(update)
        .where(and(eq(aiProviders.id, providerId), eq(aiProviders.userId, request.user.id)))
        .returning();
      const count = await app.db
        .select({ count: sql<number>`count(*)::int` })
        .from(models)
        .where(eq(models.providerId, providerId));
      return { provider: toProviderDto(updated[0] ?? existing.row, count[0]?.count ?? 0) };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/providers/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const providerId = request.params.id;
      await providerConfigFor(app.db, request.user.id, providerId);
      await app.db
        .delete(aiProviders)
        .where(and(eq(aiProviders.id, providerId), eq(aiProviders.userId, request.user.id)));
      await app.db
        .update(userSettings)
        .set({ defaultModelId: null })
        .where(eq(userSettings.userId, request.user.id));
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/providers/:id/test",
    { preHandler: app.authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      const providerId = request.params.id;
      const { config } = await providerConfigFor(app.db, request.user.id, providerId);
      const started = performance.now();
      try {
        const remote = await listRemoteModels(config);
        const latencyMs = Math.round(performance.now() - started);
        const remoteIds = new Set(remote.map((m) => m.id));
        const owned = await app.db
          .select({ id: models.id, modelName: models.modelName })
          .from(models)
          .where(eq(models.providerId, providerId));
        for (const model of owned) {
          await app.db
            .update(models)
            .set({ isAvailable: remoteIds.has(model.modelName), lastCheckedAt: new Date() })
            .where(eq(models.id, model.id));
        }
        return {
          ok: true,
          latencyMs,
          modelCount: remote.length,
          message: `Connected. ${remote.length} model${remote.length === 1 ? "" : "s"} reported by the provider.`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connection failed";
        return { ok: false, latencyMs: Math.round(performance.now() - started), message };
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/providers/:id/discover",
    { preHandler: app.authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      const providerId = request.params.id;
      const { config } = await providerConfigFor(app.db, request.user.id, providerId);
      try {
        const remote: RemoteModel[] = await listRemoteModels(config);
        const owned = await app.db
          .select({ modelName: models.modelName })
          .from(models)
          .where(eq(models.providerId, providerId));
        const ownedNames = new Set(owned.map((m) => m.modelName));
        return {
          models: remote.map((m) => ({ ...m, added: ownedNames.has(m.id) })),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not list models";
        throw badRequest(message);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/providers/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const { row } = await providerConfigFor(app.db, request.user.id, request.params.id);
      const count = await app.db
        .select({ count: sql<number>`count(*)::int` })
        .from(models)
        .where(eq(models.providerId, row.id));
      return { provider: toProviderDto(row, count[0]?.count ?? 0) };
    },
  );
}

export type { ProviderKind };
