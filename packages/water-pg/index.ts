import { Client } from "pg";
import { setTimeout } from "timers/promises";

export const retry = async <T>(
  retryFunction: () => Promise<T>,
  max: number = 5,
  waitTime: number = 1000,
  name?: string
): Promise<T> => {
  try {
    const result = await retryFunction();

    return result;
  } catch (e) {
    if (max > 0) {
      await setTimeout(waitTime);
      if (name) {
        console.info("[water-pg.retry]", name);
      }
      return retry(retryFunction, max - 1, waitTime);
    } else {
      throw e;
    }
  }
};

export const claimClient = async <T>(
  runner: (client: Client) => Promise<T>,
  connectionString?: string
) => {
  const _connectionString =
    connectionString ?? process.env.WATER_PG_CONNECTION_STRING;

  if (
    typeof _connectionString !== "string" ||
    _connectionString.trim() === ""
  ) {
    throw new Error("None or empty connectionString available");
  }

  const client = await retry(
    async () => {
      const c = new Client(_connectionString);
      await c.connect();
      return c;
    },
    5,
    1000,
    "retry-connection"
  );

  return {
    client,
    release: async () => await client.end(),
    async runWithClientAndRelease<T, R>(
      runner: (client: Client) => Promise<T>,
      reportResult?: (result: T) => R
    ) {
      const result = await retry(() => runner(client));
      reportResult?.(result);
      await this.release();
      return result;
    },
    async runWithClientAndStayConnected<T>(
      runner: (client: Client) => Promise<T>
    ) {
      const result = await retry(() => runner(client));
      return result;
    },
  };
};
