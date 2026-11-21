import type { ProviderKind } from "@astracode/shared";

export type ProviderPreset = {
  label: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  note: string;
  hint: string;
  keyUrl?: string;
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "ChatGPT / Codex",
    name: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    note: "Official OpenAI API. ChatGPT and Codex subscriptions are not API keys.",
    hint: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    label: "GitHub / Copilot",
    name: "GitHub Models",
    kind: "custom",
    baseUrl: "https://models.github.ai/inference",
    note: "GitHub Models with a PAT that has models:read. Copilot session tokens are not supported.",
    hint: "github_pat_…",
    keyUrl: "https://github.com/settings/tokens?type=beta",
  },
  {
    label: "NVIDIA NIM",
    name: "NVIDIA",
    kind: "custom",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    note: "NVIDIA hosted NIM endpoints.",
    hint: "nvapi-…",
    keyUrl: "https://build.nvidia.com/settings/api-keys",
  },
  {
    label: "DeepSeek",
    name: "DeepSeek",
    kind: "custom",
    baseUrl: "https://api.deepseek.com/v1",
    note: "DeepSeek direct API, strong coding models.",
    hint: "sk-…",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    label: "xAI Grok",
    name: "xAI",
    kind: "custom",
    baseUrl: "https://api.x.ai/v1",
    note: "Grok models through the xAI API.",
    hint: "xai-…",
    keyUrl: "https://console.x.ai/",
  },
  {
    label: "Groq",
    name: "Groq",
    kind: "custom",
    baseUrl: "https://api.groq.com/openai/v1",
    note: "Very fast LPU inference.",
    hint: "gsk_…",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    label: "Cerebras",
    name: "Cerebras",
    kind: "custom",
    baseUrl: "https://api.cerebras.ai/v1",
    note: "Very high token throughput.",
    hint: "csk-…",
    keyUrl: "https://cloud.cerebras.ai/",
  },
  {
    label: "OpenRouter",
    name: "OpenRouter",
    kind: "custom",
    baseUrl: "https://openrouter.ai/api/v1",
    note: "Many models from many vendors, one key.",
    hint: "sk-or-…",
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    label: "OpenCode",
    name: "OpenCode",
    kind: "custom",
    baseUrl: "https://opencode.ai/inference/openai/v1",
    note: "OpenCode Console models, one key.",
    hint: "…",
    keyUrl: "https://opencode.ai/auth",
  },
  {
    label: "Together AI",
    name: "Together",
    kind: "custom",
    baseUrl: "https://api.together.xyz/v1",
    note: "Open models on Together's API.",
    hint: "…",
    keyUrl: "https://api.together.xyz/settings/api-keys",
  },
  {
    label: "Fireworks",
    name: "Fireworks",
    kind: "custom",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    note: "Fast open-model inference.",
    hint: "fw_…",
    keyUrl: "https://fireworks.ai/account/api-keys",
  },
  {
    label: "Mistral",
    name: "Mistral",
    kind: "custom",
    baseUrl: "https://api.mistral.ai/v1",
    note: "Mistral AI hosted models.",
    hint: "…",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    label: "Ollama",
    name: "Ollama",
    kind: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    note: "Runs on your machine. No API key needed.",
    hint: "No key",
  },
];

const KEY_LOOKUP_STOPWORDS = new Set([
  "api",
  "app",
  "chat",
  "cloud",
  "com",
  "inference",
  "models",
  "platform",
  "www",
]);

export function keyUrlForProvider(name: string, baseUrl: string): string | null {
  const normalized = baseUrl.trim().replace(/\/+$/, "").toLowerCase();
  if (normalized) {
    const exact = PROVIDER_PRESETS.find(
      (preset) =>
        preset.keyUrl &&
        preset.baseUrl.trim().replace(/\/+$/, "").toLowerCase() === normalized,
    );
    if (exact?.keyUrl) return exact.keyUrl;
  }
  const haystack = `${name} ${baseUrl}`.toLowerCase();
  for (const preset of PROVIDER_PRESETS) {
    if (!preset.keyUrl) continue;
    const tokens = `${preset.label} ${preset.name}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !KEY_LOOKUP_STOPWORDS.has(token));
    if (tokens.some((token) => haystack.includes(token))) return preset.keyUrl;
  }
  return null;
}
