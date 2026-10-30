import { query } from "@/lib/db";
import { defaultMenus } from "@/features/settings/data/access-catalog";

// Memasukkan menu bawaan ke CORE_Menu. Menu yang Code-nya sudah ada dilewati.
async function main() {
  let created = 0;

  for (const [index, menu] of defaultMenus.entries()) {
    const existing = await query(`SELECT "Id" FROM "CORE_Menu" WHERE "Code" = $1`, [menu.id]);
    if (existing[0]) {
      console.log(`Skip ${menu.id}, sudah ada`);
      continue;
    }

    const rows = await query<{ Id: number }>(
      `INSERT INTO "CORE_Menu" ("Code", "Name", "Path", "Icon", "Sequence", "IsVisible", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, $6, 'System', now())
       RETURNING "Id"`,
      [menu.id, menu.label, menu.path, menu.icon, index + 1, menu.visible]
    );

    for (const action of menu.actions) {
      await query(
        `INSERT INTO "CORE_MenuAction" ("MenuId", "Code", "Name", "CreatedBy", "CreatedDate")
         VALUES ($1, $2, $3, 'System', now())
         ON CONFLICT ("Code") DO NOTHING`,
        [rows[0].Id, action.id, action.label]
      );
    }

    created++;
    console.log(`Menu dibuat: ${menu.label} (${menu.actions.length} button)`);
  }

  console.log(`Selesai. ${created} menu baru.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seed menu:", err);
  process.exit(1);
});
