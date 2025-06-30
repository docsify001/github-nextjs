import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

export * as schema from "./schema";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

export const db = drizzle(sql, { schema });

export async function runQuery(callback: (db: DB) => Promise<void>) {
  try {
    await callback(db);
  } catch (error) {
    console.error(error);
  }
}