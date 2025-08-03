import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const connectionIdleTimeoutMillis = 10_000; // Set idle timeout
const minWaitTimeUntilRelease = connectionIdleTimeoutMillis + 100; // n + 0.1sec to ensure the connection is released after the timeout and not stuck

const pool = new Pool({
  idleTimeoutMillis: connectionIdleTimeoutMillis, // Set idle timeout to 10 seconds
  connectionString: process.env.POSTGRES_PGBOUNCER_URL,
});
const randomHash = Math.random().toString(36).substring(2, 15);

declare module "pg" {
  interface Pool {
    hash: string;
    function_usage_count: number;
  }
}

pool.hash = randomHash; // Assigning a random hash to the pool for debugging purposes
pool.function_usage_count = 0; // Initialize function usage count

function sendFunctionInfoTelemetry(
  identifier: string,
  idle_conn_at_start: number,
  idle_conn_at_end: number,
  pool_usage_count_now: number
) {
  const insertobj = {
    identifier,
    idle_conn_at_start,
    idle_conn_at_end,
    pool_usage_count_now,
    pooling_type: "function_global_scope",
  };

  const supabase = createClient(
    process.env.TELEMETRY_SUPABASE_URL || "",
    process.env.TELEMETRY_SUPABASE_SERVICE_ROLE_KEY || ""
  );

  return supabase.from("vercel_pooling_stats").insert(insertobj);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get("identifier") ?? "-";

    pool.function_usage_count += 1; // Increment function usage count
    const pool_usage_count_now = pool.function_usage_count;
    const idleConnectionsAtStart = pool.idleCount;
    const client = await pool.connect();

    const primaryQuery = await client.query("SELECT * FROM teams LIMIT 10");

    await client.release();
    const idleConnectionsAtEndAfterRelease = pool.idleCount;

    waitUntil(
      Promise.all([
        sendFunctionInfoTelemetry(
          identifier,
          idleConnectionsAtStart,
          idleConnectionsAtEndAfterRelease,
          pool_usage_count_now
        ),
        new Promise((resolve) => setTimeout(resolve, minWaitTimeUntilRelease)),
      ])
    );

    return NextResponse.json({
      rows: primaryQuery.rows,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      poolHash: (pool as any).hash, // Include the random hash for debugging
    });
  } catch (error) {
    console.error("Error fetching PostgreSQL usage:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
