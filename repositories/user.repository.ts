import { query } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getPool } from "@/lib/db";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation";
import type { Paged, User } from "@/types";

const COLUMNS = `"Id", "Name", "Email", "IsActive", "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate"`;

// Role user diambil lewat CORE_RoleClaim (dicocokkan dengan email).
const COLUMNS_WITH_ROLE = `u."Id", u."Name", u."Email", u."IsActive", u."CreatedBy", u."CreatedDate", u."UpdatedBy", u."UpdatedDate",
  rc."RoleId" AS "RoleId", r."Name" AS "RoleName"`;
const ROLE_JOIN = `LEFT JOIN LATERAL (
    SELECT "RoleId" FROM "CORE_RoleClaim" WHERE "Email" = u."Email" ORDER BY "Id" LIMIT 1
  ) rc ON true
  LEFT JOIN "CORE_Role" r ON r."Id" = rc."RoleId"`;

export async function getUsers(page: number, pageSize: number, search: string | null): Promise<Paged<User>> {
  const offset = (page - 1) * pageSize;
  const searchParam = search ? `%${search}%` : null;

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM "CORE_User" WHERE ($1::text IS NULL OR "Name" ILIKE $1 OR "Email" ILIKE $1)`,
    [searchParam]
  );

  const dataRows = await query<User>(
    `SELECT ${COLUMNS_WITH_ROLE} FROM "CORE_User" u
     ${ROLE_JOIN}
     WHERE ($1::text IS NULL OR u."Name" ILIKE $1 OR u."Email" ILIKE $1)
     ORDER BY u."Id"
     OFFSET $2 LIMIT $3`,
    [searchParam, offset, pageSize]
  );

  return { data: dataRows, page, pageSize, total: Number(countRows[0].total) };
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await query<User>(`SELECT ${COLUMNS_WITH_ROLE} FROM "CORE_User" u ${ROLE_JOIN} WHERE u."Id" = $1`, [id]);
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


export async function updateUser(
  id: number,
  input: UpdateUserInput,
  updatedBy: string | null
): Promise<User | "not-found" | "email-taken" | "role-not-found"> {
  const current = await query<{ Email: string; IsActive: boolean }>(
    `SELECT "Email", "IsActive" FROM "CORE_User" WHERE "Id" = $1`,
    [id]
  );
  if (!current[0]) return "not-found";

  const role = await query(`SELECT "Id" FROM "CORE_Role" WHERE "Id" = $1`, [input.roleId]);
  if (!role[0]) return "role-not-found";

  const duplicate = await query(
    `SELECT "Id" FROM "CORE_User" WHERE lower("Email") = lower($1) AND "Id" <> $2`,
    [input.email, id]
  );
  if (duplicate[0]) return "email-taken";

  const isActive = input.isActive ?? current[0].IsActive;
  const hashed = input.password ? await hashPassword(input.password) : null;

  // User dan role-claim harus berubah bersamaan, jadi dibungkus transaksi.
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE "CORE_User"
       SET "Name" = $1, "Email" = $2, "Password" = COALESCE($3, "Password"), "IsActive" = $4,
           "UpdatedBy" = $5, "UpdatedDate" = now()
       WHERE "Id" = $6`,
      [input.name, input.email, hashed, isActive, updatedBy, id]
    );

    const claim = await client.query(
      `UPDATE "CORE_RoleClaim"
       SET "RoleId" = $1, "Name" = $2, "Email" = $3, "IsActive" = $4, "UpdatedBy" = $5, "UpdatedDate" = now()
       WHERE "Email" = $6`,
      [input.roleId, input.name, input.email, isActive, updatedBy, current[0].Email]
    );
    if (claim.rowCount === 0) {
      await client.query(
        `INSERT INTO "CORE_RoleClaim" ("RoleId", "Name", "Email", "IsActive", "CreatedBy", "CreatedDate")
         VALUES ($1, $2, $3, $4, $5, now())`,
        [input.roleId, input.name, input.email, isActive, updatedBy]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return (await getUserById(id))!;
}
