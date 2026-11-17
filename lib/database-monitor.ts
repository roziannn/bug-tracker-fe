import "server-only";
import { createDecipheriv, createCipheriv, randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

function encryptionKey() {
  const value = process.env.DATABASE_MONITOR_ENCRYPTION_KEY;
  if (!value) throw new Error("DATABASE_MONITOR_ENCRYPTION_KEY is not configured");
  return createHash("sha256").update(value).digest();
}

export function assertDatabaseMonitorConfigured() {
  encryptionKey();
}

export function encryptConnectionString(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptConnectionString(value: string) {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted database connection");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

export type DatabaseMetrics = {
  status: "online" | "offline";
  latencyMs: number | null;
  databaseName: string | null;
  serverVersion: string | null;
  activeConnections: number | null;
  maxConnections: number | null;
  sizeBytes: string | null;
  checkedAt: string;
};

export async function inspectDatabase(connectionString: string): Promise<DatabaseMetrics> {
  const checkedAt = new Date().toISOString();
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000 });
  const start = Date.now();
  try {
    const basic = await pool.query<{ databaseName: string; serverVersion: string }>(
      `SELECT current_database() AS "databaseName", current_setting('server_version') AS "serverVersion"`,
    );
    let activeConnections: number | null = null;
    let maxConnections: number | null = null;
    let sizeBytes: string | null = null;
    try {
      const details = await pool.query<{ activeConnections: number; maxConnections: number; sizeBytes: string }>(
        `SELECT (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS "activeConnections",
          current_setting('max_connections')::int AS "maxConnections", pg_database_size(current_database())::text AS "sizeBytes"`,
      );
      activeConnections = details.rows[0].activeConnections;
      maxConnections = details.rows[0].maxConnections;
      sizeBytes = details.rows[0].sizeBytes;
    } catch {
      // Restricted database users can still be monitored for connectivity and version.
    }
    return { status: "online", latencyMs: Date.now() - start, ...basic.rows[0], activeConnections, maxConnections, sizeBytes, checkedAt };
  } finally {
    await pool.end();
  }
}
