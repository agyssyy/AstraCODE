import type { FastifyInstance } from "fastify";
import { spawn } from "node:child_process";
import { execSchema, type ExecStreamEvent } from "@astracode/shared";
import { parseWith } from "../lib/errors.js";
import { ensureWorkspace } from "../lib/workspace.js";
import { openSse } from "../lib/sse.js";
import { getProject } from "./projects.js";

const TIMEOUT_MS = 20_000;
const MAX_OUTPUT_BYTES = 200_000;

export async function execRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>(
    "/projects/:id/exec",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const body = parseWith(execSchema, request.body);
      const project = await getProject(app.db, request.user.id, request.params.id);
      const cwd = await ensureWorkspace(project.id, app.db);

      const sse = openSse(request, reply);
      const send = (event: ExecStreamEvent) => sse.send(event.type, event);

      send({ type: "started", cwd: `workspaces/${project.id}` });

      let child;
      try {
        child = spawn("bash", ["-lc", body.command], {
          cwd,
          env: {
            PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
            HOME: cwd,
            TMPDIR: cwd,
            LANG: "C.UTF-8",
            TERM: "dumb",
          },
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Could not start the command.",
        });
        sse.end();
        return reply;
      }

      let outputBytes = 0;
      let timedOut = false;
      let finished = false;
      let killedForOutput = false;

      const killTree = () => {
        if (child.pid) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            try {
              child.kill("SIGKILL");
            } catch {
              /* already exited */
            }
          }
        }
      };

      const timer = setTimeout(() => {
        timedOut = true;
        killTree();
      }, TIMEOUT_MS);

      const onData = (stream: "stdout" | "stderr") => (chunk: Buffer) => {
        if (finished) return;
        outputBytes += chunk.length;
        if (outputBytes > MAX_OUTPUT_BYTES) {
          killedForOutput = true;
          killTree();
          return;
        }
        const text = chunk.toString("utf8");
        if (text) send({ type: stream, text });
      };

      child.stdout?.on("data", onData("stdout"));
      child.stderr?.on("data", onData("stderr"));

      child.on("error", (error) => {
        if (finished) return;
        send({ type: "error", message: error.message });
      });

      child.on("close", (code) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (killedForOutput) {
          send({
            type: "error",
            message: `Output exceeded ${Math.round(MAX_OUTPUT_BYTES / 1000)} KB and the command was stopped.`,
          });
        }
        send({ type: "exit", code, timedOut: timedOut || killedForOutput });
        sse.end();
      });

      reply.raw.on("close", () => {
        if (!finished) {
          killTree();
          clearTimeout(timer);
          finished = true;
        }
      });

      return reply;
    },
  );
}
