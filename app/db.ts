/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-file no-use-before-define
// https://supabase.com/docs/guides/database/drizzle
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey(),
  org_id: uuid("org_id"),
  slug: text("slug"),
  name: text("name"),
  created_at: timestamp("created_at"),
});

const connectionString = process.env.DB_SESSION_URL!;

export const createDb = () => {
  const clientLocal = postgres(connectionString, { prepare: false, max: 1 });
  const dbLocal = drizzle(clientLocal);
  (dbLocal as any).hash = new Date();
  return dbLocal;
};

const clientLocal = postgres(connectionString, { prepare: false });
const db = drizzle(clientLocal);
(db as any).hash = new Date();

export const reuseDb = () => {
  return db;
};
