import { query } from "@/lib/db";

// Terminal Windows sering memakan tanda kutip dua. Jadi identifier huruf besar
// boleh ditulis [Name] (diubah ke "Name"), dan tabel CORE_/DATA_ dikutip otomatis.
function normalize(sql: string): string {
  return sql
    .replace(/\[(\w+)\]/g, '"$1"')
    .replace(/(?<!["\w.])((?:CORE|DATA)_\w+)(?!["\w])/g, '"$1"');
}

async function main() {
  const raw = process.argv.slice(2).join(" ");
  if (!raw) {
    console.log(`
    Kamu belum menulis query. Tulis SQL-nya setelah "pnpm db:query", dibungkus tanda kutip.

    Contoh:
      pnpm db:query "SELECT * FROM CORE_User"
      pnpm db:query "SELECT [Id], [Name] FROM CORE_Role"
      pnpm db:query "SELECT * FROM CORE_Role WHERE [IsActive] = true"
    `);
    process.exit(1);
  }

  const sql = normalize(raw);
  console.log(sql);
  const rows = await query(sql);
  if (rows.length) console.table(rows);
  else console.log("(0 baris)");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
