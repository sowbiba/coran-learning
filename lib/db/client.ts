/**
 * Drizzle client over Neon HTTP.
 *
 * - Use the pooled `DATABASE_URL` for app reads/writes (Vercel Functions, Server Components).
 * - The migration tool (`drizzle-kit push`) uses `DATABASE_URL_UNPOOLED` directly via drizzle.config.ts.
 *
 * Neon HTTP driver is fine for serverless / edge — no connection pool to manage,
 * just one fetch per query. For long-running scripts (ingestion), prefer the
 * `@neondatabase/serverless` Pool over a TCP socket.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is missing. Run `vercel env pull .env.local` and ensure the dev server reads it.",
  );
}

const sql = neon(url);

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export { schema };
