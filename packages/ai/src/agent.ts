import type { AgentAction } from "@astracode/shared";
import { isValidFilePath } from "@astracode/shared";

const START_RE = /```astra-action\s*\r?\n/g;
const MAX_ACTIONS = 12;

function toAction(raw: string): AgentAction | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AgentAction>;
    if (!parsed || (parsed.op !== "write" && parsed.op !== "delete")) return null;
    if (typeof parsed.path !== "string" || !isValidFilePath(parsed.path)) return null;
    if (parsed.op === "write" && typeof parsed.content !== "string") return null;
    return {
      op: parsed.op,
      path: parsed.path,
      ...(parsed.op === "write" ? { content: parsed.content } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Extracts `astra-action` blocks from a model response.
 *
 * The closing fence is discovered by trying every subsequent fence until the
 * enclosed text parses as an action. This allows file contents that themselves
 * contain markdown code fences.
 */
export function parseAgentActions(text: string): AgentAction[] {
  const actions: AgentAction[] = [];
  let match: RegExpExecArray | null;
  START_RE.lastIndex = 0;

  while (actions.length < MAX_ACTIONS && (match = START_RE.exec(text))) {
    const bodyStart = match.index + match[0].length;
    const fence = /```/g;
    fence.lastIndex = bodyStart;
    let closing = fence.exec(text);
    let action: AgentAction | null = null;

    while (closing && !action) {
      action = toAction(text.slice(bodyStart, closing.index).trim());
      if (!action) {
        fence.lastIndex = closing.index + 3;
        closing = fence.exec(text);
      }
    }

    if (action) {
      actions.push(action);
      START_RE.lastIndex = (closing?.index ?? bodyStart) + 3;
    }
  }

  return actions;
}
