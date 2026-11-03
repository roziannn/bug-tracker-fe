import { query } from "@/lib/db";
import type { CreateEnvVarInput, UpdateEnvVarInput } from "@/lib/validation";
import type { EnvVar } from "@/types";

// Nilai variabel secret tidak ikut dikirim ke daftar. Untuk membacanya pakai getEnvValue / exportEnv.
const COLUMNS = `"Id", "Environment", "Label", "Key",
  CASE WHEN "IsSecret" THEN NULL ELSE "Value" END AS "Value",
  "IsSecret", ("Value" <> '') AS "HasValue",
  "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate"`;

export async function getEnvVars(): Promise<EnvVar[]> {
  return query<EnvVar>(`SELECT ${COLUMNS} FROM "CORE_Env" ORDER BY "Id"`);
}

export async function getEnvVarById(id: number): Promise<EnvVar | null> {
  const rows = await query<EnvVar>(`SELECT ${COLUMNS} FROM "CORE_Env" WHERE "Id" = $1`, [id]);
  return rows[0] ?? null;
}

export async function getEnvValue(id: number): Promise<string | null> {
  const rows = await query<{ Value: string }>(`SELECT "Value" FROM "CORE_Env" WHERE "Id" = $1`, [id]);
  return rows[0] ? rows[0].Value : null;
}

// Isi file .env untuk satu environment: satu baris KEY=value per variabel.
export async function exportEnv(environment: string): Promise<string> {
  const rows = await query<{ Key: string; Value: string }>(
    `SELECT "Key", "Value" FROM "CORE_Env" WHERE lower("Environment") = lower($1) ORDER BY "Id"`,
    [environment]
  );
  return rows.map((row) => `${row.Key}=${row.Value}`).join("\n");
}

// "staging" dan "Staging" dianggap environment yang sama: pakai penulisan yang sudah ada di database.
async function canonicalEnvironment(name: string): Promise<string> {
  const rows = await query<{ Environment: string }>(
    `SELECT "Environment" FROM "CORE_Env" WHERE lower("Environment") = lower($1) ORDER BY "Id" LIMIT 1`,
    [name]
  );
  return rows[0]?.Environment ?? name;
}

export async function createEnvVar(input: CreateEnvVarInput, createdBy: string | null): Promise<EnvVar | "key-taken"> {
  const environment = await canonicalEnvironment(input.environment);

  const existing = await query(`SELECT 1 FROM "CORE_Env" WHERE "Environment" = $1 AND "Key" = $2`, [environment, input.key]);
  if (existing[0]) return "key-taken";

  const rows = await query<{ Id: number }>(
    `INSERT INTO "CORE_Env" ("Environment", "Label", "Key", "Value", "IsSecret", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING "Id"`,
    [environment, input.label || input.key, input.key, input.value, input.isSecret, createdBy]
  );
  return (await getEnvVarById(rows[0].Id))!;
}

export async function updateEnvVar(
  id: number,
  input: UpdateEnvVarInput,
  updatedBy: string | null
): Promise<EnvVar | "not-found" | "key-taken"> {
  const current = await query<{ Environment: string }>(`SELECT "Environment" FROM "CORE_Env" WHERE "Id" = $1`, [id]);
  if (!current[0]) return "not-found";

  const duplicate = await query(
    `SELECT 1 FROM "CORE_Env" WHERE "Environment" = $1 AND "Key" = $2 AND "Id" <> $3`,
    [current[0].Environment, input.key, id]
  );
  if (duplicate[0]) return "key-taken";

  await query(
    `UPDATE "CORE_Env"
     SET "Label" = $1, "Key" = $2, "Value" = COALESCE($3, "Value"), "IsSecret" = $4,
         "UpdatedBy" = $5, "UpdatedDate" = now()
     WHERE "Id" = $6`,
    [input.label || input.key, input.key, input.value ?? null, input.isSecret, updatedBy, id]
  );
  return (await getEnvVarById(id))!;
}

export async function deleteEnvVar(id: number): Promise<boolean> {
  const rows = await query(`DELETE FROM "CORE_Env" WHERE "Id" = $1 RETURNING "Id"`, [id]);
  return rows.length > 0;
}
