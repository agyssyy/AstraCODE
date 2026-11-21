import type { FastifyInstance } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { extensionInstalls, extensions } from "@astracode/database";
import {
  extensionToggleSchema,
  type ExtensionDto,
  type ExtensionManifest,
} from "@astracode/shared";
import { notFound, parseWith } from "../lib/errors.js";

export async function extensionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/extensions", { preHandler: app.authenticate }, async (request) => {
    const query = request.query as { category?: string };
    const catalog = await app.db.select().from(extensions).orderBy(extensions.name);
    const counts = await app.db
      .select({
        extensionId: extensionInstalls.extensionId,
        count: sql<number>`count(*)::int`,
      })
      .from(extensionInstalls)
      .groupBy(extensionInstalls.extensionId);
    const mine = await app.db
      .select()
      .from(extensionInstalls)
      .where(eq(extensionInstalls.userId, request.user.id));
    const countMap = new Map(counts.map((c) => [c.extensionId, c.count]));
    const mineMap = new Map(mine.map((m) => [m.extensionId, m]));

    const filtered = query.category
      ? catalog.filter((row) => row.category === query.category)
      : catalog;

    const list: ExtensionDto[] = filtered.map((extension) => {
      const install = mineMap.get(extension.id);
      return {
        id: extension.id,
        name: extension.name,
        description: extension.description,
        category: extension.category,
        version: extension.version,
        author: extension.author,
        permissions: extension.permissions,
        manifest: extension.manifest as ExtensionManifest,
        repoUrl: extension.repoUrl,
        docsUrl: extension.docsUrl,
        verified: extension.verified,
        installs: countMap.get(extension.id) ?? 0,
        installed: Boolean(install),
        enabled: install?.enabled ?? false,
      };
    });

    const categories = [...new Set(catalog.map((row) => row.category))].sort();
    return { extensions: list, categories };
  });

  app.post<{ Params: { id: string } }>(
    "/extensions/:id/install",
    { preHandler: app.authenticate },
    async (request) => {
      const extension = await app.db
        .select()
        .from(extensions)
        .where(eq(extensions.id, request.params.id))
        .limit(1);
      if (!extension[0]) throw notFound("Extension not found");
      await app.db
        .insert(extensionInstalls)
        .values({ userId: request.user.id, extensionId: extension[0].id })
        .onConflictDoUpdate({
          target: [extensionInstalls.userId, extensionInstalls.extensionId],
          set: { enabled: true },
        });
      return { ok: true, installed: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/extensions/:id/install",
    { preHandler: app.authenticate },
    async (request) => {
      await app.db
        .delete(extensionInstalls)
        .where(
          and(
            eq(extensionInstalls.userId, request.user.id),
            eq(extensionInstalls.extensionId, request.params.id),
          ),
        );
      return { ok: true, installed: false };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/extensions/:id/install",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(extensionToggleSchema, request.body);
      const updated = await app.db
        .update(extensionInstalls)
        .set({ enabled: body.enabled })
        .where(
          and(
            eq(extensionInstalls.userId, request.user.id),
            eq(extensionInstalls.extensionId, request.params.id),
          ),
        )
        .returning();
      if (!updated[0]) throw notFound("Extension is not installed");
      return { ok: true, enabled: updated[0].enabled };
    },
  );

  app.get("/extensions/capabilities", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({ manifest: extensions.manifest, name: extensions.name })
      .from(extensionInstalls)
      .innerJoin(extensions, eq(extensions.id, extensionInstalls.extensionId))
      .where(
        and(
          eq(extensionInstalls.userId, request.user.id),
          eq(extensionInstalls.enabled, true),
        ),
      );
    return {
      prompts: rows.flatMap((row) =>
        (row.manifest?.prompts ?? []).map((prompt) => ({ ...prompt, source: row.name })),
      ),
      templates: rows.flatMap((row) =>
        (row.manifest?.templates ?? []).map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          language: template.language,
          fileCount: template.files.length,
          source: row.name,
        })),
      ),
    };
  });
}
