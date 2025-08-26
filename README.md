# What is this repo about?

This repo is used for testing different Postgres connections / queries front-to-back on Vercel Fluid Compute.

**Thanks to lmarena.ai for supporting this research.**

You can see some of the results and conclusions in this blog article: https://activeno.de/blog/2025-06/properly-connecting-with-a-database-on-serverless/
On serverless platforms like Vercel, the way you connect to a database can significantly impact performance and reliability.


# Best practice on pooling with Serverless (e.g. Vercel Fluid Compute)

## For most use cases:
The best you can do is a combination of small pools per warm function instance + a DB proxy like PgBouncer in transaction mode (transaction pooling).
<br /> A simplified implementation for a Next.js API route that uses `pg` + `drizzle-orm`:
of what's used within [vercel-proposed-best-practice/route.ts](./packages/nextjs-tests/app/api/vercel-proposed-best-practice/route.ts) is (for Next.js):

```ts
import { Pool } from 'pg';
import { waitUntil } from "@vercel/functions";
import { sql } from 'drizzle-orm'

const connectionIdleTimeoutMillis = 5_000; // Set idle timeout
const minWaitTimeUntilRelease = connectionIdleTimeoutMillis + 100; // n + 0.1sec to ensure the connection is released after the timeout and not stuck

const pool = new Pool({
    connectionString: process.env.DATABASE_TRANSACTION_POOLING_URL,
    max: 5, // Up to 5 connections per warm function instance
    idleTimeoutMillis: connectionIdleTimeoutMillis, // Close idle connections after 5 seconds
    connectionTimeoutMillis: 2_000, // Timeout for establishing a new connection
});

const db = drizzle({client: pool});

export async function GET() {
    const result = await db.execute(sql`SELECT NOW()`);

    // Ensure Vercels function doesn't abruptly die before release timeout
    // this is btw what's solved by `attachDatabasePool` in `@vercel/functions` - same thing
    waitUntil(new Promise((resolve) => setTimeout(resolve, minWaitTimeUntilRelease))); // -> == attachDatabasePool(pool);

    return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
```

## For super-small scale use-cases like Supabase Nano instance or when connections fail due to `connectionsPerTime > poolSize`:

If you are on an instance where pooler connections cannot serve your traffic (e.g. Supabase free tier instance) you can get away with a single connection per function instance + a retry mechanism.

```ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Single connection per function instance
  idleTimeoutMillis: 5_000, // Close idle connections after 5 seconds
  connectionTimeoutMillis: 2_000, // Timeout for establishing a new connection
});

const retry = async <T>(
  retryFunction: () => Promise<T>,
  maxTries: number = 7,
  waitTimeMs: number = 1000,
): Promise<T> => {
  try {
    const result = await retryFunction();

    return result;
  } catch (e) {
    if (max > 0) {
      await setTimeout(waitTimeMs);

      return retry(retryFunction, maxTries - 1, waitTimeMs);
    } else {
      throw e;
    }
  }
};

await retry(() => pool.query('SELECT NOW()'));
```


## How to use with direct database connections / session pooling (+ Cloudflare Hyperdrive)

tldr: Don't. Even Session Pooling on pgbouncer will block a complete database connection for the duration of how long the connection is kept alive / open.
If you REALLY need that, here are considerations:

- Don't run serverless
- Use a single connection per function instance (no pooling) and end it immediately. Delay / overhead will be high.
- Use [**Cloudflare Hyperdrive**](https://developers.cloudflare.com/hyperdrive/). The tests within [`packages/cf-hyperdrive-connection`](`./packages/cf-hyperdrive-connection`) show that Hyperdrive can handle a lot of direct connections with low overhead. 
  - Note: Hyperdrive is currently only available on Cloudflare Workers.


## What does `@vercel/functions` `attachDatabasePool` do and does it help?

`attachDatabasePool` is no magic function. It does not solve connection limits or pooling issues nor does it implement a "globally shared" pool across functions.
However, what it does is to ensure that Vercel's serverless function doesn't abruptly terminate before a connection is released back to the pool to avoid potentially leaking connections.
You can achieve the same `attachDatabasePool` feature by using `waitUntil` like shown in the example above.

### Why gracefully waiting (`attachDatabasePool`) is important (even for Transaction Pooling)

When a serverless function finishes execution, the platform may terminate the function instance immediately. 
When you build a connection to the database pooler, execute e.g. 3 queries in parallel (requiring 3 connections)
and then cut off network access (no graceful shutdown of the process) the connections might not be released back to the pool.

I tested this and `PgBouncer` kept zombie connections open _forever_ when cutting off network access abruptly - even with Transaction Pooling.

# Other best practices with regards to Database connections on Serverless

- Make sure the DB location e.g. `us-east-1` matches the Serverless region you're deploying to (e.g. in Project Settings -> Functions -> Advanced on Vercel)
- Define a smart `idle_timeout` like e.g. `5 seconds` (most definitely on `postgres.js/postgres` library as otherwise connections will be kept alive forever)
- At deployments, in theory, you need to have double amount the conns because that same amount will spike new functions -> In Vercel, to avoid killing all warm functions and having all new cold functions at deployment, use **[Rolling Releases](https://vercel.com/docs/rolling-releases)** feature (Enterprise feature)
- Use caching where you can (Redis / in-memory / Read Replicas)
- According to Malte Ubl (Vercel CTO), using a pool via an import with Fluid Compute or a global definition within a warm function results in the same behaviour within [Fluid Compute](https://vercel.com/docs/fluid-compute)


# Running the load tests

To run the automated load test scripts in `packages/load-tests`, you need to install the `k6` cli in your system like so: https://grafana.com/docs/k6/latest/set-up/install-k6/ .
They're partially generic, so you can adapt them to be ran against your own Postgres instance with the endpoints provided.
