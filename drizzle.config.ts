import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

console.log("POSTGRES_URL:", process.env.POSTGRES_URL);

export default {
  schema: "./src/drizzle/schema/index.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "postgres://postgres.ltnmpqasnxssguojbsyj:0tF1RmdCFseSJJib@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  },
} satisfies Config;