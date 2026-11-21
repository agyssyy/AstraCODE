import type { FastifyInstance } from "fastify";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  apiRequests,
  benchmarkResults,
  benchmarkRuns,
  conversations,
  extensionInstalls,
  messages,
  models,
  projectFiles,
  projects,
  aiProviders,
  sessions,
  userSettings,
  users,
} from "@astracode/database";
import {
  deleteAccountSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  settingsPatchSchema,
  type UserSettingsDto,
} from "@astracode/shared";
import {
  hashPassword,
  verifyPassword,
} from "../lib/crypto.js";
import { conflict, parseWith, unauthorized } from "../lib/errors.js";
import { clearSessionCookie } from "../lib/session.js";
import { ensureSettings, resolveDefaultModelId, setDefaultModel } from "../lib/settings.js";
import { builtinModelDtos } from "../services/builtin.js";

function settingsDto(row: typeof userSettings.$inferSelect): UserSettingsDto {
  return {
    theme: row.theme as UserSettingsDto["theme"],
    language: row.language,
    editorFontSize: row.editorFontSize,
    editorTabSize: row.editorTabSize,
    editorWordWrap: row.editorWordWrap,
    defaultModelId: row.defaultModelId,
    agentApprovalRequired: row.agentApprovalRequired,
    privacyTelemetry: row.privacyTelemetry,
  };
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/settings", { preHandler: app.authenticate }, async (request) => {
    const settings = await ensureSettings(app.db, request.user.id);
    return { settings: settingsDto(settings) };
  });

  app.patch("/settings", { preHandler: app.authenticate }, async (request) => {
    const body = parseWith(settingsPatchSchema, request.body);
    await ensureSettings(app.db, request.user.id);

    if (body.defaultModelId !== undefined) {
      await setDefaultModel(app.db, request.user.id, body.defaultModelId);
    }

    const update: Partial<typeof userSettings.$inferInsert> = { updatedAt: new Date() };
    if (body.theme !== undefined) update.theme = body.theme;
    if (body.language !== undefined) update.language = body.language;
    if (body.editorFontSize !== undefined) update.editorFontSize = body.editorFontSize;
    if (body.editorTabSize !== undefined) update.editorTabSize = body.editorTabSize;
    if (body.editorWordWrap !== undefined) update.editorWordWrap = body.editorWordWrap;
    if (body.agentApprovalRequired !== undefined) {
      update.agentApprovalRequired = body.agentApprovalRequired;
    }
    if (body.privacyTelemetry !== undefined) update.privacyTelemetry = body.privacyTelemetry;

    await app.db
      .update(userSettings)
      .set(update)
      .where(eq(userSettings.userId, request.user.id));
    const settings = await ensureSettings(app.db, request.user.id);
    return { settings: settingsDto(settings) };
  });

  app.patch("/settings/profile", { preHandler: app.authenticate }, async (request) => {
    const body = parseWith(profileUpdateSchema, request.body);
    const duplicate = await app.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, body.email), ne(users.id, request.user.id)))
      .limit(1);
    if (duplicate[0]) throw conflict("That email is already used by another account.");
    await app.db
      .update(users)
      .set({ name: body.name, email: body.email, updatedAt: new Date() })
      .where(eq(users.id, request.user.id));
    return { user: { ...request.user, name: body.name, email: body.email } };
  });

  app.post("/settings/password", { preHandler: app.authenticate }, async (request) => {
    const body = parseWith(passwordChangeSchema, request.body);
    const rows = await app.db
      .select()
      .from(users)
      .where(eq(users.id, request.user.id))
      .limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(body.currentPassword, user.passwordHash)) {
      throw unauthorized("Current password is incorrect.");
    }
    await app.db
      .update(users)
      .set({ passwordHash: hashPassword(body.newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    if (request.sessionId) {
      await app.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, user.id), ne(sessions.id, request.sessionId)));
    }
    return { ok: true };
  });

  app.get("/settings/export", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id;
    const [
      userRows,
      settingsRows,
      projectRows,
      fileRows,
      conversationRows,
      messageRows,
      providerRows,
      modelRows,
      benchmarkRunRows,
      benchmarkResultRows,
      requestRows,
      installRows,
    ] = await Promise.all([
      app.db.select().from(users).where(eq(users.id, userId)),
      app.db.select().from(userSettings).where(eq(userSettings.userId, userId)),
      app.db.select().from(projects).where(eq(projects.userId, userId)),
      app.db
        .select({ file: projectFiles })
        .from(projectFiles)
        .innerJoin(projects, eq(projects.id, projectFiles.projectId))
        .where(eq(projects.userId, userId)),
      app.db.select().from(conversations).where(eq(conversations.userId, userId)),
      app.db
        .select({ message: messages })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(eq(conversations.userId, userId)),
      app.db.select().from(aiProviders).where(eq(aiProviders.userId, userId)),
      app.db.select().from(models).where(eq(models.userId, userId)),
      app.db.select().from(benchmarkRuns).where(eq(benchmarkRuns.userId, userId)),
      app.db.select().from(benchmarkResults).where(eq(benchmarkResults.userId, userId)),
      app.db.select().from(apiRequests).where(eq(apiRequests.userId, userId)),
      app.db.select().from(extensionInstalls).where(eq(extensionInstalls.userId, userId)),
    ]);

    const user = userRows[0];
    const payload = {
      format: "astracode.export",
      version: 1,
      exportedAt: new Date().toISOString(),
      account: user
        ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
        : null,
      settings: settingsRows[0] ?? null,
      projects: projectRows,
      projectFiles: fileRows.map((row) => row.file),
      conversations: conversationRows,
      messages: messageRows.map((row) => row.message),
      providers: providerRows.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        baseUrl: row.baseUrl,
        hasApiKey: Boolean(row.apiKeyCipher),
        createdAt: row.createdAt,
      })),
      models: modelRows,
      benchmarkRuns: benchmarkRunRows,
      benchmarkResults: benchmarkResultRows,
      apiRequests: requestRows,
      extensions: installRows,
    };

    reply.header("Content-Type", "application/json; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="astracode-export-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    return reply.send(JSON.stringify(payload, null, 2));
  });

  app.delete("/settings/account", { preHandler: app.authenticate }, async (request, reply) => {
    const body = parseWith(deleteAccountSchema, request.body);
    const rows = await app.db
      .select()
      .from(users)
      .where(eq(users.id, request.user.id))
      .limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw unauthorized("Password is incorrect.");
    }
    await app.db.delete(users).where(eq(users.id, user.id));
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/stats", { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id;

    const [projectCount, conversationCount, modelCount, providerCount, runCount, extensionCount] =
      await Promise.all([
        app.db.select({ count: sql<number>`count(*)::int` }).from(projects).where(eq(projects.userId, userId)),
        app.db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversations)
          .where(eq(conversations.userId, userId)),
        app.db.select({ count: sql<number>`count(*)::int` }).from(models).where(eq(models.userId, userId)),
        app.db
          .select({ count: sql<number>`count(*)::int` })
          .from(aiProviders)
          .where(eq(aiProviders.userId, userId)),
        app.db
          .select({ count: sql<number>`count(*)::int` })
          .from(benchmarkRuns)
          .where(eq(benchmarkRuns.userId, userId)),
        app.db
          .select({ count: sql<number>`count(*)::int` })
          .from(extensionInstalls)
          .where(eq(extensionInstalls.userId, userId)),
      ]);

    const defaultModelId = await resolveDefaultModelId(app.db, userId);
    const builtinDefault = builtinModelDtos(defaultModelId).find(
      (model) => model.id === defaultModelId,
    );
    const defaultRows = builtinDefault
      ? [{ id: builtinDefault.id, label: builtinDefault.label }]
      : defaultModelId
        ? await app.db
            .select({ id: models.id, label: models.label })
            .from(models)
            .where(and(eq(models.id, defaultModelId), eq(models.userId, userId)))
            .limit(1)
        : [];

    const recentProjects = await app.db
      .select({
        project: projects,
        fileCount: sql<number>`count(${projectFiles.id})::int`,
      })
      .from(projects)
      .leftJoin(projectFiles, eq(projectFiles.projectId, projects.id))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id)
      .orderBy(desc(projects.updatedAt))
      .limit(4);

    const recentConversations = await app.db
      .select({
        conversation: conversations,
        messageCount: sql<number>`count(${messages.id})::int`,
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.userId, userId))
      .groupBy(conversations.id)
      .orderBy(desc(conversations.updatedAt))
      .limit(4);

    return {
      stats: {
        projects: projectCount[0]?.count ?? 0,
        conversations: conversationCount[0]?.count ?? 0,
        models: (modelCount[0]?.count ?? 0) + builtinModelDtos(null).length,
        providers: providerCount[0]?.count ?? 0,
        benchmarkRuns: runCount[0]?.count ?? 0,
        extensionsInstalled: extensionCount[0]?.count ?? 0,
        defaultModel: defaultRows[0] ?? null,
        databaseDriver: app.dbDriver,
        recentProjects: recentProjects.map(({ project, fileCount }) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          language: project.language,
          template: project.template,
          githubRepo: project.githubRepo,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          fileCount,
        })),
        recentConversations: recentConversations.map(({ conversation: c, messageCount }) => ({
          id: c.id,
          title: c.title,
          projectId: c.projectId,
          modelId: c.modelId,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          messageCount,
        })),
      },
    };
  });
}
