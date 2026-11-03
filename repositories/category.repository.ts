import { query } from "@/lib/db";
import type { CategoryInput } from "@/lib/validation";
import type { Category } from "@/types";

const COLUMNS = `"Id", "CategoryName", "Name", "Description", "IsActive", "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate"`;

export async function getCategoryItems(categoryName: string): Promise<Category[]> {
  return query<Category>(`SELECT ${COLUMNS} FROM "CORE_Category" WHERE "CategoryName" = $1 ORDER BY "Id"`, [categoryName]);
}

export async function getCategoryItemById(id: number): Promise<Category | null> {
  const rows = await query<Category>(`SELECT ${COLUMNS} FROM "CORE_Category" WHERE "Id" = $1`, [id]);
  return rows[0] ?? null;
}

export async function createCategoryItem(
  categoryName: string,
  input: CategoryInput,
  createdBy: string | null
): Promise<Category | "name-taken"> {
  const existing = await query(
    `SELECT 1 FROM "CORE_Category" WHERE "CategoryName" = $1 AND lower("Name") = lower($2)`,
    [categoryName, input.name]
  );
  if (existing[0]) return "name-taken";

  const rows = await query<Category>(
    `INSERT INTO "CORE_Category" ("CategoryName", "Name", "Description", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, $3, $4, now())
     RETURNING ${COLUMNS}`,
    [categoryName, input.name, input.description, createdBy]
  );
  return rows[0];
}

export async function updateCategoryItem(
  id: number,
  input: CategoryInput,
  updatedBy: string | null
): Promise<Category | "not-found" | "name-taken"> {
  const current = await getCategoryItemById(id);
  if (!current) return "not-found";

  const duplicate = await query(
    `SELECT 1 FROM "CORE_Category" WHERE "CategoryName" = $1 AND lower("Name") = lower($2) AND "Id" <> $3`,
    [current.CategoryName, input.name, id]
  );
  if (duplicate[0]) return "name-taken";

  const rows = await query<Category>(
    `UPDATE "CORE_Category"
     SET "Name" = $1, "Description" = $2, "UpdatedBy" = $3, "UpdatedDate" = now()
     WHERE "Id" = $4
     RETURNING ${COLUMNS}`,
    [input.name, input.description, updatedBy, id]
  );
  return rows[0];
}

export async function setCategoryItemActive(id: number, isActive: boolean, updatedBy: string | null): Promise<Category | "not-found"> {
  const rows = await query<Category>(
    `UPDATE "CORE_Category" SET "IsActive" = $1, "UpdatedBy" = $2, "UpdatedDate" = now() WHERE "Id" = $3 RETURNING ${COLUMNS}`,
    [isActive, updatedBy, id]
  );
  return rows[0] ?? "not-found";
}

export async function deleteCategoryItem(id: number): Promise<boolean> {
  const rows = await query(`DELETE FROM "CORE_Category" WHERE "Id" = $1 RETURNING "Id"`, [id]);
  return rows.length > 0;
}
