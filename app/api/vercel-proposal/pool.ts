import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DB_TRANSACTION_POOLING_URL,
});
