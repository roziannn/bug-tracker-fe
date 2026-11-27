import { NextRequest } from "next/server";

import { fail, handleError, ok, isGuid } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { assertDatabaseMonitorConfigured, encryptConnectionString, inspectDatabase } from "@/lib/database-monitor";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const access = await query<{ allowed: boolean }>(
      `SELECT (
         EXISTS (SELECT 1 FROM "CORE_Role" r WHERE r."Id" = $1 AND lower(r."Name") IN ('admin', 'administrator'))
         OR EXISTS (
           SELECT 1 FROM "CORE_RoleMenu" rm JOIN "CORE_Menu" m ON m."Id" = rm."MenuId"
           WHERE rm."RoleId" = $1 AND m."Path" = '/database-monitor' AND m."IsVisible" = true
         )
       ) AS allowed`,
      [session.roleId],
    );
    if (!access[0]?.allowed) return fail("Forbidden", 403);
    const { id } = await params;
    if (!isGuid(id)) return fail("Invalid database server", 400);
    const deleted = await query<{ Id: number }>(
      `UPDATE "CORE_DatabaseServer" SET "IsActive" = false, "UpdatedBy" = $2, "UpdatedDate" = now()
       WHERE "NewId" = $1::uuid AND "IsActive" = true RETURNING "Id"`,
      [id, session.email],
    );
    return deleted[0] ? ok({ deleted: true }) : fail("Database server not found", 404);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const access = await query<{ allowed: boolean }>(
      `SELECT (
         EXISTS (SELECT 1 FROM "CORE_Role" r WHERE r."Id" = $1 AND lower(r."Name") IN ('admin', 'administrator'))
         OR EXISTS (
           SELECT 1 FROM "CORE_RoleMenu" rm JOIN "CORE_Menu" m ON m."Id" = rm."MenuId"
           WHERE rm."RoleId" = $1 AND m."Path" = '/database-monitor' AND m."IsVisible" = true
         )
       ) AS allowed`,
      [session.roleId],
    );
    if (!access[0]?.allowed) return fail("Forbidden", 403);
    assertDatabaseMonitorConfigured();
    const { id } = await params;
    if (!isGuid(id)) return fail("Invalid database server", 400);
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

    const existing = await query<{ Id: number }>(
      `SELECT "Id" FROM "CORE_DatabaseServer" WHERE "NewId" = $1::uuid AND "IsActive" = true`, [id],
    );
    if (!existing[0]) return fail("Database server not found", 404);
    const duplicate = await query(
      `SELECT 1 FROM "CORE_DatabaseServer" WHERE lower("Name") = lower($1) AND "NewId" <> $2::uuid AND "IsActive" = true`,
      [name, id],
    );
    if (duplicate[0]) return fail("A monitored server with this name already exists", 409);

    let encryptedConnection: string | null = null;
    if (connectionString) {
      let parsedUrl: URL;
      try { parsedUrl = new URL(connectionString); } catch { return fail("Enter a valid PostgreSQL connection URL", 400); }
      if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
        return fail("Connection URL must use the postgres:// or postgresql:// protocol", 400);
      }
      const metrics = await inspectDatabase(connectionString).catch((error) => {
        console.error("Updated database connection test failed", error);
        return null;
      });
      if (!metrics) return fail("Unable to connect. Check the URL, credentials, network access, and database permissions.", 400);
      encryptedConnection = encryptConnectionString(connectionString);
    }

    await query(
      `UPDATE "CORE_DatabaseServer" SET "Name" = $2, "Provider" = $3, "LoginMethod" = $4, "LoginAccount" = $5,
         "ConnectionSecret" = COALESCE($6, "ConnectionSecret"), "UpdatedBy" = $7, "UpdatedDate" = now()
       WHERE "NewId" = $1::uuid`,
      [id, name, provider, loginMethod, loginAccount, encryptedConnection, session.email],
    );
    if (encryptedConnection) {
      await query(`DELETE FROM "DATA_DatabaseMonitorSamples" WHERE "ServerKey" = $1`, [id]);
    }
    return ok({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
