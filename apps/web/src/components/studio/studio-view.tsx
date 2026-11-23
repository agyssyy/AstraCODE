"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import {
  ArrowUpRight,
  Braces,
  Check,
  ChevronRight,
  Code2,
  PenLine,
  FilePlus2,
  FolderKanban,
  LoaderCircle,
  PanelLeft,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  SquareTerminal,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Spinner,
  Textarea,
  Tooltip,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { ProjectFileDto, ProjectSummary, UserSettingsDto, ExecStreamEvent } from "@astracode/shared";
import { api, apiBase, errorMessage, streamSse } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useUiStore } from "@/store/ui";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { FileTree } from "./file-tree";

import { loader } from "@monaco-editor/react";

loader.config({ paths: { vs: "/monaco/vs" } });

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[12px] text-[hsl(var(--muted-foreground))]">
      <LoaderCircle className="mr-2 size-4 animate-spin" /> Loading editor…
    </div>
  ),
});

type Template = {
  id: string;
  name: string;
  description: string;
  language: string;
  fileCount: number;
  source: "builtin" | "extension";
};

type ProjectDetail = {
  project: ProjectSummary;
  files: ProjectFileDto[];
  activity: { id: string; type: string; message: string; createdAt: string }[];
};

type TerminalLine = { kind: "command" | "stdout" | "stderr" | "info" | "error"; text: string };

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  htm: "html",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "shell",
  bash: "shell",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  sql: "sql",
  swift: "swift",
  kt: "kotlin",
  xml: "xml",
};

function languageFor(path: string | null): string {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGES[ext] ?? "plaintext";
}

export function StudioView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const { resolved: resolvedTheme } = useTheme();
  const lastStudioProjectId = useUiStore((s) => s.lastStudioProjectId);
  const setLastStudioProjectId = useUiStore((s) => s.setLastStudioProjectId);

  const {
    data: projectsData,
    loading: projectsLoading,
    refetch: refetchProjects,
  } = useApi<{ projects: ProjectSummary[] }>("/projects");
  const { data: templatesData } = useApi<{ templates: Template[] }>("/projects/templates");
  const { data: settingsData } = useApi<{ settings: UserSettingsDto }>("/settings");
  const {
    data: projectData,
    loading: projectLoading,
    refetch: refetchProject,
    setData: setProjectData,
  } = useApi<ProjectDetail>(projectId ? `/projects/${projectId}` : null);

  const projects = projectsData?.projects ?? [];
  const files = projectData?.files ?? [];
  const settings = settingsData?.settings;

  const [activePath, setActivePath] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [terminalLines, setTerminalLines] = React.useState<TerminalLine[]>([]);
  const [command, setCommand] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [panel, setPanel] = React.useState<"preview" | "terminal">("preview");
  const [panelOpen, setPanelOpen] = React.useState(true);

  React.useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setPanelOpen(false);
  }, []);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newTemplate, setNewTemplate] = React.useState("blank");
  const [creating, setCreating] = React.useState(false);

  const [fileDialog, setFileDialog] = React.useState<"new" | "rename" | null>(null);
  const [filePathDraft, setFilePathDraft] = React.useState("");
  const [filePending, setFilePending] = React.useState(false);
  const [deleteFileOpen, setDeleteFileOpen] = React.useState(false);
  const [pendingProject, setPendingProject] = React.useState<string | null>(null);

  const terminalRef = React.useRef<HTMLDivElement>(null);
  const commandRef = React.useRef<HTMLInputElement>(null);
  const saveRef = React.useRef<() => void>(() => undefined);
  const abortRef = React.useRef<AbortController | null>(null);

  const activeFile = files.find((file) => file.path === activePath) ?? null;
  const activeContent = activePath
    ? drafts[activePath] ?? activeFile?.content ?? ""
    : "";
  const dirtyPaths = React.useMemo(
    () => Object.keys(drafts).filter((path) => files.some((file) => file.path === path && file.content !== drafts[path])),
    [drafts, files],
  );
  const dirty = activePath ? dirtyPaths.includes(activePath) : false;

  React.useEffect(() => {
    if (!projectsData) return;
    if (projectId && projects.some((project) => project.id === projectId)) {
      setLastStudioProjectId(projectId);
      return;
    }
    const preferred =
      projects.find((project) => project.id === lastStudioProjectId) ?? projects[0];
    if (preferred) router.replace(`/studio?project=${preferred.id}`);
  }, [projectsData, projects, projectId, lastStudioProjectId, router, setLastStudioProjectId]);

  React.useEffect(() => {
    if (!projectData) return;
    setActivePath((current) => {
      if (current && projectData.files.some((file) => file.path === current)) return current;
      return projectData.files[0]?.path ?? null;
    });
  }, [projectData]);

  React.useEffect(() => {
    setDrafts({});
    setTerminalLines([]);
    setPreviewUrl(null);
    setActivePath(null);
    setCommand("");
    setPanel("preview");
  }, [projectId]);

  React.useEffect(() => {
    const node = terminalRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [terminalLines]);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const setContent = (path: string, content: string) => {
    setDrafts((prev) => ({ ...prev, [path]: content }));
  };

  const save = async () => {
    if (!projectId || !activePath || !dirty || saving) return;
    setSaving(true);
    const content = drafts[activePath] ?? "";
    try {
      await api.post(`/projects/${projectId}/files`, { path: activePath, content });
      setProjectData((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.some((file) => file.path === activePath)
                ? prev.files.map((file) => (file.path === activePath ? { ...file, content } : file))
                : [...prev.files, { id: crypto.randomUUID(), projectId, path: activePath, content, updatedAt: new Date().toISOString() }],
            }
          : prev,
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[activePath];
        return next;
      });
      toast.success(`Saved ${activePath}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  saveRef.current = () => void save();

  const runCommand = async () => {
    const text = command.trim();
    if (!text || !projectId || running) return;
    setCommand("");
    setPanel("terminal");
    setPanelOpen(true);
    setRunning(true);
    setTerminalLines((prev) => [...prev, { kind: "command", text: `$ ${text}` }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamSse(`/projects/${projectId}/exec`, {
        body: { command: text },
        signal: controller.signal,
        onEvent: ({ data }) => {
          const event = data as ExecStreamEvent;
          if (event.type === "stdout" || event.type === "stderr") {
            const kind = event.type;
            setTerminalLines((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.kind === kind) {
                return [...prev.slice(0, -1), { kind, text: last.text + event.text }];
              }
              return [...prev, { kind, text: event.text }];
            });
          } else if (event.type === "started") {
            setTerminalLines((prev) => [...prev, { kind: "info", text: `Running in ${event.cwd}` }]);
          } else if (event.type === "exit") {
            setTerminalLines((prev) => [
              ...prev,
              {
                kind: event.code === 0 ? "info" : "error",
                text: event.timedOut
                  ? "Timed out after 20 seconds."
                  : `Exited with code ${event.code ?? "?"}`,
              },
            ]);
          } else if (event.type === "error") {
            setTerminalLines((prev) => [...prev, { kind: "error", text: event.message }]);
          }
        },
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setTerminalLines((prev) => [...prev, { kind: "error", text: errorMessage(error) }]);
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      commandRef.current?.focus();
    }
  };

  const loadPreview = async () => {
    if (!projectId) return;
    setPreviewLoading(true);
    setPanel("preview");
    setPanelOpen(true);
    try {
      const result = await api.post<{ token: string; projectId: string }>(
        `/projects/${projectId}/preview-token`,
      );
      setPreviewUrl(`${apiBase()}/preview/${result.projectId}/${result.token}/`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const commitProject = (id: string) => {
    setDrafts({});
    setPreviewUrl(null);
    setTerminalLines([]);
    setActivePath(null);
    router.push(`/studio?project=${id}`);
    setSidebarOpen(false);
  };

  const changeProject = (id: string) => {
    if (!id || id === projectId) return;
    if (dirtyPaths.length > 0) {
      setPendingProject(id);
      return;
    }
    commitProject(id);
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await api.post<{ project: ProjectSummary }>("/projects", {
        name: newName.trim(),
        description: newDescription.trim(),
        template: newTemplate,
      });
      toast.success("Project created");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewTemplate("blank");
      refetchProjects();
      commitProject(result.project.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const submitFileDialog = async () => {
    if (!projectId || !filePathDraft.trim()) return;
    const path = filePathDraft.trim().replace(/^\/+/, "");
    setFilePending(true);
    try {
      if (fileDialog === "new") {
        await api.post(`/projects/${projectId}/files`, { path, content: "" });
        toast.success(`Created ${path}`);
        setFileDialog(null);
        refetchProject();
        setActivePath(path);
        setDrafts((prev) => ({ ...prev, [path]: "" }));
      } else if (fileDialog === "rename" && activePath) {
        await api.post(`/projects/${projectId}/files/rename`, { from: activePath, to: path });
        toast.success("File renamed");
        setDrafts((prev) => {
          if (!(activePath in prev)) return prev;
          const { [activePath]: content, ...rest } = prev;
          return { ...rest, [path]: content ?? "" };
        });
        setFileDialog(null);
        setActivePath(path);
        refetchProject();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setFilePending(false);
    }
  };

  const deleteFile = async () => {
    if (!projectId || !activePath) return;
    setFilePending(true);
    try {
      await api.post(`/projects/${projectId}/files/delete`, { path: activePath });
      toast.success("File deleted");
      setDeleteFileOpen(false);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[activePath];
        return next;
      });
      setActivePath(null);
      refetchProject();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setFilePending(false);
    }
  };

  const askAstra = async () => {
    if (!projectId) return;
    try {
      const result = await api.post<{ conversation: { id: string } }>("/conversations", {
        projectId,
        title: `Studio · ${projectData?.project.name ?? "project"}`,
      });
      router.push(`/chat?c=${result.conversation.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openFileDialog = (mode: "new" | "rename") => {
    setFilePathDraft(
      mode === "rename" && activePath
        ? activePath
        : projectData?.project.language === "python"
          ? "main.py"
          : projectData?.project.language === "node"
            ? "index.mjs"
            : "index.ts",
    );
    setFileDialog(mode);
  };

  if (!projectsLoading && projects.length === 0) {
    const starters = (templatesData?.templates ?? [])
      .filter((template) => template.id !== "blank" && template.name.toLowerCase() !== "blank project")
      .slice(0, 3);
    return (
      <div className="relative flex h-full items-start justify-center overflow-y-auto sm:items-center">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <div className="animate-fade-up">
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              <span className="size-1.5 bg-[hsl(var(--signal))]" />
              Workspace / Studio
            </p>
            <h1 className="mt-4 text-balance text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[38px]">
              Build something real.
            </h1>
            <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
              Edit files, run commands in a sandboxed workspace and preview your work. Start blank or scaffold from a template.
            </p>
          </div>

          <div className="stagger-fade mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setNewTemplate("blank");
                setCreateOpen(true);
              }}
              className="group flex flex-col items-start rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_20px_40px_-34px_rgb(0_0_0/0.25)] transition-all duration-200 hover:-translate-y-1 hover:border-[hsl(var(--signal))]/60 hover:shadow-[0_24px_50px_-28px_hsl(var(--signal)/0.3)]"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] transition-colors group-hover:border-[hsl(var(--signal))]/50 group-hover:text-[hsl(var(--signal))]">
                <Plus className="size-4" />
              </span>
              <span className="mt-3 flex w-full items-center justify-between text-[13px] font-semibold">
                Blank project
                <ArrowUpRight className="size-3.5 text-[hsl(var(--muted-foreground))] transition-all group-hover:-translate-y-0.5 group-hover:text-[hsl(var(--signal))]" />
              </span>
              <span className="mt-0.5 text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                TypeScript, JavaScript or Python with one starter file.
              </span>
            </button>

            {starters.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setNewTemplate(template.id);
                  setCreateOpen(true);
                }}
                className="group flex flex-col items-start rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_20px_40px_-34px_rgb(0_0_0/0.25)] transition-all duration-200 hover:-translate-y-1 hover:border-[hsl(var(--signal))]/60 hover:shadow-[0_24px_50px_-28px_hsl(var(--signal)/0.3)]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] transition-colors group-hover:border-[hsl(var(--signal))]/50 group-hover:text-[hsl(var(--signal))]">
                  <Braces className="size-4" />
                </span>
                <span className="mt-3 flex w-full items-center justify-between text-[13px] font-semibold">
                  {template.name}
                  <ArrowUpRight className="size-3.5 text-[hsl(var(--muted-foreground))] transition-all group-hover:-translate-y-0.5 group-hover:text-[hsl(var(--signal))]" />
                </span>
                <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {template.description}
                </span>
                <span className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                  {template.language} · {template.fileCount} files
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[hsl(var(--border))] pt-4 font-mono text-[9px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1.5"><SquareTerminal className="size-3" /> Sandboxed commands</span>
            <span className="flex items-center gap-1.5"><Sparkles className="size-3" /> Ask Astra in context</span>
            <span className="flex items-center gap-1.5"><Play className="size-3" /> Live preview</span>
          </div>

          <CreateProjectDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            templates={templatesData?.templates ?? []}
            name={newName}
            setName={setNewName}
            description={newDescription}
            setDescription={setNewDescription}
            template={newTemplate}
            setTemplate={setNewTemplate}
            pending={creating}
            onSubmit={createProject}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[hsl(var(--border))] px-2 sm:gap-2 sm:px-3 md:h-11">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 md:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open files"
        >
          <PanelLeft className="size-4" />
        </Button>
        <select
          value={projectId ?? ""}
          onChange={(event) => changeProject(event.target.value)}
          aria-label="Project"
          className="h-8 w-[120px] shrink-0 truncate rounded-md border border-[hsl(var(--border))] bg-transparent px-2 text-[11.5px] font-medium outline-none focus:border-[hsl(var(--signal))]/50 sm:w-auto sm:max-w-[220px] sm:text-[12.5px]"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {projectData ? (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {projectData.files.length} files
          </Badge>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Tooltip content="Create project">
            <Button variant="ghost" size="icon" className="size-9 md:size-8" onClick={() => setCreateOpen(true)} aria-label="New project">
              <Plus className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Ask Astra about this project">
            <Button variant="secondary" className="h-9 w-9 px-0 md:h-8 md:w-auto md:px-3" onClick={() => void askAstra()} aria-label="Ask Astra about this project">
              <Sparkles className="size-3.5" />
              <span className="hidden md:inline">Ask Astra</span>
            </Button>
          </Tooltip>
          <Button
            variant={dirty ? "default" : "secondary"}
            className="h-9 px-2.5 md:h-8 md:px-3"
            onClick={() => void save()}
            disabled={!dirty || saving}
            aria-label="Save project"
          >
            {saving ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : dirty ? (
              <Save className="size-3.5" />
            ) : (
              <Check className="size-3.5" />
            )}
            <span className="hidden sm:inline">{dirty ? "Save" : "Saved"}</span>
          </Button>
        </div>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close files"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] transition-transform md:static md:z-0 md:w-56 md:translate-x-0 md:bg-transparent",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-9 items-center justify-between border-b border-[hsl(var(--border))] px-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <FolderKanban className="size-3" /> Files
            </span>
            <div className="flex items-center">
              <Tooltip content="New file">
                <Button variant="ghost" size="icon" className="size-6" onClick={() => openFileDialog("new")} aria-label="New file">
                  <FilePlus2 className="size-3.5" />
                </Button>
              </Tooltip>
              <Button variant="ghost" size="icon" className="size-6 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close">
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-1">
            {projectLoading && files.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : files.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11.5px] text-[hsl(var(--muted-foreground))]">
                No files. Create one to get started.
              </p>
            ) : (
              <FileTree
                paths={files.map((file) => file.path)}
                activePath={activePath}
                dirtyPaths={dirtyPaths}
                onSelect={(path) => {
                  setActivePath(path);
                  setSidebarOpen(false);
                }}
              />
            )}
          </div>
          <div className="border-t border-[hsl(var(--border))] p-2">
            <button
              type="button"
              onClick={() => {
                setPanel("terminal");
                setPanelOpen(true);
                commandRef.current?.focus();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11.5px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            >
              <SquareTerminal className="size-3.5" /> Terminal
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] px-3">
            <div className="flex min-w-0 items-center gap-1 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              <Braces className="size-3.5 shrink-0" />
              <span className="truncate font-mono">{activePath ?? "No file selected"}</span>
            </div>
            {dirty ? <span className="size-1.5 rounded-full bg-[hsl(var(--warning))]" /> : null}
            <div className="ml-auto flex items-center">
              {activePath ? (
                <>
                  <Tooltip content="Rename file">
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => openFileDialog("rename")} aria-label="Rename">
                      <PenLine className="size-3" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete file">
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => setDeleteFileOpen(true)} aria-label="Delete">
                      <Trash2 className="size-3" />
                    </Button>
                  </Tooltip>
                </>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-[hsl(var(--card))]">
            {activePath ? (
              <Editor
                height="100%"
                path={activePath}
                language={languageFor(activePath)}
                value={activeContent}
                onChange={(value) => setContent(activePath, value ?? "")}
                theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                onMount={(editor, monaco) => {
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
                    saveRef.current(),
                  );
                }}
                loading={
                  <div className="flex h-full items-center justify-center text-[12px] text-[hsl(var(--muted-foreground))]">
                    <LoaderCircle className="mr-2 size-4 animate-spin" /> Loading editor…
                  </div>
                }
                options={{
                  fontSize: settings?.editorFontSize ?? 13,
                  tabSize: settings?.editorTabSize ?? 2,
                  wordWrap: settings?.editorWordWrap === false ? "off" : "on",
                  minimap: { enabled: false },
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontLigatures: true,
                  padding: { top: 12, bottom: 12 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderLineHighlight: "gutter",
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Code2 className="size-8 text-[hsl(var(--muted-foreground))]/40" />
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                  {files.length > 0 ? "Select a file to start editing." : "Create a file to start coding."}
                </p>
                <Button variant="secondary" size="sm" onClick={() => openFileDialog("new")}>
                  <FilePlus2 className="size-3.5" /> New file
                </Button>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[hsl(var(--border))]">
            <div className="flex h-8 items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => {
                  setPanel("preview");
                  setPanelOpen(true);
                  if (!previewUrl) void loadPreview();
                }}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  panel === "preview" && panelOpen
                    ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanel("terminal");
                  setPanelOpen(true);
                }}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  panel === "terminal" && panelOpen
                    ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                Terminal
              </button>
              <div className="ml-auto flex items-center gap-1">
                {panel === "preview" ? (
                  <>
                    <Tooltip content="Refresh preview token">
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => void loadPreview()} disabled={previewLoading} aria-label="Refresh preview">
                        <RefreshCw className={cn("size-3", previewLoading && "animate-spin")} />
                      </Button>
                    </Tooltip>
                    {previewUrl ? (
                      <Tooltip content="Open in new tab">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => window.open(previewUrl, "_blank", "noopener")} aria-label="Open preview">
                          <ArrowUpRight className="size-3" />
                        </Button>
                      </Tooltip>
                    ) : null}
                  </>
                ) : (
                  <Tooltip content="Run command (Ctrl+Enter)">
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => void runCommand()} disabled={running || !command.trim()} aria-label="Run command">
                      <Play className="size-3" />
                    </Button>
                  </Tooltip>
                )}
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setPanelOpen((value) => !value)} aria-label="Toggle panel">
                  <ChevronRight className={cn("size-3 transition-transform", panelOpen && "rotate-90")} />
                </Button>
              </div>
            </div>

            {panelOpen ? (
              <div className="h-[230px] border-t border-[hsl(var(--border))]">
                {panel === "preview" ? (
                  previewUrl ? (
                    <iframe
                      key={previewUrl}
                      src={previewUrl}
                      title="Project preview"
                      className="h-full w-full bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Play className="size-5 text-[hsl(var(--muted-foreground))]/50" />
                      <p className="mt-2 text-[12px] text-[hsl(var(--muted-foreground))]">
                        {previewLoading ? "Preparing preview…" : "Preview static HTML, CSS and JS from this project."}
                      </p>
                      <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadPreview()} disabled={previewLoading}>
                        {previewLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                        Start preview
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex h-full flex-col bg-[hsl(var(--muted))]/25">
                    <div ref={terminalRef} className="flex-1 overflow-y-auto p-2.5 font-mono text-[11px] leading-[1.55]">
                      {terminalLines.length === 0 ? (
                        <p className="text-[hsl(var(--muted-foreground))]">
                          Run a command in this project workspace. Shell access is limited to the project
                          directory with a 20 second timeout.
                        </p>
                      ) : (
                        terminalLines.map((line, index) => (
                          <pre
                            key={index}
                            className={cn(
                              "whitespace-pre-wrap break-words",
                              line.kind === "command" && "text-[hsl(var(--primary))]",
                              line.kind === "stderr" && "text-[hsl(var(--destructive))]",
                              line.kind === "error" && "text-[hsl(var(--destructive))]",
                              line.kind === "info" && "text-[hsl(var(--muted-foreground))]",
                            )}
                          >
                            {line.text}
                          </pre>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-[hsl(var(--border))] px-2 py-1.5">
                      <span className="font-mono text-[11px] text-[hsl(var(--success))]">$</span>
                      <input
                        ref={commandRef}
                        value={command}
                        onChange={(event) => setCommand(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            void runCommand();
                          } else if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void runCommand();
                          }
                        }}
                        placeholder="npm test, ls -la, python main.py…"
                        className="h-6 flex-1 bg-transparent font-mono text-[11.5px] outline-none placeholder:text-[hsl(var(--muted-foreground))]/60"
                        spellCheck={false}
                      />
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => void runCommand()} disabled={running || !command.trim()} aria-label="Run">
                        {running ? <LoaderCircle className="size-3 animate-spin" /> : <Play className="size-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => setTerminalLines([])} aria-label="Clear terminal">
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        templates={templatesData?.templates ?? []}
        name={newName}
        setName={setNewName}
        description={newDescription}
        setDescription={setNewDescription}
        template={newTemplate}
        setTemplate={setNewTemplate}
        pending={creating}
        onSubmit={createProject}
      />

      <Dialog
        open={fileDialog !== null}
        onOpenChange={(open) => {
          if (!open) setFileDialog(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fileDialog === "rename" ? "Rename file" : "New file"}</DialogTitle>
            <DialogDescription>
              Use a relative path such as <code>src/app.ts</code>. Parent folders are created automatically.
            </DialogDescription>
          </DialogHeader>
          <Field label="File path">
            <Input
              value={filePathDraft}
              onChange={(event) => setFilePathDraft(event.target.value)}
              placeholder="src/index.ts"
              className="font-mono text-[12.5px]"
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitFileDialog();
              }}
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFileDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submitFileDialog()} disabled={!filePathDraft.trim() || filePending}>
              {filePending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {fileDialog === "rename" ? "Rename" : "Create file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteFileOpen}
        onOpenChange={setDeleteFileOpen}
        title="Delete file?"
        description={`${activePath ?? ""} will be removed from the project and its workspace.`}
        confirmLabel="Delete"
        destructive
        pending={filePending}
        onConfirm={deleteFile}
      />

      <ConfirmDialog
        open={pendingProject !== null}
        onOpenChange={(open) => {
          if (!open) setPendingProject(null);
        }}
        title="Discard unsaved changes?"
        description="You have edits that have not been saved. Switching projects will discard them."
        confirmLabel="Discard and switch"
        destructive
        onConfirm={() => {
          if (pendingProject) commitProject(pendingProject);
          setPendingProject(null);
        }}
      />
    </div>
  );
}

function CreateProjectDialog({
  open,
  onOpenChange,
  templates,
  name,
  setName,
  description,
  setDescription,
  template,
  setTemplate,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  template: string;
  setTemplate: (value: string) => void;
  pending: boolean;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Start blank or scaffold from a real template. Extension templates appear after install.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="my-awesome-app"
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
              {templates.length === 0 ? (
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Loading templates…</p>
              ) : (
                templates.map((item) => (
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
                        "mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                        template === item.id
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                        {item.name}
                        <Badge variant="outline" className="text-[9.5px]">
                          {item.language}
                        </Badge>
                        {item.source === "extension" ? (
                          <Badge className="text-[9.5px]">
                            extension
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[hsl(var(--muted-foreground))]">
                        {item.description}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit()} disabled={!name.trim() || pending}>
            {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
