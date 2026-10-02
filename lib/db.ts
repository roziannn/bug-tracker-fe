import { Pool } from "pg";

const g = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!g.__pgPool) {
    g.__pgPool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    g.__pgPool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err.message);
    });
  }
  return g.__pgPool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}