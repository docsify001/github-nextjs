import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

function supabaseUrl(): string {
  const raw =
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    "postgres://openmcp:openmcp@localhost:5432/openmcp";
  // pg 8 maps sslmode=require to verify-full, which Supabase's pooler cert chain
  // doesn't satisfy, so strip query params and enable TLS without verification.
  const url = new URL(raw);
  url.search = "";
  return url.toString();
}

export default {
  schema: "./src/drizzle/schema/index.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // The shared DB is Supabase (POSTGRES_URL); DATABASE_URL points to a local
    // dev DB. Prefer POSTGRES_URL so push/migrate target Supabase by default.
    url: supabaseUrl(),
    ssl: { rejectUnauthorized: false },
  },
} satisfies Config;