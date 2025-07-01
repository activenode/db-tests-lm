import ServerlessClient from "serverless-postgres";

const client = new ServerlessClient({
  debug: true,
  delayMs: 3000,
  connectionString: process.env.__fPOSTGRES_URL,
});

export async function GET() {
  await client.connect();
  const result = await client.query(`SELECT * FROM teams LIMIT 1`);
  await client.clean();

  return Response.json({
    body: JSON.stringify({ message: result.rows[0] }),
    statusCode: 200,
  });
}
