"use client";

import * as React from "react";
import { Check, FilePlus2, FileX2, LoaderCircle, ShieldCheck } from "lucide-react";
import { Badge, Button, cn } from "@astracode/ui";
import { toast } from "sonner";
import type { AgentAction } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";

export function AgentActionCard({
  action,
  projectId,
  applied,
  onApplied,
}: {
  action: AgentAction;
  projectId: string | null;
  applied: boolean;
  onApplied: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(applied);
  const [expanded, setExpanded] = React.useState(false);

  const apply = async () => {
    if (!projectId) {
      toast.error("Select a project to apply file changes.");
      return;
    }
    setPending(true);
    try {
      if (action.op === "write") {
        await api.post(`/projects/${projectId}/files`, {
          path: action.path,
          content: action.content ?? "",
        });
      } else {
        await api.post(`/projects/${projectId}/files/delete`, { path: action.path });
      }
      setDone(true);
      onApplied();
      toast.success(`${action.op === "write" ? "Saved" : "Deleted"} ${action.path}`, {
        description: "Review it in Astra Studio.",
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            action.op === "write"
              ? "bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]"
              : "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
          )}
        >
          {action.op === "write" ? <FilePlus2 className="size-3.5" /> : <FileX2 className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11.5px] font-medium">{action.path}</p>
          <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
            {action.op === "write" ? "Write file" : "Delete file"} · requires approval
          </p>
        </div>
        {done ? (
          <Badge variant="success" className="gap-1">
            <Check className="size-3" /> Applied
          </Badge>
        ) : (
          <div className="flex shrink-0 gap-1.5">
            {action.op === "write" && action.content ? (
              <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Hide" : "Preview"}
              </Button>
            ) : null}
            <Button size="sm" onClick={apply} disabled={pending}>
              {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              Approve
            </Button>
          </div>
        )}
      </div>
      {expanded && action.content ? (
        <pre className="max-h-64 overflow-auto border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-3 font-mono text-[11px] leading-relaxed">
          {action.content.slice(0, 8000)}
          {action.content.length > 8000 ? "\n… (truncated preview)" : ""}
        </pre>
      ) : null}
      {!projectId && !done ? (
        <p className="border-t border-[hsl(var(--border))] px-3 py-1.5 text-[10.5px] text-[hsl(var(--warning))]">
          Attach a project to this chat to apply changes.
        </p>
      ) : null}
    </div>
  );
}
