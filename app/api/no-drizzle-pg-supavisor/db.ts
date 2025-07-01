import { Client } from "pg";
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
  runner: (client: Client) => Promise<T>,
) => {
  const client = await retry(
    async () => {
      const c = new Client(process.env.SUPAVISOR_TRANSACTION_URL);
      await c.connect();
      return c;
    },
    5,
    1000,
    "retry-conn-supavisor",
  );

  // await retry(() => c.connect());
  const r = await retry(() => runner(client));

  await client.end();

  return r;
};
