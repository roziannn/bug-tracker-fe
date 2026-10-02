import { query } from "@/lib/db";
import type { Paged, RoleClaim } from "@/types";

const COLUMNS = `"Id", "RoleId", "Name", "Email", "IsActive", "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate"`;

export async function getRoleClaims(
  page: number,
  pageSize: number,
  search: string | null,
  roleId: number | null
): Promise<Paged<RoleClaim>> {
  const offset = (page - 1) * pageSize;
  const searchParam = search ? `%${search}%` : null;

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM "CORE_RoleClaim"
     WHERE ($1::int IS NULL OR "RoleId" = $1)
       AND ($2::text IS NULL OR "Name" ILIKE $2 OR "Email" ILIKE $2)`,
    [roleId, searchParam]
  );

  const dataRows = await query<RoleClaim>(
    `SELECT ${COLUMNS} FROM "CORE_RoleClaim"
     WHERE ($1::int IS NULL OR "RoleId" = $1)
       AND ($2::text IS NULL OR "Name" ILIKE $2 OR "Email" ILIKE $2)
     ORDER BY "Id"
     OFFSET $3 LIMIT $4`,
    [roleId, searchParam, offset, pageSize]
  );

  return { data: dataRows, page, pageSize, total: Number(countRows[0].total) };
}

export async function getRoleClaimById(id: number): Promise<RoleClaim | null> {
  const rows = await query<RoleClaim>(`SELECT ${COLUMNS} FROM "CORE_RoleClaim" WHERE "Id" = $1`, [id]);
  return rows[0] ?? null;
}