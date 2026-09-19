import dotenv from "dotenv";
import { createConsola } from "consola";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "@/drizzle/schema";
import { upsertHallOfFameFromRepo } from "@/lib/hall-of-fame/hall-of-fame-service";

// Load .env.local the same way drizzle.config.ts does (relative to app root).
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const logger = createConsola({ level: 3 });

/**
 * One-off backfill: populate hall_of_fame from the repos already in the
 * database, one representative repo (highest stars) per owner. Reuses the same
 * upsert path as the daily `process-repo-assets` task, including OSS avatar
 * upload (falls back gracefully when OSS fails).
 */
async function main() {
  const rawUrl = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!rawUrl) {
    throw new Error("Missing POSTGRES_URL / POSTGRES_URL_NON_POOLING");
  }
  const url = rawUrl.split("?")[0];

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });

  const repos = await db
    .select()
    .from(schema.repos)
    .orderBy(
      sql`"owner" ASC, "stargazers_count" DESC NULLS LAST`
    );

  const byOwner = new Map<string, (typeof schema.repos.$inferSelect)>();
  for (const repo of repos) {
    if (!byOwner.has(repo.owner)) {
      byOwner.set(repo.owner, repo);
    }
  }

  const owners = [...byOwner.values()];
  logger.info(`Backfilling hall_of_fame from ${owners.length} distinct owners (${repos.length} repos)`);

  const start = Date.now();
  for (let i = 0; i < owners.length; i++) {
    const repo = owners[i]!;
    try {
      await upsertHallOfFameFromRepo(db, repo, {
        syncAvatarToOss: true,
        logger,
      });
      logger.info(`[${i + 1}/${owners.length}] ${repo.owner} synced`);
    } catch (error) {
      logger.error(`[${i + 1}/${owners.length}] ${repo.owner} FAILED`, error);
    }
  }

  logger.success(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  await pool.end();
}

main().catch((error) => {
  logger.error("Backfill failed:", error);
  process.exit(1);
});