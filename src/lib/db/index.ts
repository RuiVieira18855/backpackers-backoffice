import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Supabase Transaction pooler (port 6543) does NOT support prepared
 * statements — `prepare: false` is required.
 *
 * Single client instance is fine: postgres.js manages its own pool.
 */
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export type Db = typeof db;
