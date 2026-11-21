"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { cn } from "@astracode/ui";

function languageOf(children: React.ReactNode): string {
  if (React.isValidElement(children)) {
    const className = (children.props as { className?: string }).className ?? "";
    const match = /language-([\w-]+)/.exec(className);
    if (match?.[1]) return match[1];
  }
  return "text";
}

function PreBlock({ children }: { children?: React.ReactNode }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);
  const language = languageOf(children);

  const copy = async () => {
    const text = ref.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="group relative my-2.5 overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        ref={ref}
        className="overflow-x-auto p-3 text-[12.5px] leading-[1.6] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[12.5px]"
      >
        {children}
      </pre>
    </div>
  );
}

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const heading = (Tag: "h1" | "h2" | "h3" | "h4") =>
  function Heading({ children }: { children?: React.ReactNode }) {
    return <Tag id={slugify(textOf(children))}>{children}</Tag>;
  };

const components: Components = {
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  pre: ({ children }) => <PreBlock>{children}</PreBlock>,
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
    >
      {children}
    </a>
  ),
  code: ({ className, children }) =>
    className?.includes("language-") ? (
      <code className={className}>{children}</code>
    ) : (
      <code className={cn("rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1 py-0.5 text-[0.88em]")}>
        {children}
      </code>
    ),
};

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-astra">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
        className,
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}
