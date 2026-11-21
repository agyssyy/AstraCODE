import type { FastifyInstance } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { aiProviders, models, userSettings } from "@astracode/database";
import type { ModelDto } from "@astracode/shared";
import { modelCreateSchema, modelUpdateSchema } from "@astracode/shared";
import { listRemoteModels } from "@astracode/ai";
import { badRequest, conflict, notFound, parseWith } from "../lib/errors.js";
import { resolveDefaultModelId, setDefaultModel } from "../lib/settings.js";
import { providerConfigFor } from "../services/providers.js";
import {
  builtinModelDtos,
  builtinModelEnabled,
  isBuiltinModelId,
} from "../services/builtin.js";

export async function modelRoutes(app: FastifyInstance): Promise<void> {
  app.get("/models", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({ model: models, provider: aiProviders })
      .from(models)
      .innerJoin(aiProviders, eq(aiProviders.id, models.providerId))
      .where(eq(models.userId, request.user.id))
      .orderBy(aiProviders.name, models.label);

    const defaultModelId = await resolveDefaultModelId(app.db, request.user.id);
    const list: ModelDto[] = rows.map(({ model, provider }) => ({
      id: model.id,
      providerId: provider.id,
      providerName: provider.name,
      providerKind: provider.kind as ModelDto["providerKind"],
      modelName: model.modelName,
      label: model.label,
      contextWindow: model.contextWindow,
      maxOutput: model.maxOutput,
      notes: model.notes,
      isDefault: model.isDefault,
      isAvailable: model.isAvailable,
      lastCheckedAt: model.lastCheckedAt?.toISOString() ?? null,
      createdAt: model.createdAt.toISOString(),
    }));
    list.unshift(...builtinModelDtos(defaultModelId));
    return { models: list, defaultModelId };
  });

  app.post("/models", { preHandler: app.authenticate }, async (request, reply) => {
    const body = parseWith(modelCreateSchema, request.body);
    const provider = await app.db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.id, body.providerId), eq(aiProviders.userId, request.user.id)))
      .limit(1);
    if (!provider[0]) throw notFound("Provider not found");

    const existing = await app.db
      .select({ id: models.id })
      .from(models)
      .where(and(eq(models.providerId, body.providerId), eq(models.modelName, body.modelName)))
      .limit(1);
    if (existing[0]) throw conflict("This model is already added for that provider.");

    try {
      const created = await app.db
        .insert(models)
        .values({
          userId: request.user.id,
          providerId: body.providerId,
          modelName: body.modelName,
          label: body.label,
          contextWindow: body.contextWindow,
          maxOutput: body.maxOutput,
          notes: body.notes ?? null,
        })
        .returning();
      const model = created[0]!;

      const count = await app.db
        .select({ count: sql<number>`count(*)::int` })
        .from(models)
        .where(eq(models.userId, request.user.id));
      if (body.isDefault || (count[0]?.count ?? 0) === 1) {
        await setDefaultModel(app.db, request.user.id, model.id);
      }

      return reply.status(201).send({
        model: {
          id: model.id,
          providerId: provider[0].id,
          providerName: provider[0].name,
          providerKind: provider[0].kind,
          modelName: model.modelName,
          label: model.label,
          contextWindow: model.contextWindow,
          maxOutput: model.maxOutput,
          notes: model.notes,
          isDefault: body.isDefault ?? (count[0]?.count ?? 0) === 1,
          isAvailable: null,
          lastCheckedAt: null,
          createdAt: model.createdAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && /unique/i.test(error.message)) {
        throw conflict("This model is already added for that provider.");
      }
      throw error;
    }
  });

  app.patch<{ Params: { id: string } }>(
    "/models/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(modelUpdateSchema, request.body);
      const id = request.params.id;
      if (isBuiltinModelId(id)) {
        if (!builtinModelEnabled(id)) throw notFound("Model not found");
        const changesSettings =
          body.label !== undefined ||
          body.contextWindow !== undefined ||
          body.maxOutput !== undefined ||
          body.notes !== undefined;
        if (changesSettings) {
          throw badRequest("The built-in model is managed by the server.");
        }
        if (body.isDefault !== undefined) {
          await setDefaultModel(app.db, request.user.id, body.isDefault ? id : null);
        }
        return { ok: true };
      }
      const existing = await app.db
        .select()
        .from(models)
        .where(and(eq(models.id, id), eq(models.userId, request.user.id)))
        .limit(1);
      if (!existing[0]) throw notFound("Model not found");

      const update: Partial<typeof models.$inferInsert> = {};
      if (body.label !== undefined) update.label = body.label;
      if (body.contextWindow !== undefined) update.contextWindow = body.contextWindow;
      if (body.maxOutput !== undefined) update.maxOutput = body.maxOutput;
      if (body.notes !== undefined) update.notes = body.notes;
      if (Object.keys(update).length > 0) {
        await app.db.update(models).set(update).where(eq(models.id, id));
      }
      if (body.isDefault !== undefined) {
        await setDefaultModel(app.db, request.user.id, body.isDefault ? id : null);
      }
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/models/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const id = request.params.id;
      if (isBuiltinModelId(id)) throw badRequest("The built-in model cannot be deleted.");
      const existing = await app.db
        .select()
        .from(models)
        .where(and(eq(models.id, id), eq(models.userId, request.user.id)))
        .limit(1);
      if (!existing[0]) throw notFound("Model not found");
      await app.db.delete(models).where(eq(models.id, id));
      const settings = await app.db
        .select({ defaultModelId: userSettings.defaultModelId })
        .from(userSettings)
        .where(eq(userSettings.userId, request.user.id))
        .limit(1);
      if (settings[0]?.defaultModelId === id) {
        await app.db
          .update(userSettings)
          .set({ defaultModelId: null })
          .where(eq(userSettings.userId, request.user.id));
      }
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/models/:id/test",
    { preHandler: app.authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      const id = request.params.id;
      if (isBuiltinModelId(id)) {
        return { ok: true, available: true, latencyMs: 0, message: "Built-in model is managed by the server." };
      }
      const rows = await app.db
        .select({ model: models, provider: aiProviders })
        .from(models)
        .innerJoin(aiProviders, eq(aiProviders.id, models.providerId))
        .where(and(eq(models.id, id), eq(models.userId, request.user.id)))
        .limit(1);
      const row = rows[0];
      if (!row) throw notFound("Model not found");
      const { config } = await providerConfigFor(app.db, request.user.id, row.provider.id);
      const started = performance.now();
      try {
        const remote = await listRemoteModels(config);
        const available = remote.some((m) => m.id === row.model.modelName);
        await app.db
          .update(models)
          .set({ isAvailable: available, lastCheckedAt: new Date() })
          .where(eq(models.id, id));
        return {
          ok: available,
          available,
          latencyMs: Math.round(performance.now() - started),
          message: available
            ? "Model is listed by the provider."
            : "The provider is reachable but does not list this model id.",
        };
      } catch (error) {
        await app.db
          .update(models)
          .set({ isAvailable: false, lastCheckedAt: new Date() })
          .where(eq(models.id, id));
        return {
          ok: false,
          available: false,
          latencyMs: Math.round(performance.now() - started),
          message: error instanceof Error ? error.message : "Model test failed",
        };
      }
    },
  );

  app.get("/model-presets", async () => ({
    presets: [
      { kind: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", needsKey: true },
      { kind: "ollama", label: "Ollama (this machine)", baseUrl: "http://127.0.0.1:11434", needsKey: false },
      { kind: "custom", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", needsKey: true },
      { kind: "custom", label: "OpenCode", baseUrl: "https://opencode.ai/inference/openai/v1", needsKey: true },
      { kind: "custom", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", needsKey: true },
      { kind: "custom", label: "Together", baseUrl: "https://api.together.xyz/v1", needsKey: true },
    ],
  }));
}

export type { ModelDto };
