import postgres from "postgres";
import { setTimeout } from "timers/promises";

// export const pool = new Pool({
//   connectionString: process.env.__fPOSTGRES_URL,
//   // connectionString: process.env.SUPAVISOR_TRANSACTION_URL,
//   max: 5, // This limit is per-process, not global!
//   idleTimeoutMillis: 2000,
//   connectionTimeoutMillis: 1700,
// });

export const retry = async <T>(
  retryFunction: () => Promise<T>,
  max: number = 5,
  waitTime: number = 1000,
  name?: string,
): Promise<T> => {
  try {
    const result = await retryFunction();

    return result;
  } catch (e) {
    if (max > 0) {
      await setTimeout(waitTime);
      if (name) {
        console.info("@retry=", name);
      }
      return retry(retryFunction, max - 1, waitTime);
    } else {
      throw e;
    }
  }
};

export const runWithClient = async <T>(
  runner: (client: postgres.Sql) => Promise<T>,
) => {
  const c = postgres(process.env.SUPAVISOR_TRANSACTION_URL!, {
    max: 1,
    max_lifetime: 5,
    prepare: false,
    idle_timeout: 2,
    connect_timeout: 2,
  });

  // await retry(() => c.connect());
  const r = await retry(() => runner(c));

  await c.end();

  return r;
};
