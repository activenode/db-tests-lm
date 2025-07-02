import { performance } from "node:perf_hooks";
import { setTimeout } from "node:timers/promises";

import { Pool, PoolClient } from "pg";
import { v4 } from "uuid";

// const retry = async <T>(
//   retryFunction: () => Promise<T>,
//   max: number = 5,
//   waitTime: number = 1000,
//   name?: string,
// ): Promise<T> => {
//   try {
//     const result = await retryFunction();

//     return result;
//   } catch (e) {
//     console.error("@e", e);
//     if (max > 0) {
//       await setTimeout(waitTime);
//       if (name) {
//         console.info("@retry=", name);
//       }
//       return retry(retryFunction, max - 1, waitTime);
//     } else {
//       throw e;
//     }
//   }
// };

// const pool = new Pool({
//   connectionString: process.env.DB_DIRECT_URL,
// }); // TODO: try with direct connection as well
const id = v4();
// eslint-disable-next-line @typescript-eslint/no-explicit-any

const pool = new Pool({
  connectionString: process.env.DB_TRANSACTION_POOLING_URL,
  max: 1,
});

const tryQuery = async (tries: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let conn: PoolClient = null as any;
  try {
    conn = await pool.connect();
    console.log("@connected");
    const t = await conn.query("SELECT * FROM teams lIMIT 1");
    console.log("@query");
    conn.release();
    console.log("@cleanup");
    return t;
  } catch (e) {
    if (conn) {
      conn.release();
      console.log("@cleanup@error");
    }

    if (tries > 1) {
      await setTimeout(1000);
      console.log("👉 @waited 1sec and retrying now");
      return tryQuery(tries - 1);
    } else {
      throw e;
    }
  }
};

export async function GET() {
  console.log("v3");

  const start = performance.now();

  const t = await tryQuery(5);

  const res = t!.rows;

  const end = performance.now();

  const perf = (end - start) / 1000;

  if (perf > 2) {
    console.info("@perf: more than 2sec in vercel-proposal wait");
  }

  return Response.json({
    res: res,
    dbId: id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    poolId: (pool as any).id,
    perf: (end - start) / 1000,
  });
}
