import { query } from "@/lib/db";

// Memberi satu role akses ke semua menu dan semua button.
// Pakai: pnpm seed-access "Administrator"   (tanpa argumen = role bernama Administrator)
async function main() {
  const roleName = process.argv[2] ?? "Administrator";

  const roles = await query<{ Id: number }>(`SELECT "Id" FROM "CORE_Role" WHERE lower("Name") = lower($1)`, [roleName]);
  if (!roles[0]) {
    console.error(`Role "${roleName}" tidak ditemukan.`);
    process.exit(1);
  }
  const roleId = roles[0].Id;

  const menus = await query(
    `INSERT INTO "CORE_RoleMenu" ("RoleId", "MenuId", "CreatedBy", "CreatedDate")
     SELECT $1, "Id", 'System', now() FROM "CORE_Menu"
     ON CONFLICT ("RoleId", "MenuId") DO NOTHING
     RETURNING "Id"`,
    [roleId]
  );
  const actions = await query(
    `INSERT INTO "CORE_RoleMenuAction" ("RoleId", "MenuActionId", "CreatedBy", "CreatedDate")
     SELECT $1, "Id", 'System', now() FROM "CORE_MenuAction"
     ON CONFLICT ("RoleId", "MenuActionId") DO NOTHING
     RETURNING "Id"`,
    [roleId]
  );

  console.log(`Role "${roleName}": ${menus.length} menu dan ${actions.length} button baru diizinkan.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seed akses:", err);
  process.exit(1);
});
