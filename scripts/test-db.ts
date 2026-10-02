import { query } from "@/lib/db";

async function main() {
  const rows = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM "CORE_User"`);
  console.log("Koneksi berhasil. Jumlah user:", rows[0].total);
  process.exit(0);
}

main().catch((err) => {
  console.error("Koneksi gagal:");
  console.error(err);
  process.exit(1);
});