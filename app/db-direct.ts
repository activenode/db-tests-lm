/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-file no-use-before-define
// https://supabase.com/docs/guides/database/drizzle
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { v4 } from "uuid";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey(),
  org_id: uuid("org_id"),
  slug: text("slug"),
  name: text("name"),
  created_at: timestamp("created_at"),
});

const connectionString = process.env.DB_DIRECT_URL!;

const clientLocal = postgres(connectionString, { prepare: false, max: 5 });
export const directDb = drizzle(clientLocal);
(directDb as any).hash = v4();

console.log("directDb.hash", (directDb as any).hash);
