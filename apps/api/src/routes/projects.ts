import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  conversations,
  extensionInstalls,
  extensions,
  projectActivity,
  projectFiles,
  projects,
} from "@astracode/database";
import {
  fileDeleteSchema,
  fileRenameSchema,
  fileWriteSchema,
  projectCreateSchema,
  projectImportSchema,
  projectUpdateSchema,
  type ProjectFileDto,
  type ProjectSummary,
} from "@astracode/shared";
import { signPreviewToken } from "../lib/crypto.js";
import { badRequest, conflict, notFound, parseWith } from "../lib/errors.js";
import { builtinTemplates, extensionTemplates, findBuiltinTemplate } from "../lib/templates.js";
import {
  deleteProjectFile,
  renameProjectFile,
  syncProjectToDisk,
  workspaceDir,
  writeProjectFile,
} from "../lib/workspace.js";

export async function getProject(db: FastifyInstance["db"], userId: string, projectId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(projectId)) throw badRequest("Invalid project id");
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  const project = rows[0];
  if (!project) throw notFound("Project not found");
  return project;
}

async function logActivity(
  db: FastifyInstance["db"],
  projectId: string,
  userId: string,
  type: string,
  message: string,
) {
  await db.insert(projectActivity).values({ projectId, userId, type, message });
}

export { logActivity };

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/projects", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({
        project: projects,
        fileCount: sql<number>`count(${projectFiles.id})::int`,
      })
      .from(projects)
      .leftJoin(projectFiles, eq(projectFiles.projectId, projects.id))
      .where(eq(projects.userId, request.user.id))
      .groupBy(projects.id)
      .orderBy(desc(projects.updatedAt));

    const list: ProjectSummary[] = rows.map(({ project, fileCount }) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      language: project.language,
      template: project.template,
      githubRepo: project.githubRepo,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      fileCount,
    }));
    return { projects: list };
  });

  app.get("/projects/templates", { preHandler: app.authenticate }, async (request) => {
    const installed = await app.db
      .select({ manifest: extensions.manifest })
      .from(extensionInstalls)
      .innerJoin(extensions, eq(extensions.id, extensionInstalls.extensionId))
      .where(
        and(
          eq(extensionInstalls.userId, request.user.id),
          eq(extensionInstalls.enabled, true),
        ),
      );
    const fromExtensions = installed.flatMap((row) =>
      extensionTemplates(row.manifest?.templates),
    );
    return {
      templates: [...builtinTemplates, ...fromExtensions].map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        language: t.language,
        fileCount: t.files.length,
        source: builtinTemplates.some((b) => b.id === t.id) ? "builtin" : "extension",
      })),
    };
  });

  app.post("/projects", { preHandler: app.authenticate }, async (request, reply) => {
    const body = parseWith(projectCreateSchema, request.body);
    let template = findBuiltinTemplate(body.template);
    if (!template) {
      const installed = await app.db
        .select({ manifest: extensions.manifest })
        .from(extensionInstalls)
        .innerJoin(extensions, eq(extensions.id, extensionInstalls.extensionId))
        .where(
          and(
            eq(extensionInstalls.userId, request.user.id),
            eq(extensionInstalls.enabled, true),
          ),
        );
      template = installed
        .flatMap((row) => extensionTemplates(row.manifest?.templates))
        .find((t) => t.id === body.template);
    }
    if (!template) throw badRequest("Unknown project template");

    const created = await app.db
      .insert(projects)
      .values({
        userId: request.user.id,
        name: body.name,
        description: body.description ?? "",
        template: template.id,
        language: body.language ?? template.language,
      })
      .returning();
    const project = created[0]!;

    if (template.files.length > 0) {
      await app.db.insert(projectFiles).values(
        template.files.map((file) => ({
          projectId: project.id,
          path: file.path,
          content: file.content,
        })),
      );
    }
    await syncProjectToDisk(project.id, template.files);
    await logActivity(
      app.db,
      project.id,
      request.user.id,
      "project.created",
      `Project created from the ${template.name} template.`,
    );

    const summary: ProjectSummary = {
      id: project.id,
      name: project.name,
      description: project.description,
      language: project.language,
      template: project.template,
      githubRepo: project.githubRepo,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      fileCount: template.files.length,
    };
    return reply.status(201).send({ project: summary });
  });

  app.get<{ Params: { id: string } }>(
    "/projects/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const project = await getProject(app.db, request.user.id, request.params.id);
      const files = await app.db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, project.id))
        .orderBy(projectFiles.path);
      const activity = await app.db
        .select()
        .from(projectActivity)
        .where(eq(projectActivity.projectId, project.id))
        .orderBy(desc(projectActivity.createdAt))
        .limit(30);

      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          language: project.language,
          template: project.template,
          githubRepo: project.githubRepo,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          fileCount: files.length,
        } satisfies ProjectSummary,
        files: files.map(
          (f): ProjectFileDto => ({
            id: f.id,
            projectId: f.projectId,
            path: f.path,
            content: f.content,
            updatedAt: f.updatedAt.toISOString(),
          }),
        ),
        activity: activity.map((a) => ({
          id: a.id,
          type: a.type,
          message: a.message,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/projects/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(projectUpdateSchema, request.body);
      const project = await getProject(app.db, request.user.id, request.params.id);
      const update: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (body.name !== undefined) update.name = body.name;
      if (body.description !== undefined) update.description = body.description;
      if (body.githubRepo !== undefined) update.githubRepo = body.githubRepo || null;
      await app.db.update(projects).set(update).where(eq(projects.id, project.id));
      await logActivity(app.db, project.id, request.user.id, "project.updated", "Project details updated.");
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/projects/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const project = await getProject(app.db, request.user.id, request.params.id);
      await app.db.delete(projects).where(eq(projects.id, project.id));
      await fs.rm(workspaceDir(project.id), { recursive: true, force: true }).catch(() => {});
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/projects/:id/files",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = parseWith(fileWriteSchema, request.body);
      const project = await getProject(app.db, request.user.id, request.params.id);

      const existing = await app.db
        .select()
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, project.id), eq(projectFiles.path, body.path)))
        .limit(1);

      const isNew = !existing[0];
      if (isNew && body.content.length > 0) {
        const count = await app.db
          .select({ count: sql<number>`count(*)::int` })
          .from(projectFiles)
          .where(eq(projectFiles.projectId, project.id));
        if ((count[0]?.count ?? 0) >= 500) {
          throw conflict("This project has reached the 500-file limit.");
        }
      }

      const updated = await app.db
        .insert(projectFiles)
        .values({ projectId: project.id, path: body.path, content: body.content })
        .onConflictDoUpdate({
          target: [projectFiles.projectId, projectFiles.path],
          set: { content: body.content, updatedAt: new Date() },
        })
        .returning();

      await writeProjectFile(project.id, body.path, body.content);
      await app.db
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, project.id));
      if (isNew) {
        await logActivity(app.db, project.id, request.user.id, "file.created", `Created ${body.path}.`);
      }

      const file = updated[0]!;
      return reply.status(isNew ? 201 : 200).send({
        file: {
          id: file.id,
          projectId: file.projectId,
          path: file.path,
          content: file.content,
          updatedAt: file.updatedAt.toISOString(),
        } satisfies ProjectFileDto,
      });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/projects/:id/files/rename",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(fileRenameSchema, request.body);
      const project = await getProject(app.db, request.user.id, request.params.id);
      if (body.from === body.to) return { ok: true };
      const existing = await app.db
        .select()
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, project.id), eq(projectFiles.path, body.to)))
        .limit(1);
      if (existing[0]) throw conflict("A file with that path already exists.");
      const source = await app.db
        .select()
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, project.id), eq(projectFiles.path, body.from)))
        .limit(1);
      if (!source[0]) throw notFound("File not found");

      await app.db
        .update(projectFiles)
        .set({ path: body.to, updatedAt: new Date() })
        .where(eq(projectFiles.id, source[0].id));
      await renameProjectFile(project.id, body.from, body.to);
      await logActivity(
        app.db,
        project.id,
        request.user.id,
        "file.renamed",
        `Renamed ${body.from} → ${body.to}.`,
      );
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/projects/:id/files/delete",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(fileDeleteSchema, request.body);
      const project = await getProject(app.db, request.user.id, request.params.id);
      const existing = await app.db
        .select()
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, project.id), eq(projectFiles.path, body.path)))
        .limit(1);
      if (!existing[0]) throw notFound("File not found");
      await app.db.delete(projectFiles).where(eq(projectFiles.id, existing[0].id));
      await deleteProjectFile(project.id, body.path);
      await logActivity(
        app.db,
        project.id,
        request.user.id,
        "file.deleted",
        `Deleted ${body.path}.`,
      );
      return { ok: true };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/projects/:id/export",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const project = await getProject(app.db, request.user.id, request.params.id);
      const files = await app.db
        .select({ path: projectFiles.path, content: projectFiles.content })
        .from(projectFiles)
        .where(eq(projectFiles.projectId, project.id))
        .orderBy(projectFiles.path);
      const payload = {
        format: "astracode.project",
        version: 1,
        exportedAt: new Date().toISOString(),
        project: {
          name: project.name,
          description: project.description,
          language: project.language,
          template: project.template,
        },
        files,
      };
      const filename = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project";
      reply.header("Content-Type", "application/json; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${filename}.astracode.json"`);
      return reply.send(JSON.stringify(payload, null, 2));
    },
  );

  app.post(
    "/projects/import",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = parseWith(projectImportSchema, request.body);
      const totalSize = body.files.reduce((sum, f) => sum + f.content.length, 0);
      if (totalSize > 2_000_000) throw badRequest("Project is too large to import (max 2 MB).");
      const seen = new Set<string>();
      for (const file of body.files) {
        if (seen.has(file.path)) throw badRequest(`Duplicate file path: ${file.path}`);
        seen.add(file.path);
      }

      const created = await app.db
        .insert(projects)
        .values({
          userId: request.user.id,
          name: body.name,
          description: body.description ?? "",
          template: "import",
          language: guessLanguage(body.files.map((f) => f.path)),
        })
        .returning();
      const project = created[0]!;
      await app.db.insert(projectFiles).values(
        body.files.map((file) => ({
          projectId: project.id,
          path: file.path,
          content: file.content,
        })),
      );
      await syncProjectToDisk(project.id, body.files);
      await logActivity(
        app.db,
        project.id,
        request.user.id,
        "project.imported",
        `Imported ${body.files.length} file${body.files.length === 1 ? "" : "s"}.`,
      );
      return reply.status(201).send({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          language: project.language,
          template: project.template,
          githubRepo: project.githubRepo,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          fileCount: body.files.length,
        } satisfies ProjectSummary,
      });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/projects/:id/preview-token",
    { preHandler: app.authenticate },
    async (request) => {
      const project = await getProject(app.db, request.user.id, request.params.id);
      const token = signPreviewToken(project.id);
      return {
        token,
        projectId: project.id,
        expiresIn: 3600,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/projects/:id/context",
    { preHandler: app.authenticate },
    async (request) => {
      const project = await getProject(app.db, request.user.id, request.params.id);
      const files = await app.db
        .select({
          path: projectFiles.path,
          content: projectFiles.content,
          updatedAt: projectFiles.updatedAt,
        })
        .from(projectFiles)
        .where(eq(projectFiles.projectId, project.id))
        .orderBy(projectFiles.path);
      const conversationsCount = await app.db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(eq(conversations.projectId, project.id));
      return {
        project: { id: project.id, name: project.name },
        files,
        conversationCount: conversationsCount[0]?.count ?? 0,
      };
    },
  );
}

function guessLanguage(paths: string[]): string {
  const ext = paths.map((p) => path.extname(p).slice(1).toLowerCase()).find(Boolean);
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    html: "html",
    css: "css",
    md: "markdown",
    json: "json",
  };
  return (ext && map[ext]) ?? "text";
}
