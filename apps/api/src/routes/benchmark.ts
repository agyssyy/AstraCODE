import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { benchmarkResults, benchmarkRuns, models } from "@astracode/database";
import {
  benchmarkStartSchema,
  benchmarkSuites,
  estimateTokens,
  getSuite,
  type BenchmarkResultDto,
  type UsageSource,
} from "@astracode/shared";
import { AiProviderError, completeChat } from "@astracode/ai";
import { badRequest, notFound, parseWith } from "../lib/errors.js";
import { openSse } from "../lib/sse.js";
import { loadModelWithProvider } from "../services/providers.js";

function toResultDto(row: typeof benchmarkResults.$inferSelect): BenchmarkResultDto {
  return {
    id: row.id,
    promptId: row.promptId,
    promptTitle: row.promptTitle,
    modelId: row.modelId,
    modelLabel: row.modelLabel,
    output: row.output,
    error: row.error,
    latencyMs: row.latencyMs,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    usageSource: row.usageSource as UsageSource,
  };
}

export async function benchmarkRoutes(app: FastifyInstance): Promise<void> {
  app.get("/benchmark/suites", async () => ({ suites: benchmarkSuites }));

  app.get("/benchmark/runs", { preHandler: app.authenticate }, async (request) => {
    const runs = await app.db
      .select()
      .from(benchmarkRuns)
      .where(eq(benchmarkRuns.userId, request.user.id))
      .orderBy(desc(benchmarkRuns.createdAt))
      .limit(50);

    const aggregates = await app.db
      .select({
        runId: benchmarkResults.runId,
        resultCount: sql<number>`count(*)::int`,
        avgLatency: sql<number>`coalesce(avg(${benchmarkResults.latencyMs}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(coalesce(${benchmarkResults.tokensIn}, 0) + coalesce(${benchmarkResults.tokensOut}, 0)), 0)::int`,
        errors: sql<number>`(count(*) filter (where ${benchmarkResults.error} is not null))::int`,
      })
      .from(benchmarkResults)
      .where(eq(benchmarkResults.userId, request.user.id))
      .groupBy(benchmarkResults.runId);

    const byRun = new Map(aggregates.map((a) => [a.runId, a]));
    return {
      runs: runs.map((run) => {
        const agg = byRun.get(run.id);
        return {
          id: run.id,
          suiteId: run.suiteId,
          suiteName: run.suiteName,
          status: run.status,
          modelCount: run.modelCount,
          createdAt: run.createdAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
          resultCount: agg?.resultCount ?? 0,
          avgLatencyMs: agg?.avgLatency ?? null,
          totalTokens: agg?.totalTokens ?? 0,
          errors: agg?.errors ?? 0,
        };
      }),
    };
  });

  app.get<{ Params: { id: string } }>(
    "/benchmark/runs/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const rows = await app.db
        .select()
        .from(benchmarkRuns)
        .where(
          and(
            eq(benchmarkRuns.id, request.params.id),
            eq(benchmarkRuns.userId, request.user.id),
          ),
        )
        .limit(1);
      const run = rows[0];
      if (!run) throw notFound("Benchmark run not found");
      const results = await app.db
        .select()
        .from(benchmarkResults)
        .where(eq(benchmarkResults.runId, run.id))
        .orderBy(benchmarkResults.createdAt);
      return {
        run: {
          id: run.id,
          suiteId: run.suiteId,
          suiteName: run.suiteName,
          status: run.status,
          modelCount: run.modelCount,
          createdAt: run.createdAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
        },
        results: results.map(toResultDto),
      };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/benchmark/runs/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const rows = await app.db
        .select()
        .from(benchmarkRuns)
        .where(
          and(
            eq(benchmarkRuns.id, request.params.id),
            eq(benchmarkRuns.userId, request.user.id),
          ),
        )
        .limit(1);
      if (!rows[0]) throw notFound("Benchmark run not found");
      await app.db.delete(benchmarkRuns).where(eq(benchmarkRuns.id, rows[0].id));
      return { ok: true };
    },
  );

  app.get("/benchmark/leaderboard", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({
        modelLabel: benchmarkResults.modelLabel,
        runs: sql<number>`count(*)::int`,
        avgLatencyMs: sql<number>`coalesce(avg(${benchmarkResults.latencyMs}), 0)::int`,
        avgTokens: sql<number>`coalesce(avg(coalesce(${benchmarkResults.tokensIn}, 0) + coalesce(${benchmarkResults.tokensOut}, 0)), 0)::int`,
        successes: sql<number>`(count(*) filter (where ${benchmarkResults.error} is null))::int`,
        failures: sql<number>`(count(*) filter (where ${benchmarkResults.error} is not null))::int`,
        measured: sql<number>`(count(*) filter (where ${benchmarkResults.usageSource} = 'provider'))::int`,
      })
      .from(benchmarkResults)
      .where(eq(benchmarkResults.userId, request.user.id))
      .groupBy(benchmarkResults.modelLabel)
      .orderBy(sql`coalesce(avg(${benchmarkResults.latencyMs}), 0) asc`);

    return {
      leaderboard: rows.map((row) => ({
        modelLabel: row.modelLabel,
        runs: row.runs,
        avgLatencyMs: row.avgLatencyMs,
        avgTokens: row.avgTokens,
        successRate: row.runs > 0 ? Math.round((row.successes / row.runs) * 100) : 0,
        measuredResults: row.measured,
        estimatedResults: row.runs - row.measured,
      })),
    };
  });

  app.post(
    "/benchmark/runs",
    { preHandler: app.authenticate, config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = parseWith(benchmarkStartSchema, request.body);
      const suite = getSuite(body.suiteId);
      if (!suite) throw badRequest("Unknown benchmark suite");

      const ownedModels = await app.db
        .select()
        .from(models)
        .where(
          and(
            eq(models.userId, request.user.id),
            inArray(models.id, body.modelIds),
          ),
        );
      if (ownedModels.length !== body.modelIds.length) {
        throw badRequest("One or more models were not found in Model Hub.");
      }

      const runRows = await app.db
        .insert(benchmarkRuns)
        .values({
          userId: request.user.id,
          suiteId: suite.id,
          suiteName: suite.name,
          status: "running",
          modelCount: ownedModels.length,
        })
        .returning();
      const run = runRows[0]!;

      const sse = openSse(request, reply);
      const controller = new AbortController();
      let finished = false;
      reply.raw.on("close", () => {
        if (!finished) controller.abort();
      });

      sse.send("start", {
        runId: run.id,
        suite: { id: suite.id, name: suite.name },
        models: ownedModels.map((m) => ({ id: m.id, label: m.label })),
        totalCalls: ownedModels.length * suite.prompts.length,
      });

      let cancelled = false;
      try {
        for (const model of ownedModels) {
          const { config, provider } = await loadModelWithProvider(
            app.db,
            request.user.id,
            model.id,
          );
          for (const prompt of suite.prompts) {
            if (sse.closed() || controller.signal.aborted) {
              cancelled = true;
              break;
            }
            const started = performance.now();
            const signals = [controller.signal, AbortSignal.timeout(45_000)];
            const signal = AbortSignal.any(signals);
            try {
              const result = await completeChat(config, {
                model: model.modelName,
                messages: [
                  {
                    role: "system",
                    content:
                      "You are an expert software engineer. Answer the task completely and concisely. Include code where useful.",
                  },
                  { role: "user", content: prompt.prompt },
                ],
                maxTokens: model.maxOutput,
                signal,
              });
              const latencyMs = result.latencyMs || Math.round(performance.now() - started);
              const usageSource: UsageSource =
                result.inputTokens !== null && result.outputTokens !== null
                  ? "provider"
                  : "estimated";
              const inserted = await app.db
                .insert(benchmarkResults)
                .values({
                  runId: run.id,
                  userId: request.user.id,
                  modelId: model.id,
                  modelLabel: `${model.label} · ${provider.name}`,
                  promptId: prompt.id,
                  promptTitle: prompt.title,
                  output: result.text,
                  latencyMs,
                  tokensIn: result.inputTokens ?? estimateTokens(prompt.prompt),
                  tokensOut: result.outputTokens ?? estimateTokens(result.text),
                  usageSource,
                })
                .returning();
              sse.send("result", toResultDto(inserted[0]!));
            } catch (error) {
              const aborted =
                controller.signal.aborted ||
                (error instanceof AiProviderError && error.code === "aborted") ||
                (error instanceof DOMException && error.name === "AbortError");
              if (controller.signal.aborted) cancelled = true;
              const message = aborted
                ? "Request cancelled."
                : error instanceof Error
                  ? error.message
                  : "Benchmark call failed.";
              const inserted = await app.db
                .insert(benchmarkResults)
                .values({
                  runId: run.id,
                  userId: request.user.id,
                  modelId: model.id,
                  modelLabel: `${model.label} · ${provider.name}`,
                  promptId: prompt.id,
                  promptTitle: prompt.title,
                  error: message,
                  latencyMs: Math.round(performance.now() - started),
                  usageSource: "unavailable",
                })
                .returning();
              sse.send("result", toResultDto(inserted[0]!));
              if (cancelled) break;
            }
          }
          if (cancelled) break;
        }

        finished = true;
        await app.db
          .update(benchmarkRuns)
          .set({
            status: cancelled ? "cancelled" : "completed",
            completedAt: new Date(),
          })
          .where(eq(benchmarkRuns.id, run.id));
        sse.send("complete", { runId: run.id, status: cancelled ? "cancelled" : "completed" });
      } catch (error) {
        finished = true;
        await app.db
          .update(benchmarkRuns)
          .set({ status: "failed", completedAt: new Date() })
          .where(eq(benchmarkRuns.id, run.id));
        sse.send("error", {
          message: error instanceof Error ? error.message : "Benchmark failed unexpectedly.",
          runId: run.id,
        });
      } finally {
        sse.end();
      }
      return reply;
    },
  );
}
