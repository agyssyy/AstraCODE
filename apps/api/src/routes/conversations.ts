import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { conversations, messages, projects } from "@astracode/database";
import {
  conversationCreateSchema,
  conversationUpdateSchema,
  type ConversationSummary,
  type MessageDto,
} from "@astracode/shared";
import { badRequest, notFound, parseWith } from "../lib/errors.js";

async function getConversation(
  app: FastifyInstance,
  userId: string,
  conversationId: string,
) {
  if (!/^[a-f0-9-]{36}$/i.test(conversationId)) throw badRequest("Invalid conversation id");
  const rows = await app.db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  const conversation = rows[0];
  if (!conversation) throw notFound("Conversation not found");
  return conversation;
}

export { getConversation };

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/conversations", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({
        conversation: conversations,
        messageCount: sql<number>`count(${messages.id})::int`,
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.userId, request.user.id))
      .groupBy(conversations.id)
      .orderBy(desc(conversations.updatedAt))
      .limit(100);

    const list: ConversationSummary[] = rows.map(({ conversation, messageCount }) => ({
      id: conversation.id,
      title: conversation.title,
      projectId: conversation.projectId,
      modelId: conversation.modelId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount,
    }));
    return { conversations: list };
  });

  app.post("/conversations", { preHandler: app.authenticate }, async (request, reply) => {
    const body = parseWith(conversationCreateSchema, request.body);
    if (body.projectId) {
      const owned = await app.db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, body.projectId), eq(projects.userId, request.user.id)))
        .limit(1);
      if (!owned[0]) throw notFound("Project not found");
    }
    const created = await app.db
      .insert(conversations)
      .values({
        userId: request.user.id,
        title: body.title?.trim() || "New conversation",
        modelId: body.modelId ?? null,
        systemPrompt: body.systemPrompt ?? null,
        projectId: body.projectId ?? null,
      })
      .returning();
    const conversation = created[0]!;
    return reply.status(201).send({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        projectId: conversation.projectId,
        modelId: conversation.modelId,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: 0,
      } satisfies ConversationSummary,
    });
  });

  app.get<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const conversation = await getConversation(app, request.user.id, request.params.id);
      const rows = await app.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(asc(messages.createdAt));

      const list: MessageDto[] = rows.map((m) => ({
        id: m.id,
        role: m.role as MessageDto["role"],
        content: m.content,
        reasoning: m.reasoning ?? null,
        modelLabel: m.modelLabel,
        tokensIn: m.tokensIn,
        tokensOut: m.tokensOut,
        usageSource: (m.usageSource as MessageDto["usageSource"]) ?? null,
        latencyMs: m.latencyMs,
        actions: m.actions ?? null,
        createdAt: m.createdAt.toISOString(),
      }));

      return {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          projectId: conversation.projectId,
          modelId: conversation.modelId,
          systemPrompt: conversation.systemPrompt,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
        },
        messages: list,
      };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const body = parseWith(conversationUpdateSchema, request.body);
      const conversation = await getConversation(app, request.user.id, request.params.id);
      if (body.projectId) {
        const owned = await app.db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, body.projectId), eq(projects.userId, request.user.id)))
          .limit(1);
        if (!owned[0]) throw notFound("Project not found");
      }
      const update: Partial<typeof conversations.$inferInsert> = { updatedAt: new Date() };
      if (body.title !== undefined) update.title = body.title;
      if (body.modelId !== undefined) update.modelId = body.modelId;
      if (body.systemPrompt !== undefined) update.systemPrompt = body.systemPrompt;
      if (body.projectId !== undefined) update.projectId = body.projectId;
      await app.db.update(conversations).set(update).where(eq(conversations.id, conversation.id));
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: app.authenticate },
    async (request) => {
      const conversation = await getConversation(app, request.user.id, request.params.id);
      await app.db.delete(conversations).where(eq(conversations.id, conversation.id));
      return { ok: true };
    },
  );
}
