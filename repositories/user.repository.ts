import { query } from "@/lib/db";
import type { Paged, User } from "@/types";

const COLUMNS = `"Id", "Name", "Email", "IsActive", "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate"`;

export async function getUsers(page: number, pageSize: number, search: string | null): Promise<Paged<User>> {
  const offset = (page - 1) * pageSize;
  const searchParam = search ? `%${search}%` : null;

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM "CORE_User" WHERE ($1::text IS NULL OR "Name" ILIKE $1 OR "Email" ILIKE $1)`,
    [searchParam]
  );

  const dataRows = await query<User>(
    `SELECT ${COLUMNS} FROM "CORE_User"
     WHERE ($1::text IS NULL OR "Name" ILIKE $1 OR "Email" ILIKE $1)
     ORDER BY "Id"
     OFFSET $2 LIMIT $3`,
    [searchParam, offset, pageSize]
  );

  return { data: dataRows, page, pageSize, total: Number(countRows[0].total) };
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await query<User>(`SELECT ${COLUMNS} FROM "CORE_User" WHERE "Id" = $1`, [id]);
  return rows[0] ?? null;
}

export async function getUserForAuth(email: string) {
  const rows = await query<User & { Password: string }>(
    `SELECT "Id", "Name", "Email", "Password", "IsActive" FROM "CORE_User" WHERE "Email" = $1`,
    [email]
  );
  return rows[0] ?? null;
}