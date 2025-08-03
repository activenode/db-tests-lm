import { runWithClient } from "./db";
import { performance } from "node:perf_hooks";

export async function GET() {
  // const db = createDb();

  const start = performance.now();
  const res = await runWithClient((c) => {
    return c`SELECT * FROM teams LIMIT 10`;
  });
  const end = performance.now();

  const perf = (end - start) / 1000;

  if (perf > 2) {
    console.info("@bigger-2-pgbouncer-postgres");
  }

  // await db.end();

  return Response.json({
    row: res,
    dbId: null,
    perf: (end - start) / 1000,
  });
}
