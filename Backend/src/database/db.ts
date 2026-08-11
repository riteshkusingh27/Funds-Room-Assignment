import { Pool } from "pg";
import { env } from "../config/env";

const cleanConnectionString = env.databaseUrl
  ? env.databaseUrl.replace(/\?sslmode=[^&]+/, "").replace(/&sslmode=[^&]+/, "")
  : env.databaseUrl;

export const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: cleanConnectionString ? { rejectUnauthorized: false } : undefined
});

export async function withTransaction<T>(work: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
