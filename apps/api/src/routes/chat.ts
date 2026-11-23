import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import {
  conversations,
  extensionInstalls,
  extensions,
  messages as dbMessages,
  projectFiles,
  projects,
  userSettings,
} from "@astracode/database";
import {
  AGENT_INSTRUCTIONS,
  DEFAULT_SYSTEM_PROMPT,
  chatSchema,
  estimateTokens,
  languageInstruction,
  titleFromMessage,
  type AgentAction,
  type ChatStreamEvent,
  type UsageSource,
} from "@astracode/shared";
import { AiProviderError, parseAgentActions, streamChat } from "@astracode/ai";
import type { ChatMessage } from "@astracode/ai";
import { notFound, parseWith } from "../lib/errors.js";
import { openSse } from "../lib/sse.js";
import { loadModelWithProvider } from "../services/providers.js";
import { builtinTargetFor, isBuiltinModelId } from "../services/builtin.js";

const CONTEXT_FILE_LIMIT = 10;
const CONTEXT_PER_FILE = 3000;
const CONTEXT_TOTAL = 14_000;
const HISTORY_MESSAGES = 20;
const HISTORY_CHARS = 50_000;
const activeChats = new Map<string, AbortController>();

async function buildProjectContext(
  app: FastifyInstance,
  userId: string,
  projectId: string,
): Promise<string> {
  const rows = await app.db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  const project = rows[0];
  if (!project) throw notFound("Project not found");

  const files = await app.db
    .select({ path: projectFiles.path, content: projectFiles.content })
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(projectFiles.path)
    .limit(CONTEXT_FILE_LIMIT);

  let budget = CONTEXT_TOTAL;
  const parts: string[] = [
    `Project context — "${project.name}" (${project.language}). Files available in Astra Studio:`,
  ];
  for (const file of files) {
    if (budget <= 0) break;
    const allowed = Math.min(CONTEXT_PER_FILE, budget);
    const content =
      file.content.length > allowed ? `${file.content.slice(0, allowed)}\n… (truncated)` : file.content;
    parts.push(`\n--- ${file.path} ---\n${content}`);
    budget -= content.length;
  }
  if (files.length === 0) {
    parts.push("\n(The project has no files yet.)");
  }
  return parts.join("\n");
}

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/chat",
    { preHandler: app.authenticate, config: { rateLimit: { max: 40, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = parseWith(chatSchema, request.body);
      const userId = request.user.id;

      const builtinTarget = isBuiltinModelId(body.modelId) ? builtinTargetFor(body.modelId) : null;
      if (isBuiltinModelId(body.modelId) && !builtinTarget) {
        throw notFound("This included model is not configured on this server.");
      }
      const { model, provider, config: providerConfig } =
        builtinTarget ??
        (await loadModelWithProvider(app.db, userId, body.modelId));

      let conversation: typeof conversations.$inferSelect | undefined;
      if (body.conversationId) {
        const rows = await app.db
          .select()
          .from(conversations)
          .where(and(eq(conversations.id, body.conversationId), eq(conversations.userId, userId)))
          .limit(1);
        conversation = rows[0];
        if (!conversation) throw notFound("Conversation not found");
      }

      const projectId = body.projectId ?? conversation?.projectId ?? null;
      let projectContext = "";
      if (projectId) {
        projectContext = await buildProjectContext(app, userId, projectId);
      }

      const historyRows = conversation
        ? (
            await app.db
              .select()
              .from(dbMessages)
              .where(eq(dbMessages.conversationId, conversation.id))
              .orderBy(desc(dbMessages.createdAt))
              .limit(HISTORY_MESSAGES)
          ).reverse()
        : [];

      const settingsRows = await app.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      const language = body.language ?? settingsRows[0]?.language ?? "en";

      const now = new Date();
      if (!conversation) {
        const created = await app.db
          .insert(conversations)
          .values({
            userId,
            title: titleFromMessage(body.message),
            modelId: model.id,
            systemPrompt: body.systemPrompt ?? null,
            projectId,
            updatedAt: now,
          })
          .returning();
        conversation = created[0]!;
      } else {
        const update: Partial<typeof conversations.$inferInsert> = {
          modelId: model.id,
          updatedAt: now,
        };
        if (body.systemPrompt !== undefined) update.systemPrompt = body.systemPrompt;
        if (projectId && projectId !== conversation.projectId) update.projectId = projectId;
        if (conversation.title === "New conversation") {
          update.title = titleFromMessage(body.message);
        }
        await app.db.update(conversations).set(update).where(eq(conversations.id, conversation.id));
        conversation = { ...conversation, ...update };
      }

      const convo = conversation;
      const userMessageRows = await app.db
        .insert(dbMessages)
        .values({
          conversationId: convo.id,
          role: "user",
          content: body.message,
        })
        .returning();
      const userMessage = userMessageRows[0]!;

      const basePrompt =
        (body.systemPrompt !== undefined ? body.systemPrompt : convo.systemPrompt) ||
        DEFAULT_SYSTEM_PROMPT;
      const systemPromptParts = [basePrompt, languageInstruction(language)];
      if (body.agentMode) systemPromptParts.push(AGENT_INSTRUCTIONS);
      if (projectContext) systemPromptParts.push(projectContext);

      const providerMessages: ChatMessage[] = [
        { role: "system", content: systemPromptParts.join("\n\n") },
      ];
      let historyChars = 0;
      for (const message of historyRows) {
        if (message.role !== "user" && message.role !== "assistant") continue;
        if (historyChars + message.content.length > HISTORY_CHARS) break;
        historyChars += message.content.length;
        providerMessages.push({
          role: message.role,
          content: message.content.slice(0, 12_000),
        });
      }
      providerMessages.push({ role: "user", content: body.message });

      const sse = openSse(request, reply);
      const send = (event: ChatStreamEvent) => sse.send(event.type, event);

      send({
        type: "meta",
        conversationId: convo.id,
        userMessageId: userMessage.id,
      });

      let fullText = "";
      let reasoningText = "";
      let usageIn: number | null = null;
      let usageOut: number | null = null;
      let finished = false;
      let clientGone = false;
      const started = performance.now();
      const controller = new AbortController();

      const onClose = () => {
        clientGone = true;
      };
      reply.raw.on("close", onClose);
      activeChats.set(convo.id, controller);

      const persistAssistant = async (): Promise<string | null> => {
        if (!fullText.trim()) return null;
        const inputTokens = usageIn ?? estimateTokens(providerMessages.map((m) => m.content).join("\n"));
        const outputTokens = usageOut ?? estimateTokens(fullText);
        const usageSource: UsageSource =
          usageIn !== null && usageOut !== null ? "provider" : "estimated";
        const actions: AgentAction[] | null = body.agentMode
          ? parseAgentActions(fullText)
          : null;

        const inserted = await app.db
          .insert(dbMessages)
          .values({
            conversationId: convo.id,
            role: "assistant",
            content: fullText,
            reasoning: reasoningText.trim() ? reasoningText : null,
            modelLabel: `${model.label} · ${provider.name}`,
            tokensIn: inputTokens,
            tokensOut: outputTokens,
            latencyMs: Math.round(performance.now() - started),
            usageSource,
            actions: actions && actions.length > 0 ? actions : null,
          })
          .returning();

        await app.db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, convo.id));

        if (!clientGone) {
          send({
            type: "usage",
            usage: {
              inputTokens,
              outputTokens,
              source: usageSource,
            },
            latencyMs: Math.round(performance.now() - started),
          });
          if (actions && actions.length > 0) send({ type: "actions", actions });
          send({
            type: "done",
            conversationId: convo.id,
            messageId: inserted[0]!.id,
            title: convo.title,
          });
        }
        return inserted[0]!.id;
      };

      try {
        const stream = streamChat(providerConfig, {
          model: model.modelName,
          messages: providerMessages,
          maxTokens: model.maxOutput,
          signal: controller.signal,
          conversationId: convo.id,
        });

        for await (const event of stream) {
          if (sse.closed()) clientGone = true;
          if (event.type === "text") {
            fullText += event.text;
            send({ type: "token", text: event.text });
          } else if (event.type === "reasoning") {
            reasoningText += event.text;
            send({ type: "reasoning", text: event.text });
          } else {
            usageIn = event.inputTokens ?? usageIn;
            usageOut = event.outputTokens ?? usageOut;
          }
        }

        finished = true;
        await persistAssistant();
        if (!fullText.trim() && !clientGone) {
          send({
            type: "error",
            message: "The model returned an empty response. Try again or switch models.",
          });
        }
      } catch (error) {
        finished = true;
        const aborted =
          controller.signal.aborted ||
          (error instanceof AiProviderError && error.code === "aborted") ||
          (error instanceof DOMException && error.name === "AbortError");

        if (fullText.trim()) {
          await persistAssistant().catch(() => null);
        }
        if (!aborted && !clientGone) {
          const message =
            error instanceof AiProviderError
              ? error.message
              : "The model request failed. Check Model Hub and try again.";
          send({ type: "error", message });
        }
      } finally {
        finished = true;
        reply.raw.off("close", onClose);
        if (activeChats.get(convo.id) === controller) activeChats.delete(convo.id);
        sse.end();
      }
      return reply;
    },
  );

  app.post("/chat/stop", { preHandler: app.authenticate }, async (request) => {
    const body = (request.body ?? {}) as { conversationId?: unknown };
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : "";
    if (!conversationId) return { stopped: false };
    const rows = await app.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, conversationId), eq(conversations.userId, request.user.id)),
      )
      .limit(1);
    if (!rows[0]) throw notFound("Conversation not found");
    const controller = activeChats.get(conversationId);
    if (!controller) return { stopped: false };
    controller.abort();
    activeChats.delete(conversationId);
    return { stopped: true };
  });

  app.get("/chat/health", { preHandler: app.authenticate }, async () => ({
    status: "ready",
    streaming: true,
  }));

  app.get("/chat/presets", { preHandler: app.authenticate }, async (request) => {
    const rows = await app.db
      .select({ manifest: extensions.manifest })
      .from(extensionInstalls)
      .innerJoin(extensions, eq(extensions.id, extensionInstalls.extensionId))
      .where(
        and(
          eq(extensionInstalls.userId, request.user.id),
          eq(extensionInstalls.enabled, true),
        ),
      );
    const presets = rows.flatMap((row) => row.manifest?.prompts ?? []);
    return { presets };
  });
}
