"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Code2,
  Download,
  FileCode2,
  FolderKanban,
  Layers,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
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
  Field,
  Input,
  Textarea,
  Tooltip,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { ProjectSummary } from "@astracode/shared";
import { api, apiBase, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { timeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { EmptyState } from "@/components/ui-extras/empty-state";
import { PageHeader } from "@/components/ui-extras/page-header";

type Template = {
  id: string;
  name: string;
  description: string;
  language: string;
  fileCount: number;
  source: "builtin" | "extension";
};

type ImportPayload = {
  format?: string;
  project?: { name?: string; description?: string };
  files?: { path: string; content: string }[];
};

export function ProjectsView() {
  const router = useRouter();
  const { data, loading, refetch, setData } = useApi<{ projects: ProjectSummary[] }>("/projects");
  const { data: templatesData } = useApi<{ templates: Template[] }>("/projects/templates");

  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [template, setTemplate] = React.useState("blank");
  const [pending, setPending] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectSummary | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importPayload, setImportPayload] = React.useState<ImportPayload | null>(null);
  const [importName, setImportName] = React.useState("");
  const [importFileName, setImportFileName] = React.useState("");
  const [importing, setImporting] = React.useState(false);

  const projects = data?.projects ?? [];
  const templates = templatesData?.templates ?? [];
  const filtered = projects.filter((project) =>
    `${project.name} ${project.description} ${project.language}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const openCreate = () => {
    setName("");
    setDescription("");
    setTemplate("blank");
    setCreateOpen(true);
  };

  const startFromTemplate = (item: Template) => {
    setName("");
    setDescription(item.description);
    setTemplate(item.id);
    setCreateOpen(true);
  };

  const createProject = async () => {
    if (!name.trim()) return;
    setPending(true);
    try {
      const result = await api.post<{ project: ProjectSummary }>("/projects", {
        name: name.trim(),
        description: description.trim(),
        template,
      });
      toast.success("Project created");
      setCreateOpen(false);
      setData((prev) =>
        prev ? { projects: [result.project, ...prev.projects] } : { projects: [result.project] },
      );
      router.push(`/studio?project=${result.project.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const removeProject = async () => {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      toast.success("Project deleted");
      setData((prev) =>
        prev ? { projects: prev.projects.filter((p) => p.id !== deleteTarget.id) } : prev,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const chatAbout = async (project: ProjectSummary) => {
    try {
      const result = await api.post<{ conversation: { id: string } }>("/conversations", {
        projectId: project.id,
        title: `About ${project.name}`,
      });
      router.push(`/chat?c=${result.conversation.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const exportProject = (project: ProjectSummary) => {
    window.open(`${apiBase()}/projects/${project.id}/export`, "_blank", "noopener");
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ImportPayload;
      if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
        throw new Error("This file does not contain any project files.");
      }
      setImportPayload(parsed);
      setImportName(parsed.project?.name ?? file.name.replace(/\.json$/i, ""));
      setImportFileName(file.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file.");
    }
  };

  const runImport = async () => {
    if (!importPayload?.files) return;
    setImporting(true);
    try {
      const result = await api.post<{ project: ProjectSummary }>("/projects/import", {
        name: importName.trim() || "Imported project",
        description: importPayload.project?.description ?? "",
        files: importPayload.files,
      });
      toast.success("Project imported");
      setImportOpen(false);
      setImportPayload(null);
      setImportName("");
      refetch();
      router.push(`/studio?project=${result.project.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Manage / Projects"
        title="Projects"
        description="Code, run and preview projects with Astra at your side."
        actions={
          <>
            <Button
              variant="secondary"
              className="font-mono text-[10px] uppercase tracking-[0.08em]"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" /> Import
            </Button>
            <Button className="font-mono text-[10px] uppercase tracking-[0.08em]" onClick={openCreate}>
              <Plus className="size-4" /> New project
            </Button>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects…"
          className="h-8 pl-8 text-[12px]"
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="space-y-4">
          <Card>
            <EmptyState
              icon={FolderKanban}
              compact={Boolean(search)}
              eyebrow={search ? "No results" : "Workspace / Empty"}
              title={search ? "No projects match your search" : "No projects yet"}
              description={
                search
                  ? "Try a different name, description or language."
                  : "Start from a template, import an AstraCode export, or begin with an empty workspace."
              }
              action={
                search ? (
                  <Button size="sm" variant="secondary" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="size-4" /> New blank project
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                      <Upload className="size-4" /> Import
                    </Button>
                  </>
                )
              }
            />
          </Card>

          {!search && templates.length > 0 ? (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold">
                  <Layers className="size-3.5 text-[hsl(var(--signal))]" />
                  Start from a template
                </h2>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                  {templates.length} available
                </span>
              </div>
              <div className="stagger-fade grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {templates.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => startFromTemplate(item)}
                    className="hover-lift group flex flex-col border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-9 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--muted))] transition-colors group-hover:border-[hsl(var(--signal))]/50">
                        <Code2 className="size-4 text-[hsl(var(--signal))]" />
                      </span>
                      <ArrowUpRight className="size-4 text-[hsl(var(--muted-foreground))] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[hsl(var(--foreground))]" />
                    </div>
                    <p className="mt-4 text-[13px] font-semibold">{item.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {item.description}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-[hsl(var(--border))] pt-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
                      <span>{item.language}</span>
                      <span className="size-0.5 bg-[hsl(var(--border))]" />
                      <span>{item.fileCount} files</span>
                      {item.source === "extension" ? (
                        <Badge variant="outline" className="ml-auto text-[8px]">extension</Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Card key={project.id} className="hover-lift group flex flex-col">
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                    <Code2 className="size-4 text-[hsl(var(--primary))]" />
                  </span>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                    <Tooltip content="Export project">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => exportProject(project)} aria-label="Export">
                        <Download className="size-3.5" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete project">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                        onClick={() => setDeleteTarget(project)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/studio?project=${project.id}`)}
                  className="mt-3 text-left"
                >
                  <p className="truncate text-[13.5px] font-semibold">{project.name}</p>
                  <p className="mt-0.5 line-clamp-2 min-h-[32px] text-[11.5px] text-[hsl(var(--muted-foreground))]">
                    {project.description || "No description"}
                  </p>
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{project.language}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FileCode2 className="size-2.5" /> {project.fileCount}
                  </Badge>
                  <span className="ml-auto text-[10.5px] text-[hsl(var(--muted-foreground))]">
                    {timeAgo(project.updatedAt)}
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5 border-t border-[hsl(var(--border))] pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => router.push(`/studio?project=${project.id}`)}
                  >
                    <Code2 className="size-3.5" /> Open
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void chatAbout(project)}>
                    <Sparkles className="size-3.5" /> Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Pick a template to scaffold real files, or start from a blank workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="my-project"
                autoFocus
              />
            </Field>
            <Field label="Description" hint="Optional">
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="What are you building?"
              />
            </Field>
            <Field label="Template">
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {templates.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      template === item.id
                        ? "border-[hsl(var(--primary))]/60 bg-[hsl(var(--primary))]/8"
                        : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 size-3 shrink-0 rounded-full border",
                        template === item.id
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                        {item.name}
                        <Badge variant="outline" className="text-[9.5px]">{item.language}</Badge>
                        {item.source === "extension" ? (
                          <Badge className="text-[9.5px]">extension</Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[hsl(var(--muted-foreground))]">
                        {item.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createProject()} disabled={!name.trim() || pending}>
              {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportPayload(null);
            setImportFileName("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import project</DialogTitle>
            <DialogDescription>
              Select an AstraCode project export (<code>.astracode.json</code>). Files are stored in a
              new project; nothing is overwritten.
            </DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center transition-colors hover:border-[hsl(var(--primary))]/40">
            <Upload className="size-5 text-[hsl(var(--muted-foreground))]" />
            <span className="mt-2 text-[12.5px] font-medium">
              {importFileName || "Choose a project export"}
            </span>
            <span className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
              JSON exports up to 2 MB
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImportFile(file);
              }}
            />
          </label>
          {importPayload?.files ? (
            <div className="space-y-3">
              <Field label="Project name">
                <Input value={importName} onChange={(event) => setImportName(event.target.value)} />
              </Field>
              <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                {importPayload.files.length} file{importPayload.files.length === 1 ? "" : "s"} ready to
                import.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void runImport()}
              disabled={!importPayload?.files || importing}
            >
              {importing ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              Import project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete project?"
        description={`${deleteTarget?.name ?? ""} and all of its files and activity will be permanently deleted.`}
        confirmLabel="Delete project"
        destructive
        pending={pending}
        onConfirm={removeProject}
      />
    </div>
  );
}
