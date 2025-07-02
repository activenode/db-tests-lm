import { createPool } from "@vercel/postgres";
import { addHash } from "./add-hash";

export const vercelPostgresClient = addHash(createPool({
  connectionString: process.env.NEON_EU_DB_URL,
}));

console.log("@client->", vercelPostgresClient.hash, vercelPostgresClient.sql);
