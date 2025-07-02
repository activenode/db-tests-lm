import ServerlessClient from "serverless-postgres";

const client = new ServerlessClient({
  debug: true,
  delayMs: 3000,
  connectionString: process.env.__fPOSTGRES_URL,
});

export async function GET() {
  const s = performance.now();
  await client.connect();
  const result = await client.query(`SELECT * FROM teams LIMIT 1`);
  await client.clean();
  const e = performance.now();

  return Response.json({
    body: result.rows[0],
    perf: (e - s) / 1000,
    statusCode: 200,
  });
}
