import { and, eq } from "drizzle-orm";
import { aiProviders, models } from "@astracode/database";
import type { Database } from "@astracode/database";
import type { ProviderConfig, ProviderKind } from "@astracode/ai";
import type { ProviderDto } from "@astracode/shared";
import { decryptSecret, keyHint } from "../lib/crypto.js";
import { notFound } from "../lib/errors.js";

export function toProviderDto(
  row: typeof aiProviders.$inferSelect,
  modelCount: number,
): ProviderDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ProviderDto["kind"],
    baseUrl: row.baseUrl,
    hasKey: Boolean(row.apiKeyCipher),
    keyHint: keyHint(row.apiKeyCipher),
    createdAt: row.createdAt.toISOString(),
    modelCount,
  };
}

export async function providerConfigFor(
  db: Database,
  userId: string,
  providerId: string,
): Promise<{ config: ProviderConfig; row: typeof aiProviders.$inferSelect }> {
  const rows = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.id, providerId), eq(aiProviders.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw notFound("Provider not found");
  return {
    row,
    config: {
      id: row.id,
      kind: row.kind as ProviderDto["kind"],
      baseUrl: row.baseUrl,
      apiKey: decryptSecret(row.apiKeyCipher),
    },
  };
}

export async function loadModelWithProvider(
  db: Database,
  userId: string,
  modelId: string,
): Promise<{
  model: typeof models.$inferSelect;
  provider: typeof aiProviders.$inferSelect;
  config: ProviderConfig;
}> {
  const rows = await db
    .select({ model: models, provider: aiProviders })
    .from(models)
    .innerJoin(aiProviders, eq(aiProviders.id, models.providerId))
    .where(and(eq(models.id, modelId), eq(models.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw notFound("Model not found. Add it in Model Hub.");
  return {
    model: row.model,
    provider: row.provider,
    config: {
      id: row.provider.id,
      kind: row.provider.kind as ProviderKind,
      baseUrl: row.provider.baseUrl,
      apiKey: decryptSecret(row.provider.apiKeyCipher),
    },
  };
}
