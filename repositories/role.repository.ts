import { query } from "@/lib/db";
import type { RoleInput } from "@/lib/validation";
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

export async function createRole(input: RoleInput, createdBy: string | null): Promise<Role | "name-taken"> {
  const existing = await query(`SELECT "Id" FROM "CORE_Role" WHERE lower("Name") = lower($1)`, [input.name]);
  if (existing[0]) return "name-taken";

  const rows = await query<Role>(
    `INSERT INTO "CORE_Role" ("Name", "IsActive", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, $3, now())
     RETURNING ${COLUMNS}`,
    [input.name, input.isActive ?? true, createdBy]
  );
  return rows[0];
}

export async function updateRole(
  id: number,
  input: RoleInput,
  updatedBy: string | null
): Promise<Role | "not-found" | "name-taken"> {
  const current = await getRoleById(id);
  if (!current) return "not-found";

  const duplicate = await query(`SELECT "Id" FROM "CORE_Role" WHERE lower("Name") = lower($1) AND "Id" <> $2`, [input.name, id]);
  if (duplicate[0]) return "name-taken";

  const rows = await query<Role>(
    `UPDATE "CORE_Role"
     SET "Name" = $1, "IsActive" = $2, "UpdatedBy" = $3, "UpdatedDate" = now()
     WHERE "Id" = $4
     RETURNING ${COLUMNS}`,
    [input.name, input.isActive ?? current.IsActive, updatedBy, id]
  );
  return rows[0];
}
