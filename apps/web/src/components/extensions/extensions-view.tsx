"use client";

import * as React from "react";
import {
  BadgeCheck,
  Blocks,
  BookOpen,
  Boxes,
  Check,
  Code2,
  Database,
  Download,
  FlaskConical,
  Layers,
  LoaderCircle,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Switch,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { ExtensionDto } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { EmptyState } from "@/components/ui-extras/empty-state";
import { PageHeader } from "@/components/ui-extras/page-header";

const CATEGORY_ICON: Record<string, typeof Code2> = {
  languages: Code2,
  frameworks: Layers,
  testing: FlaskConical,
  database: Database,
  devops: Terminal,
  docs: BookOpen,
  default: Boxes,
};

export function ExtensionsView() {
  const { data, loading, refetch, setData } = useApi<{
    extensions: ExtensionDto[];
    categories: string[];
  }>("/extensions");

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [onlyInstalled, setOnlyInstalled] = React.useState(false);
  const [details, setDetails] = React.useState<ExtensionDto | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const extensions = data?.extensions ?? [];
  const categories = data?.categories ?? [];

  const update = (id: string, patch: Partial<ExtensionDto>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            extensions: prev.extensions.map((extension) =>
              extension.id === id ? { ...extension, ...patch } : extension,
            ),
          }
        : prev,
    );
  };

  const install = async (extension: ExtensionDto) => {
    setPendingId(extension.id);
    try {
      await api.post(`/extensions/${extension.id}/install`);
      update(extension.id, { installed: true, enabled: true, installs: extension.installs + 1 });
      toast.success(`${extension.name} installed`, {
        description: "Templates and prompts are now available in Studio and Chat.",
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingId(null);
    }
  };

  const uninstall = async (extension: ExtensionDto) => {
    setPendingId(extension.id);
    try {
      await api.delete(`/extensions/${extension.id}/install`);
      update(extension.id, { installed: false, enabled: false, installs: Math.max(0, extension.installs - 1) });
      toast.success(`${extension.name} removed`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingId(null);
    }
  };

  const toggle = async (extension: ExtensionDto, enabled: boolean) => {
    update(extension.id, { enabled });
    try {
      await api.patch(`/extensions/${extension.id}/install`, { enabled });
      toast.success(enabled ? "Extension enabled" : "Extension disabled");
    } catch (error) {
      update(extension.id, { enabled: !enabled });
      toast.error(errorMessage(error));
    }
  };

  const filtered = extensions.filter((extension) => {
    if (category !== "all" && extension.category !== category) return false;
    if (onlyInstalled && !extension.installed) return false;
    const haystack = `${extension.name} ${extension.description} ${extension.author}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const installedCount = extensions.filter((extension) => extension.installed).length;
  const countLabel = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Manage / Extensions"
        title="Extensions"
        description="Add project templates and curated prompts. Extensions are declarative: they never execute code."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search extensions…"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] transition-colors",
              category === "all"
                ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/40 hover:text-[hsl(var(--foreground))]",
            )}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] transition-colors",
                category === item
                  ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/40 hover:text-[hsl(var(--foreground))]",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="ml-auto flex shrink-0 items-center gap-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
          <Switch checked={onlyInstalled} onCheckedChange={setOnlyInstalled} className="scale-75" />
          Installed only ({installedCount})
        </label>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-44 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Blocks}
            compact
            title="No extensions found"
            description="Try another search or category."
          />
        </Card>
      ) : (
        <div className="stagger-fade grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((extension) => {
            const Icon = CATEGORY_ICON[extension.category] ?? CATEGORY_ICON.default!;
            return (
              <Card key={extension.id} className="hover-lift flex flex-col">
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      <Icon className="size-4 text-[hsl(var(--primary))]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold">{extension.name}</p>
                        {extension.verified ? (
                          <BadgeCheck className="size-3.5 shrink-0 text-[hsl(var(--primary))]" aria-label="Verified" />
                        ) : null}
                      </div>
                      <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        {extension.author} · v{extension.version}
                      </p>
                    </div>
                    {extension.installed ? (
                      <Switch
                        checked={extension.enabled}
                        onCheckedChange={(checked) => void toggle(extension, checked)}
                        aria-label="Enable extension"
                        className="scale-75"
                      />
                    ) : (
                      <Badge variant="outline" className="capitalize">{extension.category}</Badge>
                    )}
                  </div>
                  <p className="mt-2.5 line-clamp-3 min-h-[48px] text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {extension.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(extension.manifest.prompts?.length ?? 0) > 0 ? (
                      <Badge variant="secondary">{countLabel(extension.manifest.prompts!.length, "prompt")}</Badge>
                    ) : null}
                    {(extension.manifest.templates?.length ?? 0) > 0 ? (
                      <Badge variant="secondary">{countLabel(extension.manifest.templates!.length, "template")}</Badge>
                    ) : null}
                    <Badge variant="outline">{countLabel(extension.installs, "install")}</Badge>
                  </div>
                  <div className="mt-3 flex gap-1.5 border-t border-[hsl(var(--border))] pt-3">
                    <Button variant="ghost" size="sm" onClick={() => setDetails(extension)}>
                      Details
                    </Button>
                    <div className="ml-auto">
                      {extension.installed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                          onClick={() => void uninstall(extension)}
                          disabled={pendingId === extension.id}
                        >
                          {pendingId === extension.id ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void install(extension)}
                          disabled={pendingId === extension.id}
                        >
                          {pendingId === extension.id ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          Install
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(details)} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {details?.name}
              {details?.verified ? <BadgeCheck className="size-4 text-[hsl(var(--primary))]" /> : null}
            </DialogTitle>
            <DialogDescription>{details?.description}</DialogDescription>
          </DialogHeader>
          {details ? (
            <div className="space-y-4 text-[12px]">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">v{details.version}</Badge>
                <Badge variant="outline">{details.author}</Badge>
                <Badge variant="secondary" className="capitalize">{details.category}</Badge>
                <Badge variant="secondary">{countLabel(details.installs, "install")}</Badge>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1">
                  {details.permissions.length === 0 ? (
                    <span className="text-[11.5px] text-[hsl(var(--muted-foreground))]">None</span>
                  ) : (
                    details.permissions.map((permission) => (
                      <Badge key={permission} variant="warning" className="font-mono text-[10px]">
                        {permission}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {details.manifest.prompts && details.manifest.prompts.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    Prompt presets
                  </p>
                  <ul className="space-y-1">
                    {details.manifest.prompts.map((prompt) => (
                      <li key={prompt.id} className="rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5">
                        <p className="font-medium">{prompt.title}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{prompt.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {details.manifest.templates && details.manifest.templates.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    Project templates
                  </p>
                  <ul className="space-y-1">
                    {details.manifest.templates.map((template) => (
                      <li key={template.id} className="rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5">
                        <p className="font-medium">
                          {template.name}{" "}
                          <span className="font-normal text-[hsl(var(--muted-foreground))]">
                            ({template.language}, {template.files.length} files)
                          </span>
                        </p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{template.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-2.5 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--success))]" />
                Declarative extension. Templates and prompts only — no scripts run on your machine.
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetails(null)}>
              Close
            </Button>
            {details && !details.installed ? (
              <Button
                onClick={() => {
                  void install(details);
                  setDetails(null);
                }}
              >
                <Check className="size-3.5" /> Install extension
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
