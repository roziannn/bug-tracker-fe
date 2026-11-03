import { query } from "@/lib/db";
import { categoryConfigs } from "@/features/settings/data/category-store";

// Memasukkan nilai awal tiap kategori ke CORE_Category. Nilai yang sudah ada (CategoryName + Name sama) dilewati.
async function main() {
  let created = 0;

  for (const config of categoryConfigs) {
    for (const entry of config.defaults) {
      const rows = await query(
        `INSERT INTO "CORE_Category" ("CategoryName", "Name", "Description", "CreatedBy", "CreatedDate")
         SELECT $1::varchar, $2::varchar, $3::varchar, 'System', now()
         WHERE NOT EXISTS (
           SELECT 1 FROM "CORE_Category" WHERE "CategoryName" = $1::varchar AND lower("Name") = lower($2::varchar)
         )
         RETURNING "Id"`,
        [config.title, entry.name, entry.description]
      );
      if (rows.length) created++;
    }
    console.log(`${config.title}: ${config.defaults.length} nilai awal diperiksa`);
  }

  console.log(`Selesai. ${created} baris baru.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seed kategori:", err);
  process.exit(1);
});
