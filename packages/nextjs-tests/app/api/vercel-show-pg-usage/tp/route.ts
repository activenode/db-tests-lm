import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_PGBOUNCER_URL,
});

const randomHash = Math.random().toString(36).substring(2, 15);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).hash = randomHash; // Assigning a random hash to the pool for debugging purposes

const allowed_stats_activity_column_comparison = [
  "application_name",
  "usename",
];

export async function GET(request: NextRequest) {
  const simulateLongRunningQuery =
    request.nextUrl.searchParams.get("simulate_long_running_query") === "1";
  const columnFromSearch =
    request.nextUrl.searchParams.get("stats_activity_column") ?? "-";
  const stats_activity_column =
    allowed_stats_activity_column_comparison.includes(columnFromSearch)
      ? columnFromSearch
      : "application_name";

  const runQueryOnTestTable =
    request.nextUrl.searchParams.get("run_query_on_test_table") === "1";

  const releaseAndDestroy: boolean =
    request.nextUrl.searchParams.get("release_and_destroy") === "1";

  const stats_activity_column_value =
    request.nextUrl.searchParams.get("stats_activity_column_value") ??
    "Supavisor";

  try {
    const idleConnectionsAtStart = pool.idleCount;
    const client = await pool.connect();

    const primaryQuery = await (runQueryOnTestTable
      ? client.query("SELECT * FROM teams LIMIT 10")
      : client.query(
          `SELECT * FROM pg_stat_activity WHERE ${stats_activity_column} = $1`,
          [stats_activity_column_value]
        ));

    if (simulateLongRunningQuery) {
      // Simulate a long-running query
      await client.query("SELECT pg_sleep(5)");
    }

    await client.release(releaseAndDestroy);
    const idleConnectionsAtEndAfterRelease = pool.idleCount;

    return NextResponse.json({
      rows: primaryQuery.rows,
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
