import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getPool, query } from "@/lib/db";
import { WIPEABLE_DATA_TABLES } from "@/features/settings/data/wipe-database-tables";
import { verifyPassword } from "@/lib/password";
import { getUserForAuth } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";

async function getAdminSession() {
  const session = await getSession();
  if (!session) return { session: null, status: 401 as const };

  const roles = await query<{ isAdmin: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM "CORE_Role" WHERE "Id" = $1 AND lower("Name") IN ('admin', 'administrator')
     ) AS "isAdmin"`,
    [session.roleId],
  );
  return roles[0]?.isAdmin ? { session, status: null } : { session: null, status: 403 as const };
}

export async function GET() {
  try {
    const auth = await getAdminSession();
    if (!auth.session) return fail(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status ?? 403);

    const tables = await Promise.all(WIPEABLE_DATA_TABLES.map(async (table) => {
      const rows = await query<{ count: number }>(`SELECT count(*)::int AS count FROM "${table.name}"`);
      return { ...table, rowCount: rows[0]?.count ?? 0 };
    }));
    return ok({ tables });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAdminSession();
    if (!auth.session) return fail(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status ?? 403);

    const body = await req.json().catch(() => null) as { table?: unknown; confirmation?: unknown; email?: unknown; password?: unknown } | null;
    const table = WIPEABLE_DATA_TABLES.find((item) => item.name === body?.table);
    if (!table) return fail("Select a valid application data table", 400);
    if (body?.confirmation !== table.name) return fail("Type the exact table name to confirm", 400);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return fail("Email and password are required", 400);
    const user = await getUserForAuth(email);
    if (!user || user.Id !== auth.session.userId || !user.IsActive || !(await verifyPassword(password, user.Password))) {
      return fail("Email or password does not match the signed-in account", 401);
    }

    const client = await getPool().connect();
    let deletedCount = 0;
    try {
      await client.query("BEGIN");
      const result = await client.query(`DELETE FROM "${table.name}"`);
      deletedCount = result.rowCount ?? 0;
      await client.query(
        `INSERT INTO "DATA_AuditTrail" ("Actor", "Action", "TargetType", "TargetName", "Detail", "Outcome")
         VALUES ($1, 'Wiped table', 'Database table', $2, $3, 'Warning')`,
        [auth.session.email, table.name, `Deleted ${deletedCount} row(s) from ${table.name}.`],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return ok({ table: table.name, deletedCount });
  } catch (error) {
    return handleError(error);
  }
}
