import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase, type DatabaseHandle } from "../src";
import * as schema from "../src";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "astracode-db-test-"));
let handle: DatabaseHandle;

describe("embedded database", () => {
  beforeAll(async () => {
    handle = await createDatabase({ dataDir });
  }, 60_000);

  afterAll(async () => {
    await handle?.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("uses the embedded PGlite driver and applies migrations", async () => {
    expect(handle.driver).toBe("pglite");
    const tables = await handle.db.execute<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = (Array.isArray(tables) ? tables : tables.rows).map((row) => row.table_name);
    for (const table of [
      "users",
      "sessions",
      "projects",
      "project_files",
      "conversations",
      "messages",
      "ai_providers",
      "models",
      "benchmark_runs",
      "extensions",
    ]) {
      expect(names).toContain(table);
    }
  });

  it("stores and queries a user", async () => {
    const inserted = await handle.db
      .insert(schema.users)
      .values({
        name: "Test User",
        email: "test@example.com",
        passwordHash: "scrypt$test",
      })
      .returning();
    const user = inserted[0]!;
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);

    const found = await handle.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "test@example.com"));
    expect(found).toHaveLength(1);
    expect(found[0]!.name).toBe("Test User");
  });

  it("enforces unique emails", async () => {
    await expect(
      handle.db.insert(schema.users).values({
        name: "Duplicate",
        email: "test@example.com",
        passwordHash: "x",
      }),
    ).rejects.toThrow();
  });
});
