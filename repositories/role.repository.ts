import { query } from "@/lib/db";
import type { Paged, Role } from "@/types";

const COLUMNS = `"Id", "NewId", "Name", "IsActive", "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate"`;

export async function getRoles(page: number, pageSize: number, search: string | null): Promise<Paged<Role>> {
  const offset = (page - 1) * pageSize;
  const searchParam = search ? `%${search}%` : null;

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM "CORE_Role" WHERE ($1::text IS NULL OR "Name" ILIKE $1)`,
    [searchParam]
  );

  const dataRows = await query<Role>(
    `SELECT ${COLUMNS} FROM "CORE_Role"
     WHERE ($1::text IS NULL OR "Name" ILIKE $1)
     ORDER BY "Id"
     OFFSET $2 LIMIT $3`,
    [searchParam, offset, pageSize]
  );

  return { data: dataRows, page, pageSize, total: Number(countRows[0].total) };
}

export async function getRoleById(id: number): Promise<Role | null> {
  const rows = await query<Role>(`SELECT ${COLUMNS} FROM "CORE_Role" WHERE "Id" = $1`, [id]);
  return rows[0] ?? null;
}