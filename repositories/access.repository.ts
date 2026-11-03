import { getPool, query } from "@/lib/db";
import { getMenus } from "@/repositories/menu.repository";
import type { CurrentUser, NavMenu, RoleAccess } from "@/types";

export async function getRoleAccess(roleId: number): Promise<RoleAccess> {
  const menus = await query<{ Code: string }>(
    `SELECT m."Code" FROM "CORE_RoleMenu" rm JOIN "CORE_Menu" m ON m."Id" = rm."MenuId" WHERE rm."RoleId" = $1`,
    [roleId]
  );
  const actions = await query<{ Code: string }>(
    `SELECT a."Code" FROM "CORE_RoleMenuAction" ra JOIN "CORE_MenuAction" a ON a."Id" = ra."MenuActionId" WHERE ra."RoleId" = $1`,
    [roleId]
  );
  return { menus: menus.map((row) => row.Code), actions: actions.map((row) => row.Code) };
}

// Mengganti seluruh izin role. Code yang tidak dikenal dilewati, dan button hanya disimpan kalau menunya ikut dipilih.
export async function setRoleAccess(roleId: number, access: RoleAccess, updatedBy: string | null): Promise<"ok" | "not-found"> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const role = await client.query(`SELECT 1 FROM "CORE_Role" WHERE "Id" = $1`, [roleId]);
    if (!role.rowCount) {
      await client.query("ROLLBACK");
      return "not-found";
    }

    await client.query(`DELETE FROM "CORE_RoleMenu" WHERE "RoleId" = $1`, [roleId]);
    await client.query(`DELETE FROM "CORE_RoleMenuAction" WHERE "RoleId" = $1`, [roleId]);

    await client.query(
      `INSERT INTO "CORE_RoleMenu" ("RoleId", "MenuId", "CreatedBy", "CreatedDate")
       SELECT $1, m."Id", $3, now() FROM "CORE_Menu" m WHERE m."Code" = ANY($2::text[])`,
      [roleId, access.menus, updatedBy]
    );
    await client.query(
      `INSERT INTO "CORE_RoleMenuAction" ("RoleId", "MenuActionId", "CreatedBy", "CreatedDate")
       SELECT $1, a."Id", $4, now()
       FROM "CORE_MenuAction" a JOIN "CORE_Menu" m ON m."Id" = a."MenuId"
       WHERE a."Code" = ANY($2::text[]) AND m."Code" = ANY($3::text[])`,
      [roleId, access.actions, access.menus, updatedBy]
    );

    await client.query("COMMIT");
    return "ok";
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Sidebar: menu harus tampil, diizinkan untuk role, dan semua induknya juga tampil dan diizinkan.
// Menu tanpa path yang tidak punya anak lagi (grup kosong) dibuang.
async function buildNavigation(allowed: Set<string>): Promise<NavMenu[]> {
  const menus = await getMenus();
  const byId = new Map(menus.map((menu) => [menu.id, menu]));

  const reachable = (id: string): boolean => {
    const menu = byId.get(id);
    if (!menu || !menu.visible || !allowed.has(id)) return false;
    return menu.parentId ? reachable(menu.parentId) : true;
  };

  let nodes = menus.filter((menu) => reachable(menu.id));

  for (let changed = true; changed; ) {
    const parentIds = new Set(nodes.map((menu) => menu.parentId));
    const kept = nodes.filter((menu) => menu.path.trim() || parentIds.has(menu.id));
    changed = kept.length !== nodes.length;
    nodes = kept;
  }

  return nodes.map((menu) => ({ id: menu.id, label: menu.label, parentId: menu.parentId, path: menu.path, icon: menu.icon }));
}

// Data user yang sedang login: role-nya, izinnya, dan menu sidebar. Dibaca dari database, bukan dari isi cookie,
// jadi perubahan role atau izin langsung berlaku. Null kalau user sudah tidak ada atau nonaktif.
export async function getCurrentUser(email: string): Promise<CurrentUser | null> {
  const users = await query<{ Name: string; Email: string; RoleId: number | null; RoleName: string | null; RoleActive: boolean | null }>(
    `SELECT u."Name", u."Email", r."Id" AS "RoleId", r."Name" AS "RoleName", r."IsActive" AS "RoleActive"
     FROM "CORE_User" u
     LEFT JOIN LATERAL (
       SELECT "RoleId" FROM "CORE_RoleClaim" WHERE lower("Email") = lower(u."Email") ORDER BY "Id" LIMIT 1
     ) rc ON true
     LEFT JOIN "CORE_Role" r ON r."Id" = rc."RoleId"
     WHERE lower(u."Email") = lower($1) AND u."IsActive" = true`,
    [email]
  );
  const user = users[0];
  if (!user) return null;

  // Role yang dinonaktifkan berarti tidak punya izin apa pun.
  const hasRole = user.RoleId !== null && user.RoleActive === true;
  const access = hasRole ? await getRoleAccess(user.RoleId!) : { menus: [], actions: [] };

  return {
    name: user.Name,
    email: user.Email,
    role: user.RoleId !== null ? { id: user.RoleId, name: user.RoleName ?? "" } : null,
    menus: access.menus,
    actions: access.actions,
    navigation: await buildNavigation(new Set(access.menus)),
  };
}
