import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DB_SESSION_URL,
});

const randomHash = Math.random().toString(36).substring(2, 15);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).hash = randomHash; // Assigning a random hash to the pool for debugging purposes

const allowed_stats_activity_column_comparison = [
  "application_name",
  "usename",
];

export async function GET(request: NextRequest) {
  const columnFromSearch =
    request.nextUrl.searchParams.get("stats_activity_column") ?? "-";
  const stats_activity_column =
    allowed_stats_activity_column_comparison.includes(columnFromSearch)
      ? columnFromSearch
      : "application_name";

  const releaseAndDestroy: boolean =
    request.nextUrl.searchParams.get("release_and_destroy") === "1";

  const stats_activity_column_value =
    request.nextUrl.searchParams.get("stats_activity_column_value") ??
    "Supavisor";

  try {
    const idleConnectionsAtStart = pool.idleCount;
    const client = await pool.connect();
    const totalOpenConnections = await client.query(
      `SELECT * FROM pg_stat_activity WHERE ${stats_activity_column} = $1`,
      [stats_activity_column_value]
    );
    await client.query("SELECT pg_sleep(5);"); // just simulate a longer-blocking query
    await client.release(releaseAndDestroy);
    const idleConnectionsAtEndAfterRelease = pool.idleCount;

    return NextResponse.json({
      rows: totalOpenConnections.rows,
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
