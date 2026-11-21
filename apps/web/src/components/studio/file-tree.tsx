"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson2,
  FileText,
  Folder,
  FolderOpen,
  Hash,
} from "lucide-react";
import { cn } from "@astracode/ui";

type FileNode = { path: string; name: string; type: "file" };
type DirNode = { path: string; name: string; type: "dir"; children: TreeNode[] };
export type TreeNode = FileNode | DirNode;

function buildTree(paths: string[]): TreeNode[] {
  const root: DirNode = { path: "", name: "", type: "dir", children: [] };
  for (const path of [...paths].sort()) {
    const parts = path.split("/").filter(Boolean);
    let current = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const childPath = parts.slice(0, index + 1).join("/");
      if (isFile) {
        current.children.push({ path: childPath, name: part, type: "file" });
      } else {
        let next = current.children.find(
          (child): child is DirNode => child.type === "dir" && child.path === childPath,
        );
        if (!next) {
          next = { path: childPath, name: part, type: "dir", children: [] };
          current.children.push(next);
        }
        current = next;
      }
    });
  }
  const sort = (nodes: TreeNode[]): TreeNode[] =>
    [...nodes]
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => (node.type === "dir" ? { ...node, children: sort(node.children) } : node));
  return sort(root.children);
}

function fileIcon(path: string) {
  if (/\.(tsx?|jsx?|mjs|cjs|py|rb|go|rs|java|c|cpp|cs|php|swift|kt)$/.test(path)) return FileCode2;
  if (/\.(json|jsonc)$/.test(path)) return FileJson2;
  if (/\.(md|mdx|txt)$/.test(path)) return FileText;
  if (/\.(css|scss|html)$/.test(path)) return Hash;
  return FileText;
}

function TreeRow({
  node,
  depth,
  activePath,
  dirty,
  expanded,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  dirty: Set<string>;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  if (node.type === "dir") {
    const open = expanded.has(node.path);
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="flex w-full items-center gap-1 rounded px-1.5 py-[3px] text-left text-[12px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          style={{ paddingLeft: 6 + depth * 12 }}
        >
          {open ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
          {open ? <FolderOpen className="size-3.5 shrink-0" /> : <Folder className="size-3.5 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open ? (
          <ul>
            {node.children.map((child) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                dirty={dirty}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const Icon = fileIcon(node.path);
  const active = node.path === activePath;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-1.5 py-[3px] text-left text-[12px] transition-colors",
          active
            ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))]"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
        )}
        style={{ paddingLeft: 6 + depth * 12 + 12 }}
      >
        <Icon className={cn("size-3.5 shrink-0", active && "text-[hsl(var(--primary))]")} />
        <span className="truncate">{node.name}</span>
        {dirty.has(node.path) ? (
          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[hsl(var(--warning))]" />
        ) : null}
      </button>
    </li>
  );
}

export function FileTree({
  paths,
  activePath,
  dirtyPaths,
  onSelect,
}: {
  paths: string[];
  activePath: string | null;
  dirtyPaths: string[];
  onSelect: (path: string) => void;
}) {
  const tree = React.useMemo(() => buildTree(paths), [paths]);
  const allDirs = React.useMemo(() => {
    const dirs: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "dir") {
          dirs.push(node.path);
          walk(node.children);
        }
      }
    };
    walk(tree);
    return dirs;
  }, [tree]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(allDirs));

  React.useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const dir of allDirs) next.add(dir);
      return next;
    });
  }, [allDirs]);

  const dirty = React.useMemo(() => new Set(dirtyPaths), [dirtyPaths]);

  return (
    <ul className="space-y-px py-1">
      {tree.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          dirty={dirty}
          expanded={expanded}
          onToggle={(path) =>
            setExpanded((prev) => {
              const next = new Set(prev);
              if (next.has(path)) next.delete(path);
              else next.add(path);
              return next;
            })
          }
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
