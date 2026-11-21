import type { ModelDto } from "@astracode/shared";
import type { ProviderConfig } from "@astracode/ai";
import { builtinAi, opencodeFree } from "../env.js";

export const BUILTIN_MODEL_ID = "00000000-0000-4000-8000-00000000a17a";
export const BUILTIN_PROVIDER_ID = "00000000-0000-4000-8000-0000000000b1";
export const BUILTIN_PROVIDER_NAME = "Astra Cloud";

export const OPENCODE_FREE_MODEL_ID = "00000000-0000-4000-8000-00000000a17b";
export const OPENCODE_FREE_PROVIDER_ID = "00000000-0000-4000-8000-0000000000b2";
export const OPENCODE_FREE_PROVIDER_NAME = "OpenCode Free";

export function isBuiltinModelId(id: string): boolean {
  return id === BUILTIN_MODEL_ID || id === OPENCODE_FREE_MODEL_ID;
}

export function builtinModelEnabled(id: string): boolean {
  if (id === OPENCODE_FREE_MODEL_ID) return opencodeFree.enabled;
  return id === BUILTIN_MODEL_ID && builtinAi.enabled;
}

export function preferredBuiltinModelId(): string | null {
  if (opencodeFree.enabled) return OPENCODE_FREE_MODEL_ID;
  if (builtinAi.enabled) return BUILTIN_MODEL_ID;
  return null;
}

export function opencodeFreeModelDto(isDefault = false): ModelDto | null {
  if (!opencodeFree.enabled) return null;
  return {
    id: OPENCODE_FREE_MODEL_ID,
    providerId: OPENCODE_FREE_PROVIDER_ID,
    providerName: OPENCODE_FREE_PROVIDER_NAME,
    providerKind: "custom",
    modelName: opencodeFree.model,
    label: opencodeFree.label,
    contextWindow: opencodeFree.contextWindow,
    maxOutput: opencodeFree.maxOutput,
    notes: "Free through the local OpenCode runtime. No API key. Max reasoning enabled.",
    isDefault,
    isAvailable: true,
    lastCheckedAt: null,
    createdAt: "1970-01-01T00:00:00.000Z",
    isBuiltin: true,
  };
}

export function builtinModelDto(isDefault = false): ModelDto | null {
  if (!builtinAi.enabled) return null;
  return {
    id: BUILTIN_MODEL_ID,
    providerId: BUILTIN_PROVIDER_ID,
    providerName: BUILTIN_PROVIDER_NAME,
    providerKind: "custom",
    modelName: builtinAi.model,
    label: builtinAi.label,
    contextWindow: builtinAi.contextWindow,
    maxOutput: builtinAi.maxOutput,
    notes: "Included with AstraCode. Requests are sent to the server-configured endpoint.",
    isDefault,
    isAvailable: true,
    lastCheckedAt: null,
    createdAt: "1970-01-01T00:00:00.000Z",
    isBuiltin: true,
  };
}

export function builtinModelDtos(defaultModelId: string | null): ModelDto[] {
  const list: ModelDto[] = [];
  const free = opencodeFreeModelDto(defaultModelId === OPENCODE_FREE_MODEL_ID);
  if (free) list.push(free);
  const cloud = builtinModelDto(defaultModelId === BUILTIN_MODEL_ID);
  if (cloud) list.push(cloud);
  return list;
}

export function builtinTargetFor(id: string) {
  if (id === OPENCODE_FREE_MODEL_ID) {
    if (!opencodeFree.enabled) return null;
    const config: ProviderConfig = {
      id: OPENCODE_FREE_PROVIDER_ID,
      kind: "opencode",
      baseUrl: opencodeFree.baseUrl,
      apiKey: opencodeFree.password,
    };
    return {
      model: {
        id: OPENCODE_FREE_MODEL_ID,
        label: opencodeFree.label,
        modelName: opencodeFree.model,
        maxOutput: opencodeFree.maxOutput,
      },
      provider: { id: OPENCODE_FREE_PROVIDER_ID, name: OPENCODE_FREE_PROVIDER_NAME },
      config,
    };
  }
  if (id !== BUILTIN_MODEL_ID || !builtinAi.enabled) return null;
  const config: ProviderConfig = {
    id: BUILTIN_PROVIDER_ID,
    kind: "custom",
    baseUrl: builtinAi.baseUrl,
    apiKey: builtinAi.apiKey,
    ...(builtinAi.chatUrl ? { chatCompletionsUrl: builtinAi.chatUrl } : {}),
  };
  return {
    model: {
      id: BUILTIN_MODEL_ID,
      label: builtinAi.label,
      modelName: builtinAi.model,
      maxOutput: builtinAi.maxOutput,
    },
    provider: { id: BUILTIN_PROVIDER_ID, name: BUILTIN_PROVIDER_NAME },
    config,
  };
}

export function builtinChatTarget() {
  return builtinTargetFor(BUILTIN_MODEL_ID);
}
