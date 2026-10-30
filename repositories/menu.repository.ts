import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import type { MenuInput } from "@/lib/validation";
import type { MenuNode } from "@/features/settings/data/access-catalog";

type MenuRow = {
  Id: number;
  Code: string;
  Name: string;
  Path: string;
  Icon: string;
  IsVisible: boolean;
  ParentId: number | null;
  ParentCode: string | null;
  CreatedBy: string | null;
  CreatedDate: string;
};

type ActionRow = { Code: string; Name: string; MenuCode: string };

const MENU_SELECT = `SELECT m."Id", m."Code", m."Name", m."Path", m."Icon", m."IsVisible", m."ParentId",
  p."Code" AS "ParentCode", m."CreatedBy", m."CreatedDate"
  FROM "CORE_Menu" m
  LEFT JOIN "CORE_Menu" p ON p."Id" = m."ParentId"`;

export type MenuResult = "not-found" | "parent-not-found" | "invalid-parent";

function slugify(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "menu";
}

async function uniqueCode(client: PoolClient, table: "CORE_Menu" | "CORE_MenuAction", base: string, max: number) {
  const root = base.slice(0, max - 6);
  let code = root;
  for (let n = 2; ; n++) {
    const taken = await client.query(`SELECT 1 FROM "${table}" WHERE "Code" = $1`, [code]);
    if (!taken.rowCount) return code;
    code = `${root}-${n}`;
  }
}

function toNodes(menus: MenuRow[], actions: ActionRow[]): MenuNode[] {
  return menus.map((menu) => ({
    id: menu.Code,
    label: menu.Name,
    parentId: menu.ParentCode,
    path: menu.Path,
    icon: menu.Icon,
    visible: menu.IsVisible,
    actions: actions.filter((action) => action.MenuCode === menu.Code).map((action) => ({ id: action.Code, label: action.Name })),
    CreatedBy: menu.CreatedBy,
    CreatedDate: menu.CreatedDate,
  }));
}

async function loadActions(where = "", params: unknown[] = []) {
  return query<ActionRow>(
    `SELECT a."Code", a."Name", m."Code" AS "MenuCode"
     FROM "CORE_MenuAction" a JOIN "CORE_Menu" m ON m."Id" = a."MenuId"
     ${where} ORDER BY a."Id"`,
    params
  );
}

// Urut per sibling: parent menu dulu, lalu urutan (Sequence). Client mengelompokkan parent dan sub menu.
export async function getMenus(): Promise<MenuNode[]> {
  const menus = await query<MenuRow>(`${MENU_SELECT} ORDER BY m."Sequence", m."Id"`);
  return toNodes(menus, await loadActions());
}

export async function getMenuByCode(code: string): Promise<MenuNode | null> {
  const menus = await query<MenuRow>(`${MENU_SELECT} WHERE m."Code" = $1`, [code]);
  if (!menus[0]) return null;
  return toNodes(menus, await loadActions(`WHERE m."Code" = $1`, [code]))[0];
}

type ParentResult = { id: number | null; error?: undefined } | { id?: undefined; error: "parent-not-found" | "invalid-parent" };

async function resolveParent(client: PoolClient, parentCode: string | null, selfId: number | null): Promise<ParentResult> {
  if (!parentCode) return { id: null };

  const parent = await client.query<{ Id: number; ParentId: number | null }>(
    `SELECT "Id", "ParentId" FROM "CORE_Menu" WHERE "Code" = $1`,
    [parentCode]
  );
  if (!parent.rows[0]) return { error: "parent-not-found" };

  // Hanya dua tingkat: parent harus menu utama, dan menu yang punya sub menu tidak boleh jadi sub menu.
  if (parent.rows[0].ParentId !== null || parent.rows[0].Id === selfId) return { error: "invalid-parent" };
  if (selfId !== null) {
    const children = await client.query(`SELECT 1 FROM "CORE_Menu" WHERE "ParentId" = $1 LIMIT 1`, [selfId]);
    if (children.rowCount) return { error: "invalid-parent" };
  }
  return { id: parent.rows[0].Id };
}

async function nextSequence(client: PoolClient, parentId: number | null) {
  const rows = await client.query<{ next: number }>(
    `SELECT COALESCE(MAX("Sequence"), 0) + 1 AS next FROM "CORE_Menu" WHERE "ParentId" IS NOT DISTINCT FROM $1`,
    [parentId]
  );
  return rows.rows[0].next;
}

async function withTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createMenu(input: MenuInput, createdBy: string | null): Promise<MenuNode | "parent-not-found" | "invalid-parent"> {
  const result = await withTransaction(async (client) => {
    const parent = await resolveParent(client, input.parentId, null);
    if (parent.error) return { error: parent.error };

    const code = await uniqueCode(client, "CORE_Menu", slugify(input.label), 150);
    const created = await client.query<{ Id: number }>(
      `INSERT INTO "CORE_Menu" ("Code", "Name", "Path", "Icon", "ParentId", "Sequence", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING "Id"`,
      [code, input.label, input.path, input.icon, parent.id, await nextSequence(client, parent.id), createdBy]
    );

    for (const action of input.actions) {
      const actionCode = await uniqueCode(client, "CORE_MenuAction", `${code}.${slugify(action.label)}`, 200);
      await client.query(
        `INSERT INTO "CORE_MenuAction" ("MenuId", "Code", "Name", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, now())`,
        [created.rows[0].Id, actionCode, action.label, createdBy]
      );
    }
    return { code };
  });

  if (result.error) return result.error;
  return (await getMenuByCode(result.code))!;
}

export async function updateMenu(code: string, input: MenuInput, updatedBy: string | null): Promise<MenuNode | MenuResult> {
  const result = await withTransaction(async (client) => {
    const current = await client.query<{ Id: number; ParentId: number | null }>(
      `SELECT "Id", "ParentId" FROM "CORE_Menu" WHERE "Code" = $1`,
      [code]
    );
    if (!current.rows[0]) return "not-found" as const;
    const { Id: id, ParentId: oldParentId } = current.rows[0];

    const parent = await resolveParent(client, input.parentId, id);
    if (parent.error) return parent.error;

    // Pindah parent berarti masuk ke urutan paling bawah di grup barunya.
    const sequence = parent.id === oldParentId ? null : await nextSequence(client, parent.id);

    await client.query(
      `UPDATE "CORE_Menu"
       SET "Name" = $1, "Path" = $2, "Icon" = $3, "ParentId" = $4, "Sequence" = COALESCE($5, "Sequence"),
           "UpdatedBy" = $6, "UpdatedDate" = now()
       WHERE "Id" = $7`,
      [input.label, input.path, input.icon, parent.id, sequence, updatedBy, id]
    );

    // Button yang tidak ada lagi di daftar dihapus; yang sudah ada diganti namanya; sisanya dibuat baru.
    const existing = await client.query<{ Code: string }>(`SELECT "Code" FROM "CORE_MenuAction" WHERE "MenuId" = $1`, [id]);
    const existingCodes = new Set(existing.rows.map((row) => row.Code));
    const keptCodes = new Set(input.actions.map((action) => action.id).filter((value): value is string => !!value && existingCodes.has(value)));

    for (const old of existingCodes) {
      if (!keptCodes.has(old)) await client.query(`DELETE FROM "CORE_MenuAction" WHERE "Code" = $1`, [old]);
    }

    for (const action of input.actions) {
      if (action.id && keptCodes.has(action.id)) {
        await client.query(
          `UPDATE "CORE_MenuAction" SET "Name" = $1, "UpdatedBy" = $2, "UpdatedDate" = now() WHERE "Code" = $3`,
          [action.label, updatedBy, action.id]
        );
      } else {
        const actionCode = await uniqueCode(client, "CORE_MenuAction", `${code}.${slugify(action.label)}`, 200);
        await client.query(
          `INSERT INTO "CORE_MenuAction" ("MenuId", "Code", "Name", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, now())`,
          [id, actionCode, action.label, updatedBy]
        );
      }
    }
    return "ok" as const;
  });

  if (result !== "ok") return result;
  return (await getMenuByCode(code))!;
}

export async function setMenuVisible(code: string, visible: boolean, updatedBy: string | null): Promise<MenuNode | "not-found"> {
  const rows = await query(
    `UPDATE "CORE_Menu" SET "IsVisible" = $1, "UpdatedBy" = $2, "UpdatedDate" = now() WHERE "Code" = $3 RETURNING "Id"`,
    [visible, updatedBy, code]
  );
  if (!rows[0]) return "not-found";
  return (await getMenuByCode(code))!;
}

// Sub menu dan button ikut terhapus lewat ON DELETE CASCADE.
export async function deleteMenu(code: string): Promise<boolean> {
  const rows = await query(`DELETE FROM "CORE_Menu" WHERE "Code" = $1 RETURNING "Id"`, [code]);
  return rows.length > 0;
}

export async function moveMenu(code: string, direction: -1 | 1): Promise<"ok" | "not-found"> {
  return withTransaction(async (client) => {
    const current = await client.query<{ Id: number; ParentId: number | null }>(
      `SELECT "Id", "ParentId" FROM "CORE_Menu" WHERE "Code" = $1`,
      [code]
    );
    if (!current.rows[0]) return "not-found" as const;

    const siblings = await client.query<{ Id: number }>(
      `SELECT "Id" FROM "CORE_Menu" WHERE "ParentId" IS NOT DISTINCT FROM $1 ORDER BY "Sequence", "Id"`,
      [current.rows[0].ParentId]
    );
    const ids = siblings.rows.map((row) => row.Id);
    const from = ids.indexOf(current.rows[0].Id);
    const to = from + direction;

    if (to >= 0 && to < ids.length) [ids[from], ids[to]] = [ids[to], ids[from]];

    // Nomori ulang supaya urutan tetap rapi walau sebelumnya ada nilai Sequence yang sama.
    for (let index = 0; index < ids.length; index++) {
      await client.query(`UPDATE "CORE_Menu" SET "Sequence" = $1 WHERE "Id" = $2`, [index + 1, ids[index]]);
    }
    return "ok" as const;
  });
}
