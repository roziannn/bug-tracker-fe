import { query } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { CreateUserInput } from "@/lib/validation";
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

export async function createUser(input: CreateUserInput, createdBy: string | null): Promise<User | "email-taken" | "role-not-found"> {
  const role = await query(`SELECT "Id" FROM "CORE_Role" WHERE "Id" = $1`, [input.roleId]);
  if (!role[0]) return "role-not-found";

  const existing = await query(`SELECT "Id" FROM "CORE_User" WHERE "Email" = $1`, [input.email]);
  if (existing[0]) return "email-taken";

  const hashed = await hashPassword(input.password);
  const rows = await query<User>(
    `INSERT INTO "CORE_User" ("Name", "Email", "Password", "IsActive", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, $3, true, $4, now())
     RETURNING ${COLUMNS}`,
    [input.name, input.email, hashed, createdBy]
  );

  await query(
    `INSERT INTO "CORE_RoleClaim" ("RoleId", "Name", "Email", "IsActive", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, $3, true, $4, now())`,
    [input.roleId, input.name, input.email, createdBy]
  );

  return rows[0];
}
