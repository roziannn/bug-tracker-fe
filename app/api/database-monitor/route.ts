import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { assertDatabaseMonitorConfigured, decryptConnectionString, encryptConnectionString, inspectDatabase } from "@/lib/database-monitor";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function authorizedRoleId() {
  const session = await getSession();
  if (!session) return null;
  const access = await query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM "CORE_RoleMenu" rm JOIN "CORE_Menu" m ON m."Id" = rm."MenuId"
       WHERE rm."RoleId" = $1 AND m."Code" = 'settings-database-monitor' AND m."IsVisible" = true
     ) AS allowed`,
    [session.roleId],
  );
  return access[0]?.allowed ? session : null;
}

export async function GET() {
  try {
    const session = await authorizedRoleId();
    if (!session) return fail("Unauthorized", 401);
    assertDatabaseMonitorConfigured();
    const servers = await query<{ Id: number; NewId: string; Name: string; Provider: string; LoginMethod: string; LoginAccount: string; ConnectionSecret: string }>(
      `SELECT "Id", "NewId", "Name", "Provider", "LoginMethod", "LoginAccount", "ConnectionSecret" FROM "CORE_DatabaseServer" WHERE "IsActive" = true ORDER BY "Name"`,
    );
    const results = await Promise.all(servers.map(async (server) => {
      try {
        const metrics = await inspectDatabase(decryptConnectionString(server.ConnectionSecret));
        return { id: server.NewId, name: server.Name, provider: server.Provider, loginMethod: server.LoginMethod, loginAccount: server.LoginAccount, ...metrics };
      } catch (error) {
        console.error(`Database monitor failed for ${server.Name}`, error);
        return {
          id: server.NewId, name: server.Name, provider: server.Provider, loginMethod: server.LoginMethod, loginAccount: server.LoginAccount, status: "offline" as const,
          latencyMs: null, databaseName: null, serverVersion: null, activeConnections: null,
          maxConnections: null, sizeBytes: null, checkedAt: new Date().toISOString(),
        };
      }
    }));
    await query(`DELETE FROM "DATA_DatabaseMonitorSamples" WHERE "CheckedDate" < now() - interval '24 hours'`);
    await Promise.all(results.map((server) => query(
      `INSERT INTO "DATA_DatabaseMonitorSamples" ("ServerKey", "Status", "LatencyMs", "CheckedDate")
       SELECT $1::varchar, $2::varchar, $3::integer, $4::timestamp
       WHERE NOT EXISTS (
         SELECT 1 FROM "DATA_DatabaseMonitorSamples" WHERE "ServerKey" = $1::varchar AND "CheckedDate" > $4::timestamp - interval '110 seconds'
       )`,
      [server.id, server.status, server.latencyMs, server.checkedAt],
    )));
    const samples = await query<{ ServerKey: string; latencyMs: number | null; checkedAt: string }>(
      `SELECT "ServerKey", "LatencyMs" AS "latencyMs", "CheckedDate" AS "checkedAt"
       FROM "DATA_DatabaseMonitorSamples" WHERE "CheckedDate" >= now() - interval '24 hours'
       ORDER BY "CheckedDate" ASC`,
    );
    const histories = new Map<string, { checkedAt: string; latencyMs: number | null }[]>();
    for (const sample of samples) {
      const history = histories.get(sample.ServerKey) ?? [];
      history.push({ checkedAt: sample.checkedAt, latencyMs: sample.latencyMs });
      histories.set(sample.ServerKey, history);
    }
    for (const server of results) Object.assign(server, { history: histories.get(server.id) ?? [] });
    return ok(results);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authorizedRoleId();
    if (!session) return fail("Unauthorized", 401);
    assertDatabaseMonitorConfigured();
    const body = await req.json().catch(() => null) as { name?: unknown; provider?: unknown; loginMethod?: unknown; loginAccount?: unknown; connectionString?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const provider = typeof body?.provider === "string" ? body.provider : "";
    const loginMethod = typeof body?.loginMethod === "string" ? body.loginMethod : "";
    const loginAccount = typeof body?.loginAccount === "string" ? body.loginAccount.trim() : "";
    const connectionString = typeof body?.connectionString === "string" ? body.connectionString.trim() : "";
    if (!name || name.length > 100) return fail("Name is required and must be 100 characters or fewer", 400);
    if (!["email", "github", "gitlab", "google", "other"].includes(loginMethod)) return fail("Select a login method", 400);
    if (loginMethod === "email" && (!loginAccount || loginAccount.length > 255 || !/^\S+@\S+\.\S+$/.test(loginAccount))) return fail("Enter a valid account email", 400);
    if (loginMethod !== "email" && loginAccount.length > 255) return fail("Connected account must be 255 characters or fewer", 400);
    if (!["neon", "supabase", "postgresql"].includes(provider)) return fail("Select a supported PostgreSQL provider", 400);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(connectionString);
    } catch {
      return fail("Enter a valid PostgreSQL connection URL", 400);
    }
    if (!(["postgres:", "postgresql:"].includes(parsedUrl.protocol)) || !parsedUrl.hostname) {
      return fail("Connection URL must use the postgres:// or postgresql:// protocol", 400);
    }

    const duplicate = await query(`SELECT 1 FROM "CORE_DatabaseServer" WHERE lower("Name") = lower($1) AND "IsActive" = true`, [name]);
    if (duplicate[0]) return fail("A monitored server with this name already exists", 409);

    const metrics = await inspectDatabase(connectionString).catch((error) => {
      console.error("Database connection test failed", error);
      return null;
    });
    if (!metrics) return fail("Unable to connect. Check the URL, credentials, network access, and database permissions.", 400);

    const saved = await query<{ NewId: string }>(
      `INSERT INTO "CORE_DatabaseServer" ("Name", "Provider", "LoginMethod", "LoginAccount", "ConnectionSecret", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING "NewId"`,
      [name, provider, loginMethod, loginAccount, encryptConnectionString(connectionString), session.email],
    );
    return ok({ id: saved[0].NewId, name, provider, loginMethod, loginAccount, ...metrics }, 201);
  } catch (error) {
    return handleError(error);
  }
}
