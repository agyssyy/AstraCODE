import { completeOllama, listOllamaModels, streamOllama } from "./ollama.js";
import { completeOpenCode, listOpenCodeModels, streamOpenCode } from "./opencode.js";
import { completeOpenAI, listOpenAIModels, streamOpenAI } from "./openai.js";
import type {
  AIChatEvent,
  ChatRequestOptions,
  CompleteResult,
  ProviderConfig,
  RemoteModel,
} from "./types.js";

export * from "./types.js";
export { parseAgentActions } from "./agent.js";
export { readSseEvents } from "./openai.js";

export async function* streamChat(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): AsyncGenerator<AIChatEvent> {
  if (provider.kind === "ollama") {
    yield* streamOllama(provider, options);
    return;
  }
  if (provider.kind === "opencode") {
    yield* streamOpenCode(provider, options);
    return;
  }
  yield* streamOpenAI(provider, options);
}

export async function completeChat(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): Promise<CompleteResult> {
  if (provider.kind === "ollama") {
    return completeOllama(provider, options);
  }
  if (provider.kind === "opencode") {
    return completeOpenCode(provider, options);
  }
  return completeOpenAI(provider, options);
}

export async function listRemoteModels(provider: ProviderConfig): Promise<RemoteModel[]> {
  if (provider.kind === "ollama") {
    return listOllamaModels(provider);
  }
  if (provider.kind === "opencode") {
    return listOpenCodeModels(provider);
  }
  return listOpenAIModels(provider);
}
