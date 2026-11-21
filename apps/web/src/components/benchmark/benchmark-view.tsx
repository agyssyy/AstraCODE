"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  FlaskConical,
  Gauge,
  LoaderCircle,
  Play,
  Square,
  Trash2,
  Trophy,
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
  Progress,
  Select,
  Tooltip,
  buttonVariants,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { BenchmarkResultDto, BenchmarkSuite, ModelDto } from "@astracode/shared";
import { api, errorMessage, streamSse } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatNumber, timeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { Markdown } from "@/components/chat/markdown";
import { EmptyState } from "@/components/ui-extras/empty-state";
import { PageHeader } from "@/components/ui-extras/page-header";

type RunSummary = {
  id: string;
  suiteId: string;
  suiteName: string;
  status: string;
  modelCount: number;
  createdAt: string;
  completedAt: string | null;
  resultCount: number;
  avgLatencyMs: number | null;
  totalTokens: number;
  errors: number;
};

type LeaderboardRow = {
  modelLabel: string;
  runs: number;
  avgLatencyMs: number;
  avgTokens: number;
  successRate: number;
  measuredResults: number;
  estimatedResults: number;
};

type RunDetail = {
  run: {
    id: string;
    suiteId: string;
    suiteName: string;
    status: string;
    createdAt: string;
  };
  results: BenchmarkResultDto[];
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  completed: "success",
  cancelled: "warning",
  running: "secondary",
  failed: "destructive",
};

export function BenchmarkView() {
  const { data: suitesData } = useApi<{ suites: BenchmarkSuite[] }>("/benchmark/suites");
  const { data: modelsData } = useApi<{ models: ModelDto[] }>("/models");
  const {
    data: runsData,
    refetch: refetchRuns,
    setData: setRunsData,
  } = useApi<{ runs: RunSummary[] }>("/benchmark/runs");
  const {
    data: leaderboardData,
    refetch: refetchLeaderboard,
  } = useApi<{ leaderboard: LeaderboardRow[] }>("/benchmark/leaderboard");

  const suites = suitesData?.suites ?? [];
  const models = modelsData?.models ?? [];
  const runs = runsData?.runs ?? [];

  const [suiteId, setSuiteId] = React.useState("");
  const [selectedModels, setSelectedModels] = React.useState<Set<string>>(new Set());
  const [running, setRunning] = React.useState(false);
  const [liveResults, setLiveResults] = React.useState<BenchmarkResultDto[]>([]);
  const [liveTotal, setLiveTotal] = React.useState(0);
  const [liveRun, setLiveRun] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<RunSummary | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!suiteId && suites[0]) setSuiteId(suites[0].id);
  }, [suites, suiteId]);

  React.useEffect(() => {
    if (selectedModels.size === 0 && models[0]) {
      setSelectedModels(new Set([models[0].id]));
    }
  }, [models, selectedModels]);

  React.useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    api
      .get<RunDetail>(`/benchmark/runs/${detailId}`)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error) => {
        if (!cancelled) toast.error(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const suite = suites.find((item) => item.id === suiteId) ?? null;

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 4) {
          toast.error("Compare up to 4 models at once.");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const start = async () => {
    if (!suiteId || selectedModels.size === 0 || running) return;
    setRunning(true);
    setLiveResults([]);
    setLiveTotal((suite?.prompts.length ?? 0) * selectedModels.size);
    setLiveRun(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let status = "cancelled";
    try {
      await streamSse("/benchmark/runs", {
        body: { suiteId, modelIds: [...selectedModels] },
        signal: controller.signal,
        onEvent: ({ event, data }) => {
          if (event === "start") {
            const payload = data as { runId: string; totalCalls: number };
            setLiveRun(payload.runId);
            setLiveTotal(payload.totalCalls);
          } else if (event === "result") {
            setLiveResults((prev) => [...prev, data as BenchmarkResultDto]);
          } else if (event === "complete") {
            status = (data as { status?: string }).status ?? "completed";
          } else if (event === "error") {
            toast.error("Benchmark failed", {
              description: (data as { message?: string }).message,
            });
          }
        },
      });
      toast.success(status === "completed" ? "Benchmark complete" : "Benchmark cancelled");
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error(errorMessage(error));
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      refetchRuns();
      refetchLeaderboard();
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const removeRun = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/benchmark/runs/${deleteTarget.id}`);
      setRunsData((prev) =>
        prev ? { runs: prev.runs.filter((run) => run.id !== deleteTarget.id) } : prev,
      );
      if (detailId === deleteTarget.id) setDetailId(null);
      toast.success("Run deleted");
      setDeleteTarget(null);
      refetchLeaderboard();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const progress = liveTotal > 0 ? Math.min(100, (liveResults.length / liveTotal) * 100) : 0;
  const hasModels = models.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Platform / Benchmark"
        title="Benchmark Lab"
        description="Run real prompts against your models and compare latency, token use and reliability."
      />

      <div className="stagger-fade grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-[hsl(var(--primary))]" /> New run
            </CardTitle>
            <CardDescription>
              Each prompt is sent to every selected model through your own provider keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasModels ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 sm:flex-row sm:items-center">
                  <span className="flex size-9 shrink-0 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <Cpu className="size-4 text-[hsl(var(--signal))]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">Connect a model to start</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      Add at least one model in Model Hub. Runs use your own provider keys.
                    </p>
                  </div>
                  <Link
                    href="/models"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "secondary" }),
                      "shrink-0 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                    )}
                  >
                    Open Model Hub <ArrowRight className="size-3.5" />
                  </Link>
                </div>

                <div>
                  <p className="mb-2 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    Included suites
                  </p>
                  {suites.length === 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[0, 1].map((key) => (
                        <div key={key} className="h-[68px] animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {suites.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="group border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:border-[hsl(var(--signal))]/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[11.5px] font-medium">{item.name}</p>
                            <span className="shrink-0 font-mono text-[9px] text-[hsl(var(--muted-foreground))]">
                              {item.prompts.length} prompts
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Suite
                    </p>
                    <Select value={suiteId} onChange={(event) => setSuiteId(event.target.value)}>
                      {suites.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.prompts.length} prompts
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Models ({selectedModels.size}/4)
                    </p>
                    <div className="max-h-[104px] space-y-0.5 overflow-y-auto rounded-lg border border-[hsl(var(--border))] p-1.5">
                      {models.map((model) => (
                        <label
                          key={model.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11.5px] transition-colors hover:bg-[hsl(var(--muted))]",
                            selectedModels.has(model.id) && "bg-[hsl(var(--primary))]/8",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedModels.has(model.id)}
                            onChange={() => toggleModel(model.id)}
                            className="size-3.5 accent-[hsl(var(--primary))]"
                          />
                          <span className="truncate">{model.label}</span>
                          <span className="ml-auto shrink-0 text-[9.5px] text-[hsl(var(--muted-foreground))]">
                            {model.providerName}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {suite ? (
                  <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3">
                    <p className="text-[11.5px] font-medium">{suite.name}</p>
                    <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {suite.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {suite.prompts.map((prompt) => (
                        <Badge key={prompt.id} variant="outline" className="text-[9.5px]">
                          {prompt.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => void start()}
                    disabled={running || !suiteId || selectedModels.size === 0}
                  >
                    {running ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                    {running ? "Running…" : "Start benchmark"}
                  </Button>
                  {running ? (
                    <Button variant="secondary" onClick={cancel}>
                      <Square className="size-3.5 fill-current" /> Cancel
                    </Button>
                  ) : null}
                  <p className="ml-auto flex items-center gap-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                    <AlertTriangle className="size-3" />
                    Uses your provider quota
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-4 text-[hsl(var(--warning))]" /> Leaderboard
              </CardTitle>
              <CardDescription>Across all your runs.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            {(leaderboardData?.leaderboard ?? []).length === 0 ? (
              <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="grid grid-cols-3 gap-px border border-[hsl(var(--border))] bg-[hsl(var(--border))] text-center">
                  {[
                    ["Latency", "ms"],
                    ["Success", "%"],
                    ["Tokens", "avg"],
                  ].map(([label, unit]) => (
                    <div key={label} className="bg-[hsl(var(--card))] px-2 py-3">
                      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                        {label}
                      </p>
                      <p className="mt-1 font-mono text-[14px] text-[hsl(var(--muted-foreground))]/50">{unit}</p>
                    </div>
                  ))}
                </div>
                <p className="pb-2 text-center text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                  No results yet. Run a benchmark to build the leaderboard.
                </p>
              </div>
            ) : (
              <ol className="space-y-1.5">
                {(leaderboardData?.leaderboard ?? []).slice(0, 8).map((row, index) => (
                  <li
                    key={row.modelLabel}
                    className="flex items-center gap-2.5 rounded-lg border border-[hsl(var(--border))] px-2.5 py-2"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        index === 0
                          ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium">{row.modelLabel}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {row.runs} calls · {row.successRate}% ok · {formatNumber(row.avgTokens)} tok
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px]">{row.avgLatencyMs} ms</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {running || liveResults.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Live results</CardTitle>
              <CardDescription>
                {liveResults.length} of {liveTotal || "?"} calls completed
              </CardDescription>
            </div>
            <Badge variant={running ? "secondary" : "success"}>{running ? "Running" : "Finished"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Progress value={progress} />
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-[hsl(var(--card))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="py-1.5 pr-2 font-medium">Model</th>
                    <th className="py-1.5 pr-2 font-medium">Prompt</th>
                    <th className="py-1.5 pr-2 font-medium">Latency</th>
                    <th className="py-1.5 font-medium">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {liveResults.map((result) => (
                    <tr key={result.id}>
                      <td className="py-1.5 pr-2">{result.modelLabel}</td>
                      <td className="py-1.5 pr-2">{result.promptTitle}</td>
                      <td className="py-1.5 pr-2 font-mono">{result.latencyMs ?? "—"} ms</td>
                      <td className="py-1.5">
                        {result.error ? (
                          <span className="text-[hsl(var(--destructive))]">{result.error}</span>
                        ) : (
                          `${result.tokensIn ?? "?"} / ${result.tokensOut ?? "?"}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Run history</CardTitle>
          <CardDescription>Every benchmark is stored with per-prompt results.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {runs.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              compact
              title="No benchmark runs yet"
              description="Completed and failed runs will appear here with per-prompt results and token usage."
              action={
                !hasModels ? (
                  <Link
                    href="/models"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "secondary" }),
                      "font-mono text-[9.5px] uppercase tracking-[0.08em]",
                    )}
                  >
                    Connect a model <ArrowRight className="size-3.5" />
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[11.5px]">
                <thead className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Suite</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Models</th>
                    <th className="py-2 pr-3 font-medium">Calls</th>
                    <th className="py-2 pr-3 font-medium">Avg latency</th>
                    <th className="py-2 pr-3 font-medium">Tokens</th>
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {runs.map((run) => (
                    <tr key={run.id} className="transition-colors hover:bg-[hsl(var(--muted))]/30">
                      <td className="py-2 pr-3 font-medium">{run.suiteName}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={STATUS_VARIANT[run.status] ?? "outline"}>{run.status}</Badge>
                      </td>
                      <td className="py-2 pr-3">{run.modelCount}</td>
                      <td className="py-2 pr-3">
                        {run.resultCount}
                        {run.errors > 0 ? (
                          <span className="text-[hsl(var(--destructive))]"> · {run.errors} err</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 font-mono">{run.avgLatencyMs ?? "—"} ms</td>
                      <td className="py-2 pr-3">{formatNumber(run.totalTokens)}</td>
                      <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))]">
                        {timeAgo(run.createdAt)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => setDetailId(run.id)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                            onClick={() => setDeleteTarget(run)}
                            aria-label="Delete run"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.run.suiteName ?? "Benchmark run"}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.results.length} calls · ${detail.run.status}` : "Loading results…"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-10">
                <LoaderCircle className="size-5 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            ) : detail?.results.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
                No results were recorded.
              </p>
            ) : (
              detail?.results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-lg border border-[hsl(var(--border))] p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-medium">{result.promptTitle}</p>
                    <Badge variant="secondary" className="text-[9.5px]">
                      {result.modelLabel}
                    </Badge>
                    {result.latencyMs !== null ? (
                      <span className="ml-auto font-mono text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        {result.latencyMs} ms · {result.tokensIn ?? "?"}/{result.tokensOut ?? "?"} tok
                      </span>
                    ) : null}
                  </div>
                  {result.error ? (
                    <p className="mt-2 rounded-md bg-[hsl(var(--destructive))]/8 px-2 py-1.5 text-[11px] text-[hsl(var(--destructive))]">
                      {result.error}
                    </p>
                  ) : (
                    <details className="mt-2">
                      <summary className="group flex w-fit cursor-pointer items-center gap-1 text-[11px] text-[hsl(var(--primary))]">
                        <Gauge className="size-3" />
                        Show output
                      </summary>
                      <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-2.5">
                        <Markdown content={result.output ?? ""} />
                      </div>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete benchmark run?"
        description="This removes the run and all of its per-prompt results from your leaderboard."
        confirmLabel="Delete run"
        destructive
        onConfirm={removeRun}
      />
    </div>
  );
}
