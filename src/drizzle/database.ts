import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { createPool } from "@vercel/postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export * as schema from "./schema";

export type DB =
  | ReturnType<typeof drizzleNode<typeof schema>>
  | ReturnType<typeof drizzleVercel<typeof schema>>;

// On Vercel we must use @vercel/postgres with the *pooled* connection string.
// Set POSTGRES_URL to the pooled URL (host usually contains "-pooler.").
// Using a direct connection string causes: invalid_connection_string.
const isVercel = process.env.VERCEL === "1";
const hasLocalDb = Boolean(process.env.DATABASE_URL);

const localPool =
  !isVercel && hasLocalDb
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;

// Use @vercel/postgres (reads POSTGRES_URL, must be pooled) when on Vercel or when only POSTGRES_URL is set.
const vercelPool = isVercel || !hasLocalDb ? createPool() : null;

export const db = localPool
  ? drizzleNode(localPool, { schema })
  : drizzleVercel(vercelPool!, { schema });

export async function runQuery(callback: (db: DB) => Promise<void>) {
  try {
    await callback(db);
  } catch (error) {
    console.error(error);
  }
}