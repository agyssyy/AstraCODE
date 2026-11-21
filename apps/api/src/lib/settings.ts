import { and, eq } from "drizzle-orm";
import { models, userSettings } from "@astracode/database";
import type { Database } from "@astracode/database";
import { badRequest, notFound } from "./errors.js";
import { builtinModelEnabled, isBuiltinModelId, preferredBuiltinModelId } from "../services/builtin.js";

export async function ensureSettings(db: Database, userId: string) {
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db.insert(userSettings).values({ userId }).returning();
  return inserted[0]!;
}

export async function setDefaultModel(
  db: Database,
  userId: string,
  modelId: string | null,
): Promise<void> {
  const builtin = Boolean(modelId && isBuiltinModelId(modelId) && builtinModelEnabled(modelId));
  if (modelId && !builtin) {
    const owned = await db
      .select({ id: models.id })
      .from(models)
      .where(and(eq(models.id, modelId), eq(models.userId, userId)))
      .limit(1);
    if (!owned[0]) throw notFound("Model not found");
  }
  await db.transaction(async (tx) => {
    await tx.update(models).set({ isDefault: false }).where(eq(models.userId, userId));
    if (modelId && !builtin) {
      await tx
        .update(models)
        .set({ isDefault: true })
        .where(and(eq(models.id, modelId), eq(models.userId, userId)));
    }
    await ensureSettings(tx as unknown as Database, userId);
    await tx
      .update(userSettings)
      .set({ defaultModelId: modelId, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
  });
}

export async function resolveDefaultModelId(
  db: Database,
  userId: string,
): Promise<string | null> {
  const settings = await ensureSettings(db, userId);
  if (
    settings.defaultModelId &&
    isBuiltinModelId(settings.defaultModelId) &&
    builtinModelEnabled(settings.defaultModelId)
  ) {
    return settings.defaultModelId;
  }
  if (settings.defaultModelId) {
    const owned = await db
      .select({ id: models.id })
      .from(models)
      .where(and(eq(models.id, settings.defaultModelId), eq(models.userId, userId)))
      .limit(1);
    if (owned[0]) return owned[0].id;
  }
  const fallback = await db
    .select({ id: models.id })
    .from(models)
    .where(and(eq(models.userId, userId), eq(models.isDefault, true)))
    .limit(1);
  if (fallback[0]) return fallback[0].id;
  return preferredBuiltinModelId();
}

export function assertOwned<T extends { userId?: string }>(row: T | undefined, _userId: string): T {
  if (!row) throw notFound();
  if (row.userId && row.userId !== _userId) throw badRequest("Invalid resource state");
  return row;
}
