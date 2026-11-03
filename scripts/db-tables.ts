import { query } from "@/lib/db";

async function main() {
  const tables = await query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')
     ORDER BY table_schema, table_name`
  );

  const rows = [];
  for (const t of tables) {
    const count = await query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM "${t.table_schema}"."${t.table_name}"`
    );
    rows.push({ schema: t.table_schema, table: t.table_name, rows: Number(count[0].total) });
  }

  console.table(rows);
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal:", err);
  process.exit(1);
});
