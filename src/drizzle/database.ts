import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { sql } from "@vercel/postgres";

import { Pool } from "pg";
import * as schema from "./schema";

export * as schema from "./schema";

export type DB =
  | ReturnType<typeof drizzleNode<typeof schema>>
  | ReturnType<typeof drizzleVercel<typeof schema>>;

const localPool =
  process.env.DATABASE_URL ?
    new Pool({ connectionString: process.env.DATABASE_URL })
    : null;

// / Use @vercel/postgres (reads POSTGRES_URL, must be pooled) when on Vercel or when only POSTGRES_URL is set.
// const vercelPool = isVercel || !hasLocalDb ? createPool() : null;
export const db =
  localPool ?
    drizzleNode(localPool, { schema })
    : drizzleVercel(sql, { schema });

export async function runQuery(callback: (db: DB) => Promise<void>) {
  try {
    await callback(db);
  } catch (error) {
    console.error(error);
  }
}