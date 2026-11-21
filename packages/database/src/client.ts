import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import type { PgDatabase } from "drizzle-orm/pg-core";
import postgres from "postgres";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = PgDatabase<any, typeof schema>;

export type DatabaseHandle = {
  db: Database;
  driver: "pglite" | "postgres";
  close: () => Promise<void>;
};

const migrationsFolder = path.resolve(import.meta.dirname, "../migrations");

export async function createDatabase(options?: {
  databaseUrl?: string;
  dataDir?: string;
}): Promise<DatabaseHandle> {
  const databaseUrl = options?.databaseUrl ?? process.env.DATABASE_URL;
  if (databaseUrl) {
    const client = postgres(databaseUrl, { max: 10 });
    const db = drizzlePg(client, { schema });
    await migratePg(db, { migrationsFolder });
    return {
      db: db as unknown as Database,
      driver: "postgres",
      close: async () => {
        await client.end({ timeout: 5 });
      },
    };
  }

  const dataDir = options?.dataDir ?? process.env.ASTRACODE_DATA_DIR ?? "./data";
  const pgDir = path.resolve(dataDir, "pg");
  fs.mkdirSync(pgDir, { recursive: true });
  const client = new PGlite(pgDir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return {
    db: db as unknown as Database,
    driver: "pglite",
    close: async () => {
      await client.close();
    },
  };
}

export { schema };
