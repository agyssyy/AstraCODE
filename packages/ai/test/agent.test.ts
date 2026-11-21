import { describe, expect, it } from "vitest";
import { parseAgentActions } from "../src/agent";
import { readSseEvents } from "../src/openai";

const fenced = (body: string) => "```astra-action\n" + body + "\n```";

describe("parseAgentActions", () => {
  it("parses write and delete actions", () => {
    const text = [
      "Here is the change.",
      fenced('{"op":"write","path":"src/app.ts","content":"export const x = 1;"}'),
      fenced('{"op":"delete","path":"src/old.ts"}'),
    ].join("\n\n");
    const actions = parseAgentActions(text);
    expect(actions).toEqual([
      { op: "write", path: "src/app.ts", content: "export const x = 1;" },
      { op: "delete", path: "src/old.ts" },
    ]);
  });

  it("ignores malformed or unsafe actions", () => {
    const text = [
      fenced("not json"),
      fenced('{"op":"write","path":"../escape.ts","content":"x"}'),
      fenced('{"op":"write","path":"src/x.ts"}'),
      fenced('{"op":"chmod","path":"src/x.ts"}'),
      fenced('{"op":"delete","path":"/etc/passwd"}'),
    ].join("\n");
    expect(parseAgentActions(text)).toEqual([]);
  });

  it("caps the number of actions", () => {
    const text = Array.from({ length: 20 }, (_, index) =>
      fenced(JSON.stringify({ op: "write", path: `src/f${index}.ts`, content: "x" })),
    ).join("\n");
    expect(parseAgentActions(text)).toHaveLength(12);
  });

  it("handles content with code fences inside JSON", () => {
    const action = { op: "write", path: "README.md", content: "```ts\nconst a = 1;\n```" };
    const [parsed] = parseAgentActions(fenced(JSON.stringify(action)));
    expect(parsed?.content).toBe(action.content);
  });
});

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("readSseEvents", () => {
  it("yields events split across chunks", async () => {
    const body = streamOf(['data: {"a":', '1}\n\n', "data: hello\n", "data: world\n\n"]);
    const events: string[] = [];
    for await (const event of readSseEvents(body)) events.push(event.data);
    expect(events).toEqual(['{"a":1}', "hello\nworld"]);
  });

  it("supports CRLF frames and a trailing event", async () => {
    const body = streamOf(["data: one\r\n\r\n", "data: two"]);
    const events: string[] = [];
    for await (const event of readSseEvents(body)) events.push(event.data);
    expect(events).toEqual(["one", "two"]);
  });

  it("ignores empty and non-data frames", async () => {
    const body = streamOf([": comment\n\n", "data: ok\n\n"]);
    const events: string[] = [];
    for await (const event of readSseEvents(body)) events.push(event.data);
    expect(events).toEqual(["ok"]);
  });
});
