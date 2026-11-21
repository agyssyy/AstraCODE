"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  CloudDownload,
  Cpu,
  Edit3,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  Server,
  Sparkles,
  Star,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Select,
  Tooltip,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { ModelDto, ProviderDto, ProviderKind } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { timeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { PageHeader } from "@/components/ui-extras/page-header";
import {
  PROVIDER_PRESETS as PRESETS,
  keyUrlForProvider,
  type ProviderPreset as Preset,
} from "@/lib/provider-presets";

const KIND_LABEL: Record<ProviderKind, string> = {
  openai: "OpenAI",
  ollama: "Ollama",
  custom: "OpenAI-compatible",
};

type ProviderForm = {
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
};

const EMPTY_FORM: ProviderForm = { name: "", kind: "custom", baseUrl: "", apiKey: "" };


type TestState = {
  ok: boolean;
  latencyMs: number;
  message: string;
  at: string;
};

function ProviderGlyph({ name, kind }: { name: string; kind: ProviderKind }) {
  const letter = name.trim().charAt(0).toUpperCase() || "P";
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl border text-[14px] font-semibold",
        kind === "ollama"
          ? "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
          : "border-[hsl(var(--signal))]/20 bg-[hsl(var(--signal))]/10 text-[hsl(var(--signal))]",
      )}
      aria-hidden
    >
      {kind === "ollama" ? <Cpu className="size-4" /> : letter}
    </span>
  );
}

export function ProvidersView() {
  const {
    data: providersData,
    loading: providersLoading,
    refetch: refetchProviders,
  } = useApi<{ providers: ProviderDto[] }>("/providers");
  const {
    data: modelsData,
    loading: modelsLoading,
    refetch: refetchModels,
  } = useApi<{ models: ModelDto[]; defaultModelId: string | null }>("/models");

  const providers = providersData?.providers ?? [];
  const models = modelsData?.models ?? [];
  const defaultModelId = modelsData?.defaultModelId ?? null;
  const builtinModels = models.filter((model) => model.isBuiltin);
  const builtinModel = builtinModels[0] ?? null;
  const userModels = models.filter((model) => !model.isBuiltin);

  const [search, setSearch] = React.useState("");
  const [providerDialog, setProviderDialog] = React.useState<"create" | "edit" | null>(null);
  const [editingProvider, setEditingProvider] = React.useState<ProviderDto | null>(null);
  const [presetId, setPresetId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ProviderForm>(EMPTY_FORM);
  const [clearKey, setClearKey] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [deleteProvider, setDeleteProvider] = React.useState<ProviderDto | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [testingProvider, setTestingProvider] = React.useState<string | null>(null);
  const [tests, setTests] = React.useState<Record<string, TestState>>({});
  const [settingDefault, setSettingDefault] = React.useState<string | null>(null);

  const loading = providersLoading || modelsLoading;
  const totalAvailable = userModels.filter((model) => model.isAvailable === true).length;
  const checkedModels = userModels.filter((model) => model.isAvailable !== null).length;
  const healthyProviders = Object.values(tests).filter((test) => test.ok).length;
  const filteredProviders = providers.filter((provider) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      provider.name.toLowerCase().includes(term) ||
      provider.baseUrl.toLowerCase().includes(term) ||
      KIND_LABEL[provider.kind].toLowerCase().includes(term)
    );
  });

  const openCreate = (preset?: Preset) => {
    setEditingProvider(null);
    setPresetId(preset?.label ?? null);
    setClearKey(false);
    setForm(
      preset
        ? { name: preset.name, kind: preset.kind, baseUrl: preset.baseUrl, apiKey: "" }
        : EMPTY_FORM,
    );
    setProviderDialog("create");
  };

  const openEdit = (provider: ProviderDto) => {
    setEditingProvider(provider);
    setPresetId(null);
    setClearKey(false);
    setForm({
      name: provider.name,
      kind: provider.kind,
      baseUrl: provider.baseUrl,
      apiKey: "",
    });
    setProviderDialog("edit");
  };

  const applyPreset = (preset: Preset) => {
    setPresetId(preset.label);
    setForm({
      name: preset.name,
      kind: preset.kind,
      baseUrl: preset.baseUrl,
      apiKey: "",
    });
  };

  const saveProvider = async () => {
    if (!form.name.trim() || !form.baseUrl.trim()) {
      toast.error("Name and base URL are required.");
      return;
    }
    setPending(true);
    try {
      if (providerDialog === "edit" && editingProvider) {
        await api.patch(`/providers/${editingProvider.id}`, {
          name: form.name.trim(),
          kind: form.kind,
          baseUrl: form.baseUrl.trim(),
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
          ...(clearKey ? { clearKey: true } : {}),
        });
        toast.success(`${form.name.trim()} updated`);
      } else {
        await api.post("/providers", {
          name: form.name.trim(),
          kind: form.kind,
          baseUrl: form.baseUrl.trim(),
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
        });
        toast.success(`${form.name.trim()} connected`, {
          description: "Discover its models in Model Hub.",
        });
      }
      setProviderDialog(null);
      setEditingProvider(null);
      refetchProviders();
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const removeProvider = async () => {
    if (!deleteProvider) return;
    setDeleting(true);
    try {
      await api.delete(`/providers/${deleteProvider.id}`);
      toast.success(`${deleteProvider.name} removed`);
      setDeleteProvider(null);
      refetchProviders();
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const testProvider = async (provider: ProviderDto) => {
    setTestingProvider(provider.id);
    try {
      const result = await api.post<{ ok: boolean; latencyMs: number; message: string }>(
        `/providers/${provider.id}/test`,
      );
      setTests((current) => ({
        ...current,
        [provider.id]: {
          ok: result.ok,
          latencyMs: result.latencyMs,
          message: result.message,
          at: new Date().toISOString(),
        },
      }));
      if (result.ok) {
        toast.success(`${provider.name} connected`, {
          description: `${result.message} · ${result.latencyMs} ms`,
        });
      } else {
        toast.error(`${provider.name} failed`, { description: result.message });
      }
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTestingProvider(null);
    }
  };

  const makeDefault = async (model: ModelDto) => {
    setSettingDefault(model.id);
    try {
      await api.patch(`/models/${model.id}`, { isDefault: true });
      toast.success(`${model.label} is now the default model`);
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSettingDefault(null);
    }
  };

  const activePreset = PRESETS.find((preset) => preset.label === presetId) ?? null;
  const activeKeyUrl = activePreset?.keyUrl ?? keyUrlForProvider(form.name, form.baseUrl);

  return (
    <div className="providers-shell page-enter space-y-7">
      <PageHeader
        eyebrow="Platform / Providers"
        title="Providers"
        description="One board for every model provider: keys, endpoints, health checks and defaults. AstraCode speaks the OpenAI chat-completions protocol, so any compatible gateway works."
        actions={
          <>
            <Link href="/models">
              <Button variant="secondary">
                <CloudDownload className="size-4" /> Model Hub
              </Button>
            </Link>
            <Button onClick={() => openCreate()}>
              <Plus className="size-4" /> Add provider
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Connected",
            value: providers.length.toString(),
            detail: providers.length === 1 ? "provider" : "providers",
            icon: Server,
          },
          {
            label: "Models",
            value: userModels.length.toString(),
            detail: `${totalAvailable} available${checkedModels > 0 ? ` of ${checkedModels} checked` : ""}`,
            icon: Cloud,
          },
          {
            label: "Default",
            value:
              models.find((model) => model.id === defaultModelId)?.label ??
              builtinModel?.label ??
              "None",
            detail: defaultModelId ? "pinned for new chats" : "pick a model in Model Hub",
            icon: Star,
          },
          {
            label: "Health",
            value: healthyProviders > 0 ? `${healthyProviders} online` : "Not tested",
            detail: healthyProviders > 0 ? "this session" : "run a connection test",
            icon: Activity,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-tile rounded-2xl p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                {item.label}
              </p>
              <item.icon className="size-3.5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="mt-2 truncate text-[20px] font-semibold tracking-[-0.03em]">{item.value}</p>
            <p className="mt-0.5 truncate text-[11px] text-[hsl(var(--muted-foreground))]">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold">Quick connect</h2>
            <p className="mt-0.5 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              Pick a preset to prefill the endpoint, then paste your key.
            </p>
          </div>
          <span className="hidden text-[11px] text-[hsl(var(--muted-foreground))] sm:block">
            {PRESETS.length} presets
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRESETS.map((preset) => (
            <Tooltip key={preset.label} content={preset.note}>
              <button
                type="button"
                onClick={() => openCreate(preset)}
                className="glass-tile group flex items-center gap-3 rounded-2xl p-3 text-left"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[12px] font-semibold text-[hsl(var(--foreground))]">
                  {preset.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium leading-tight">{preset.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[hsl(var(--muted-foreground))]">
                    {preset.kind === "ollama"
                      ? "Local, no key"
                      : preset.kind === "openai"
                        ? "OpenAI API"
                        : "Compatible"}
                  </span>
                </span>
                <Plus className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--signal))]" />
              </button>
            </Tooltip>
          ))}
        </div>
        <p className="text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          ChatGPT/Codex plans and Copilot subscriptions are not API keys. Those presets use the
          official OpenAI API and GitHub Models with a personal access token instead.
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
          <span>Get an API key:</span>
          {PRESETS.filter((preset) => preset.keyUrl).map((preset, index) => (
            <React.Fragment key={preset.label}>
              {index > 0 ? <span aria-hidden>·</span> : null}
              <a
                href={preset.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[hsl(var(--foreground))] underline-offset-2 hover:underline"
              >
                {preset.label}
              </a>
            </React.Fragment>
          ))}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[13px] font-semibold">Your providers</h2>
            <p className="mt-0.5 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              {providers.length} connected · keys are encrypted at rest
            </p>
          </div>
          <label className="relative flex w-full items-center sm:w-64">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-[hsl(var(--muted-foreground))]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search providers…"
              className="h-8 rounded-lg pl-8 text-[12px]"
            />
          </label>
        </div>

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-48 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {builtinModels.map((model) => (
              <Card key={model.id} className="glass-card glass-card-signal overflow-hidden">
                <div className="flex items-start gap-3 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--signal))]/25 bg-[hsl(var(--signal))]/10 text-[hsl(var(--signal))]">
                    {model.providerName.toLowerCase().includes("opencode") ? (
                      <Zap className="size-4" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13.5px] font-semibold">{model.providerName}</p>
                      <Badge variant="signal">Included</Badge>
                      {model.id === defaultModelId ? <Badge variant="warning">Default</Badge> : null}
                    </div>
                    <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                      {model.label} · no API key needed
                    </p>
                    <p className="mt-1 truncate font-mono text-[10.5px] text-[hsl(var(--muted-foreground))]">
                      {model.modelName}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-[hsl(var(--border))] px-5 py-3 text-[11px]">
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Key</p>
                    <p className="mt-0.5 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="size-3 text-[hsl(var(--signal))]" /> None
                    </p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Model</p>
                    <p className="mt-0.5 font-medium">{model.label}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Health</p>
                    <p className="mt-0.5 font-medium">Ready</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border))] px-5 py-3">
                  <p className="max-w-[240px] text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {model.notes ?? "No setup or key needed."}
                  </p>
                  <div className="flex gap-1.5">
                    {model.id !== defaultModelId ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void makeDefault(model)}
                        disabled={settingDefault === model.id}
                      >
                        {settingDefault === model.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Star className="size-3.5" />
                        )}
                        Make default
                      </Button>
                    ) : null}
                    <Link href="/chat">
                      <Button size="sm" variant="ghost">
                        Open chat <ArrowUpRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}

            {filteredProviders.map((provider) => {
              const providerModels = userModels.filter(
                (model) => model.providerId === provider.id,
              );
              const available = providerModels.filter(
                (model) => model.isAvailable === true,
              ).length;
              const test = tests[provider.id];
              const defaultModel = providerModels.find((model) => model.isDefault);
              const keyUrl = keyUrlForProvider(provider.name, provider.baseUrl);
              return (
                <Card key={provider.id} className="glass-card overflow-hidden">
                  <div className="flex items-start gap-3 p-5">
                    <ProviderGlyph name={provider.name} kind={provider.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[13.5px] font-semibold">{provider.name}</p>
                        <Badge variant="outline">{KIND_LABEL[provider.kind]}</Badge>
                        {defaultModel ? <Badge variant="warning">Default</Badge> : null}
                      </div>
                      <p className="truncate font-mono text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        {provider.baseUrl}
                      </p>
                      <p className="mt-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        Added {timeAgo(provider.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <Tooltip content="Edit provider">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(provider)}
                          aria-label="Edit provider"
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Remove provider">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                          onClick={() => setDeleteProvider(provider)}
                          aria-label="Delete provider"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-[hsl(var(--border))] px-5 py-3 text-[11px]">
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">API key</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate font-medium">
                        <KeyRound className="size-3 text-[hsl(var(--muted-foreground))]" />
                        {provider.hasKey ? provider.keyHint : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Models</p>
                      <p className="mt-0.5 font-medium">
                        {provider.modelCount}
                        {provider.modelCount > 0 ? ` · ${available} live` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Health</p>
                      <p
                        className={cn(
                          "mt-0.5 flex items-center gap-1 font-medium",
                          test
                            ? test.ok
                              ? "text-[hsl(var(--signal))]"
                              : "text-[hsl(var(--destructive))]"
                            : "text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        {test ? (
                          test.ok ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <XCircle className="size-3" />
                          )
                        ) : (
                          <Activity className="size-3" />
                        )}
                        {test ? `${test.latencyMs} ms` : "Not tested"}
                      </p>
                    </div>
                  </div>

                  {providerModels.length > 0 ? (
                    <div className="border-t border-[hsl(var(--border))] px-5 py-2.5">
                      <ul className="space-y-0.5">
                        {providerModels.slice(0, 3).map((model) => (
                          <li key={model.id} className="flex items-center gap-2 py-0.5">
                            <button
                              type="button"
                              onClick={() => void makeDefault(model)}
                              disabled={settingDefault === model.id}
                              aria-label={`Set ${model.label} as default`}
                              className={cn(
                                "shrink-0 transition-colors",
                                model.id === defaultModelId
                                  ? "text-[hsl(var(--warning))]"
                                  : "text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--warning))]",
                              )}
                            >
                              {settingDefault === model.id ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <Star
                                  className={cn(
                                    "size-3.5",
                                    model.id === defaultModelId && "fill-current",
                                  )}
                                />
                              )}
                            </button>
                            <span className="min-w-0 flex-1 truncate text-[11.5px]">
                              {model.label}
                            </span>
                            <span className="shrink-0 font-mono text-[9.5px] text-[hsl(var(--muted-foreground))]">
                              {model.modelName}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {providerModels.length > 3 ? (
                        <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                          +{providerModels.length - 3} more in Model Hub
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {test && !test.ok ? (
                    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--destructive))]/5 px-5 py-2 text-[11px] text-[hsl(var(--destructive))]">
                      {test.message}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border))] px-5 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void testProvider(provider)}
                      disabled={testingProvider === provider.id}
                    >
                      {testingProvider === provider.id ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
                      {testingProvider === provider.id ? "Testing…" : "Test connection"}
                    </Button>
                    {keyUrl ? (
                      <a
                        href={keyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                      >
                        Get {provider.name} API key <ArrowUpRight className="size-3.5" />
                      </a>
                    ) : null}
                    <Link href="/models">
                      <Button size="sm" variant="ghost">
                        Manage models <ArrowUpRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}

            {filteredProviders.length === 0 && !loading ? (
              <Card className="flex flex-col items-center justify-center px-6 py-12 text-center lg:col-span-2">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[hsl(var(--muted))]">
                  <Server className="size-5 text-[hsl(var(--muted-foreground))]" />
                </span>
                <p className="mt-3 text-[13px] font-semibold">
                  {providers.length === 0 ? "No providers yet" : "No matching providers"}
                </p>
                <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {providers.length === 0
                    ? "Pick a quick-connect preset above, or add any OpenAI-compatible endpoint."
                    : "Try another name, URL or protocol."}
                </p>
                <Button size="sm" className="mt-4" onClick={() => openCreate()}>
                  <Plus className="size-4" /> Add provider
                </Button>
              </Card>
            ) : null}
          </div>
        )}
      </section>

      <Dialog
        open={providerDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProviderDialog(null);
            setEditingProvider(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {providerDialog === "edit" ? "Edit provider" : "Add provider"}
            </DialogTitle>
            <DialogDescription>
              Keys are encrypted with AES-256-GCM and never shown again. Any OpenAI-compatible
              gateway works.
            </DialogDescription>
          </DialogHeader>

          {providerDialog === "create" ? (
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                    presetId === preset.label
                      ? "border-[hsl(var(--signal))] bg-[hsl(var(--signal))]/10 text-[hsl(var(--foreground))]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="NVIDIA"
                  autoFocus
                />
              </Field>
              <Field label="Protocol">
                <Select
                  value={form.kind}
                  onChange={(event) =>
                    setForm({ ...form, kind: event.target.value as ProviderKind })
                  }
                >
                  <option value="custom">OpenAI-compatible</option>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                </Select>
              </Field>
            </div>
            <Field label="Base URL" hint="No trailing slash needed">
              <Input
                value={form.baseUrl}
                onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
                placeholder="https://integrate.api.nvidia.com/v1"
                className="font-mono text-[12px]"
              />
            </Field>
            {form.kind !== "ollama" ? (
              <Field
                label="API key"
                hint={
                  providerDialog === "edit"
                    ? "Leave blank to keep the current key"
                    : "Stored encrypted with AES-256-GCM"
                }
              >
                <Input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                  placeholder={activePreset?.hint ?? "sk-…"}
                  autoComplete="off"
                  className="font-mono text-[12px]"
                />
                {activeKeyUrl ? (
                  <a
                    href={activeKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--signal))] hover:underline"
                  >
                    Get your API key <ArrowUpRight className="size-3" />
                  </a>
                ) : null}
                {providerDialog === "edit" && editingProvider?.hasKey ? (
                  <label className="mt-1.5 flex items-center gap-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                    <input
                      type="checkbox"
                      checked={clearKey}
                      onChange={(event) => setClearKey(event.target.checked)}
                      className="size-3.5 accent-[hsl(var(--primary))]"
                    />
                    Remove the stored key
                  </label>
                ) : null}
              </Field>
            ) : (
              <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-3 py-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                Ollama runs locally and needs no API key. Start it with <code>ollama serve</code>{" "}
                and pull a model first.
              </p>
            )}
            {activePreset ? (
              <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-3 py-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                {activePreset.note}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setProviderDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveProvider()} disabled={pending}>
              {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {providerDialog === "edit" ? "Save changes" : "Add provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteProvider !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProvider(null);
        }}
        title={`Remove ${deleteProvider?.name ?? "provider"}?`}
        description="This deletes the provider, its stored key and its models. The default model is cleared if it belonged to this provider."
        confirmLabel="Remove provider"
        destructive
        pending={deleting}
        onConfirm={removeProvider}
      />
    </div>
  );
}
