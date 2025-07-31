import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DB_SESSION_URL,
});

const randomHash = Math.random().toString(36).substring(2, 15);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).hash = randomHash; // Assigning a random hash to the pool for debugging purposes

export async function GET() {
  try {
    const idleConnectionsAtStart = pool.idleCount;
    const client = await pool.connect();
    const res = await client.query(
      "SELECT * FROM pg_stat_activity WHERE usename = $1",
      ["pgbouncer"]
    );
    await client.release();
    const idleConnectionsAtEndAfterRelease = pool.idleCount;

    return NextResponse.json({
      rows: res.rows,
      idleConnectionsAtStart,
      idleConnectionsAtEndAfterRelease,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      poolHash: (pool as any).hash, // Include the random hash for debugging
    });
  } catch (error) {
    console.error("Error fetching PostgreSQL usage:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
