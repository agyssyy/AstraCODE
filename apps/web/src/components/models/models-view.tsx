"use client";

import * as React from "react";
import {
  ArrowUpRight,
  Check,
  CloudDownload,
  Cpu,
  Edit3,
  Gauge,
  KeyRound,
  LoaderCircle,
  Plus,
  Server,
  Sparkles,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Select,
  Textarea,
  Tooltip,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { ModelDto, ProviderDto, ProviderKind } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { timeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { EmptyState } from "@/components/ui-extras/empty-state";
import { PageHeader } from "@/components/ui-extras/page-header";
import { PROVIDER_PRESETS as QUICK_PRESETS, keyUrlForProvider } from "@/lib/provider-presets";

type RemoteModel = { id: string; label?: string; added: boolean };

type ProviderForm = {
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
};

const EMPTY_FORM: ProviderForm = { name: "", kind: "openai", baseUrl: "", apiKey: "" };

const KIND_LABEL: Record<ProviderKind, string> = {
  openai: "OpenAI",
  ollama: "Ollama",
  custom: "OpenAI-compatible",
};

export function ModelsView() {
  const {
    data: modelsData,
    loading: modelsLoading,
    refetch: refetchModels,
  } = useApi<{ models: ModelDto[]; defaultModelId: string | null }>("/models");
  const {
    data: providersData,
    loading: providersLoading,
    refetch: refetchProviders,
  } = useApi<{ providers: ProviderDto[] }>("/providers");

  const models = modelsData?.models ?? [];
  const providers = providersData?.providers ?? [];
  const defaultModelId = modelsData?.defaultModelId ?? null;

  const [providerDialog, setProviderDialog] = React.useState<"create" | "edit" | null>(null);
  const [editingProvider, setEditingProvider] = React.useState<ProviderDto | null>(null);
  const [form, setForm] = React.useState<ProviderForm>(EMPTY_FORM);
  const [clearKey, setClearKey] = React.useState(false);
  const [providerPending, setProviderPending] = React.useState(false);
  const [deleteProvider, setDeleteProvider] = React.useState<ProviderDto | null>(null);
  const [testingProvider, setTestingProvider] = React.useState<string | null>(null);

  const [discoverProvider, setDiscoverProvider] = React.useState<ProviderDto | null>(null);
  const [remoteModels, setRemoteModels] = React.useState<RemoteModel[] | null>(null);
  const [discoverLoading, setDiscoverLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [discoverSearch, setDiscoverSearch] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const [modelDialog, setModelDialog] = React.useState(false);
  const [modelForm, setModelForm] = React.useState({
    providerId: "",
    modelName: "",
    label: "",
    contextWindow: "128000",
    maxOutput: "8192",
    notes: "",
    isDefault: false,
  });
  const [modelPending, setModelPending] = React.useState(false);
  const [deleteModel, setDeleteModel] = React.useState<ModelDto | null>(null);
  const [testingModel, setTestingModel] = React.useState<string | null>(null);
  const activeKeyUrl = keyUrlForProvider(form.name, form.baseUrl);

  const openCreateProvider = (preset?: (typeof QUICK_PRESETS)[number]) => {
    setEditingProvider(null);
    setClearKey(false);
    setForm(
      preset
        ? { name: preset.name, kind: preset.kind, baseUrl: preset.baseUrl, apiKey: "" }
        : EMPTY_FORM,
    );
    setProviderDialog("create");
  };

  const openEditProvider = (provider: ProviderDto) => {
    setEditingProvider(provider);
    setClearKey(false);
    setForm({
      name: provider.name,
      kind: provider.kind,
      baseUrl: provider.baseUrl,
      apiKey: "",
    });
    setProviderDialog("edit");
  };

  const saveProvider = async () => {
    if (!form.name.trim() || !form.baseUrl.trim()) {
      toast.error("Name and base URL are required.");
      return;
    }
    setProviderPending(true);
    try {
      if (providerDialog === "edit" && editingProvider) {
        await api.patch(`/providers/${editingProvider.id}`, {
          name: form.name.trim(),
          kind: form.kind,
          baseUrl: form.baseUrl.trim(),
          ...(form.apiKey ? { apiKey: form.apiKey } : {}),
          ...(clearKey ? { clearKey: true } : {}),
        });
        toast.success("Provider updated");
      } else {
        await api.post("/providers", {
          name: form.name.trim(),
          kind: form.kind,
          baseUrl: form.baseUrl.trim(),
          apiKey: form.apiKey || undefined,
        });
        toast.success("Provider added", { description: "Now discover or add models." });
      }
      setProviderDialog(null);
      refetchProviders();
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProviderPending(false);
    }
  };

  const removeProvider = async () => {
    if (!deleteProvider) return;
    setProviderPending(true);
    try {
      await api.delete(`/providers/${deleteProvider.id}`);
      toast.success("Provider removed");
      setDeleteProvider(null);
      refetchProviders();
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProviderPending(false);
    }
  };

  const testProvider = async (provider: ProviderDto) => {
    setTestingProvider(provider.id);
    try {
      const result = await api.post<{ ok: boolean; latencyMs: number; message: string }>(
        `/providers/${provider.id}/test`,
      );
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

  const openDiscover = async (provider: ProviderDto) => {
    setDiscoverProvider(provider);
    setRemoteModels(null);
    setSelected(new Set());
    setDiscoverSearch("");
    setDiscoverLoading(true);
    try {
      const result = await api.post<{ models: RemoteModel[] }>(`/providers/${provider.id}/discover`);
      setRemoteModels(result.models);
    } catch (error) {
      toast.error(errorMessage(error));
      setRemoteModels([]);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const addDiscovered = async () => {
    if (!discoverProvider || !remoteModels) return;
    const picks = remoteModels.filter((model) => selected.has(model.id) && !model.added);
    if (picks.length === 0) return;
    setAdding(true);
    let added = 0;
    let failed = 0;
    for (const remote of picks) {
      try {
        await api.post("/models", {
          providerId: discoverProvider.id,
          modelName: remote.id,
          label: remote.label?.trim() || remote.id,
          contextWindow: 128_000,
          maxOutput: 8_192,
        });
        added += 1;
      } catch {
        failed += 1;
      }
    }
    setAdding(false);
    if (added > 0) {
      toast.success(`${added} model${added === 1 ? "" : "s"} added`, {
        description: failed > 0 ? `${failed} could not be added.` : "Set your default model below.",
      });
    } else {
      toast.error("No models could be added.");
    }
    setDiscoverProvider(null);
    refetchModels();
    refetchProviders();
  };

  const openModelDialog = (providerId?: string) => {
    setModelForm({
      providerId: providerId ?? providers[0]?.id ?? "",
      modelName: "",
      label: "",
      contextWindow: "128000",
      maxOutput: "8192",
      notes: "",
      isDefault: models.length === 0,
    });
    setModelDialog(true);
  };

  const saveModel = async () => {
    setModelPending(true);
    try {
      await api.post("/models", {
        providerId: modelForm.providerId,
        modelName: modelForm.modelName.trim(),
        label: modelForm.label.trim() || modelForm.modelName.trim(),
        contextWindow: Number(modelForm.contextWindow),
        maxOutput: Number(modelForm.maxOutput),
        notes: modelForm.notes.trim() || null,
        isDefault: modelForm.isDefault,
      });
      toast.success("Model added");
      setModelDialog(false);
      refetchModels();
      refetchProviders();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setModelPending(false);
    }
  };

  const makeDefault = async (model: ModelDto) => {
    try {
      await api.patch(`/models/${model.id}`, { isDefault: true });
      toast.success(`${model.label} is now the default model`);
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const removeModel = async () => {
    if (!deleteModel) return;
    setModelPending(true);
    try {
      await api.delete(`/models/${deleteModel.id}`);
      toast.success("Model removed");
      setDeleteModel(null);
      refetchModels();
      refetchProviders();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setModelPending(false);
    }
  };

  const testModel = async (model: ModelDto) => {
    setTestingModel(model.id);
    try {
      const result = await api.post<{ ok: boolean; message: string; latencyMs: number }>(
        `/models/${model.id}/test`,
      );
      if (result.ok) {
        toast.success(`${model.label} available`, { description: `${result.latencyMs} ms` });
      } else {
        toast.error(`${model.label} check failed`, { description: result.message });
      }
      refetchModels();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTestingModel(null);
    }
  };

  const filteredRemote = (remoteModels ?? []).filter((model) =>
    model.id.toLowerCase().includes(discoverSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform / Model Hub"
        title="Model Hub"
        description="Connect any OpenAI-compatible endpoint, Ollama or a custom API. Keys are encrypted at rest and never shown again."
        actions={
          <>
            <Button
              variant="secondary"
              className="font-mono text-[10px] uppercase tracking-[0.08em]"
              onClick={() => openModelDialog()}
              disabled={providers.length === 0}
            >
              <Cpu className="size-4" /> Add model
            </Button>
            <Button
              className="font-mono text-[10px] uppercase tracking-[0.08em]"
              onClick={() => openCreateProvider()}
            >
              <Plus className="size-4" /> Add provider
            </Button>
          </>
        }
      />

      <div className="stagger-fade flex flex-wrap gap-1.5">
        {QUICK_PRESETS.map((preset) => (
          <Tooltip key={preset.label} content={preset.note}>
            <button
              type="button"
              onClick={() => openCreateProvider(preset)}
              className="group flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--muted-foreground))] transition-all duration-200 hover:-translate-y-px hover:border-[hsl(var(--signal))]/60 hover:text-[hsl(var(--foreground))]"
            >
              <span className="size-1 bg-[hsl(var(--signal))]/60 transition-colors group-hover:bg-[hsl(var(--signal))]" />
              {preset.label}
            </button>
          </Tooltip>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Providers</h2>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {providers.length} connected
          </span>
        </div>
        {providersLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((key) => (
              <div key={key} className="h-28 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <Card className="overflow-hidden">
            <EmptyState
              icon={Server}
              eyebrow="Step 01 / Connect"
              title="No providers connected"
              description="Start with Groq for very fast replies, OpenRouter for choice, or Ollama for a fully local setup."
              action={
                <Button size="sm" onClick={() => openCreateProvider()}>
                  <Plus className="size-4" /> Add your first provider
                </Button>
              }
            >
              <div className="mt-8 grid w-full max-w-3xl gap-px border border-[hsl(var(--border))] bg-[hsl(var(--border))] text-left sm:grid-cols-3">
                {[
                  { icon: KeyRound, step: "01", title: "Connect a provider", detail: "A compatible URL and key." },
                  { icon: CloudDownload, step: "02", title: "Discover models", detail: "Pull the provider catalogue." },
                  { icon: Star, step: "03", title: "Pin a default", detail: "Use it in chat and Studio." },
                ].map((item) => (
                  <div key={item.step} className="group bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--muted))]/40">
                    <div className="flex items-center justify-between">
                      <item.icon className="size-4 text-[hsl(var(--signal))]" />
                      <span className="font-mono text-[9px] text-[hsl(var(--muted-foreground))]">{item.step}</span>
                    </div>
                    <p className="mt-3 text-[12px] font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </EmptyState>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      {provider.kind === "ollama" ? (
                        <Cpu className="size-4 text-[hsl(var(--primary))]" />
                      ) : (
                        <Sparkles className="size-4 text-[hsl(var(--primary))]" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium">{provider.name}</p>
                        <Badge variant="outline">{KIND_LABEL[provider.kind]}</Badge>
                      </div>
                      <p className="truncate font-mono text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        {provider.baseUrl}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        <span className="inline-flex items-center gap-1">
                          <KeyRound className="size-3" />
                          {provider.hasKey ? provider.keyHint : "No key"}
                        </span>
                        <span>·</span>
                        <span>{provider.modelCount} models</span>
                        {keyUrlForProvider(provider.name, provider.baseUrl) ? (
                          <>
                            <span>·</span>
                            <a
                              href={keyUrlForProvider(provider.name, provider.baseUrl) ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 font-medium text-[hsl(var(--signal))] hover:underline"
                            >
                              Get {provider.name} API key <ArrowUpRight className="size-3" />
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Tooltip content="Edit provider">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditProvider(provider)} aria-label="Edit provider">
                          <Edit3 className="size-3.5" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Remove provider">
                        <Button variant="ghost" size="icon" className="size-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" onClick={() => setDeleteProvider(provider)} aria-label="Delete provider">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
                      Test
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void openDiscover(provider)}>
                      <CloudDownload className="size-3.5" /> Discover
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openModelDialog(provider.id)}>
                      <Plus className="size-3.5" /> Model
                    </Button>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Models</h2>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {models.length} configured
          </span>
        </div>
        {modelsLoading ? (
          <div className="h-40 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
        ) : models.length === 0 ? (
          <Card>
            <EmptyState
              icon={Cpu}
              compact
              title="No models yet"
              description="Discover models from a connected provider, or add one by its exact model id."
              action={
                providers.length > 0 ? (
                  <Button size="sm" variant="secondary" onClick={() => void openDiscover(providers[0]!)}>
                    <CloudDownload className="size-4" /> Discover from {providers[0]!.name}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => openCreateProvider()}>
                    <Plus className="size-4" /> Connect a provider first
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <Card>
            <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.7fr_auto] gap-3 border-b border-[hsl(var(--border))] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] md:grid">
              <span>Model</span>
              <span>Provider</span>
              <span>Context</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-[hsl(var(--border))]">
              {models.map((model) => (
                <li key={model.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_auto] md:items-center md:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void makeDefault(model)}
                        aria-label="Set as default model"
                        className={cn(
                          "transition-colors",
                          model.id === defaultModelId
                            ? "text-[hsl(var(--warning))]"
                            : "text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--warning))]",
                        )}
                      >
                        <Star className={cn("size-4", model.id === defaultModelId && "fill-current")} />
                      </button>
                      <p className="truncate text-[12.5px] font-medium">{model.label}</p>
                      {model.isBuiltin ? <Badge variant="signal">Included</Badge> : null}
                      {model.id === defaultModelId ? <Badge variant="warning">Default</Badge> : null}
                    </div>
                    <p className="truncate font-mono text-[10.5px] text-[hsl(var(--muted-foreground))]">
                      {model.modelName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                    <span className="truncate">{model.providerName}</span>
                  </div>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {Math.round(model.contextWindow / 1000)}k ctx
                  </span>
                  <div>
                    {model.isAvailable === true ? (
                      <Badge variant="success">Available</Badge>
                    ) : model.isAvailable === false ? (
                      <Badge variant="destructive">Missing</Badge>
                    ) : (
                      <Badge variant="outline">Unchecked</Badge>
                    )}
                    {model.lastCheckedAt ? (
                      <p className="mt-0.5 text-[9.5px] text-[hsl(var(--muted-foreground))]">
                        {timeAgo(model.lastCheckedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-end">
                    <Tooltip content="Test model">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => void testModel(model)}
                        disabled={testingModel === model.id}
                        aria-label="Test model"
                      >
                        {testingModel === model.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Gauge className="size-3.5" />
                        )}
                      </Button>
                    </Tooltip>
                    {model.isBuiltin ? (
                      <Tooltip content="Included with AstraCode">
                        <span className="flex size-7 items-center justify-center text-[hsl(var(--muted-foreground))]/50">
                          <Sparkles className="size-3.5" />
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Delete model">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                          onClick={() => setDeleteModel(model)}
                          aria-label="Delete model"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Dialog
        open={providerDialog !== null}
        onOpenChange={(open) => {
          if (!open) setProviderDialog(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{providerDialog === "edit" ? "Edit provider" : "Add provider"}</DialogTitle>
            <DialogDescription>
              AstraCode speaks the OpenAI chat-completions protocol. Any compatible gateway works.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Groq"
                  autoFocus
                />
              </Field>
              <Field label="Type">
                <Select
                  value={form.kind}
                  onChange={(event) =>
                    setForm({ ...form, kind: event.target.value as ProviderKind })
                  }
                >
                  <option value="openai">OpenAI</option>
                  <option value="custom">OpenAI-compatible</option>
                  <option value="ollama">Ollama</option>
                </Select>
              </Field>
            </div>
            <Field label="Base URL" hint="No trailing slash needed">
              <Input
                value={form.baseUrl}
                onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
                placeholder="https://api.groq.com/openai/v1"
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
                  placeholder="gsk_…"
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
                    Get your {form.name || "provider"} API key <ArrowUpRight className="size-3" />
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
                Ollama runs locally and needs no API key. Start it with <code>ollama serve</code> and
                pull a model first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setProviderDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveProvider()} disabled={providerPending}>
              {providerPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {providerDialog === "edit" ? "Save changes" : "Add provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={discoverProvider !== null}
        onOpenChange={(open) => {
          if (!open) setDiscoverProvider(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discover models</DialogTitle>
            <DialogDescription>
              Live model list reported by {discoverProvider?.name}. Select the ones you want to use.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={discoverSearch}
            onChange={(event) => setDiscoverSearch(event.target.value)}
            placeholder="Filter model ids…"
            className="h-8 text-[12px]"
          />
          <div className="max-h-[300px] space-y-1 overflow-y-auto">
            {discoverLoading ? (
              <div className="flex justify-center py-8">
                <LoaderCircle className="size-5 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : filteredRemote.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
                No models found. Check the provider URL and key.
              </p>
            ) : (
              filteredRemote.map((model) => {
                const checked = selected.has(model.id);
                return (
                  <label
                    key={model.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
                      model.added
                        ? "cursor-not-allowed border-transparent opacity-50"
                        : checked
                          ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/6"
                          : "border-transparent hover:bg-[hsl(var(--muted))]",
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={model.added}
                      checked={checked}
                      onChange={(event) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) next.add(model.id);
                          else next.delete(model.id);
                          return next;
                        })
                      }
                      className="size-3.5 accent-[hsl(var(--primary))]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11.5px]">{model.id}</span>
                      {model.label && model.label !== model.id ? (
                        <span className="block truncate text-[10.5px] text-[hsl(var(--muted-foreground))]">
                          {model.label}
                        </span>
                      ) : null}
                    </span>
                    {model.added ? <Badge variant="success">Added</Badge> : null}
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter className="items-center justify-between sm:justify-between">
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDiscoverProvider(null)}>
                Cancel
              </Button>
              <Button onClick={() => void addDiscovered()} disabled={selected.size === 0 || adding}>
                {adding ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Add selected
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modelDialog} onOpenChange={setModelDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add model</DialogTitle>
            <DialogDescription>
              Use the exact model id from the provider (for example <code>llama-3.3-70b-versatile</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Provider">
              <Select
                value={modelForm.providerId}
                onChange={(event) => setModelForm({ ...modelForm, providerId: event.target.value })}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Model id">
                <Input
                  value={modelForm.modelName}
                  onChange={(event) =>
                    setModelForm({
                      ...modelForm,
                      modelName: event.target.value,
                      label: modelForm.label || event.target.value,
                    })
                  }
                  placeholder="llama-3.3-70b-versatile"
                  className="font-mono text-[12px]"
                />
              </Field>
              <Field label="Display label">
                <Input
                  value={modelForm.label}
                  onChange={(event) => setModelForm({ ...modelForm, label: event.target.value })}
                  placeholder="Llama 3.3 70B"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Context window" hint="tokens">
                <Input
                  type="number"
                  value={modelForm.contextWindow}
                  onChange={(event) => setModelForm({ ...modelForm, contextWindow: event.target.value })}
                />
              </Field>
              <Field label="Max output" hint="tokens">
                <Input
                  type="number"
                  value={modelForm.maxOutput}
                  onChange={(event) => setModelForm({ ...modelForm, maxOutput: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Notes" hint="Optional">
              <Textarea
                value={modelForm.notes}
                onChange={(event) => setModelForm({ ...modelForm, notes: event.target.value })}
                rows={2}
                placeholder="e.g. fast coding model, 400 tok/s"
              />
            </Field>
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={modelForm.isDefault}
                onChange={(event) => setModelForm({ ...modelForm, isDefault: event.target.checked })}
                className="size-3.5 accent-[hsl(var(--primary))]"
              />
              Make this the default model
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModelDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveModel()}
              disabled={!modelForm.providerId || !modelForm.modelName.trim() || modelPending}
            >
              {modelPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              Add model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteProvider)}
        onOpenChange={(open) => {
          if (!open) setDeleteProvider(null);
        }}
        title="Remove provider?"
        description={`${deleteProvider?.name ?? ""} and its ${deleteProvider?.modelCount ?? 0} model(s) will be removed. Chats that used them keep their history.`}
        confirmLabel="Remove provider"
        destructive
        pending={providerPending}
        onConfirm={removeProvider}
      />

      <ConfirmDialog
        open={Boolean(deleteModel)}
        onOpenChange={(open) => {
          if (!open) setDeleteModel(null);
        }}
        title="Delete model?"
        description={`${deleteModel?.label ?? ""} will no longer be selectable. This cannot be undone.`}
        confirmLabel="Delete model"
        destructive
        pending={modelPending}
        onConfirm={removeModel}
      />
    </div>
  );
}
