# Drizzle Migration

Panduan singkat memakai Drizzle untuk migrasi database (Neon PostgreSQL) di proyek ini.

## Aturan penamaan tabel

| Jenis | Prefix | Contoh |
|-------|--------|--------|
| Master / settings | `CORE_` | `CORE_User`, `CORE_Role`, `CORE_RoleClaim` |
| Flow / transaksi | `DATA_` | `DATA_Projects` |

## Struktur folder

```
db/
  schema/
    _columns.ts    kolom audit yang dipakai bersama
    core.ts        tabel CORE_
    data.ts        tabel DATA_
    index.ts       menggabungkan semua schema (wajib export file baru di sini)
  migrations/
    0000_xxx.sql   file SQL hasil generate
    meta/
      _journal.json     daftar urutan migrasi
      0000_snapshot.json  gambaran schema setelah migrasi tersebut
drizzle.config.ts  konfigurasi drizzle-kit (membaca DATABASE_URL dari .env)
```

## Perintah

| Perintah | Fungsi |
|----------|--------|
| `pnpm db:generate` | Membandingkan schema TypeScript dengan snapshot terakhir, lalu membuat file `.sql` baru. Tidak konek ke database. |
| `pnpm db:migrate` | Menjalankan file `.sql` yang belum pernah dijalankan ke database. |
| `pnpm db:studio` | Melihat/mengedit **data** lewat browser. |

## Alur kerja

Perubahan struktur (buat tabel, tambah/ubah/hapus kolom, index):

1. Edit schema di `db/schema/`.
2. `pnpm db:generate`
3. Cek file `.sql` yang terbentuk di `db/migrations/`.
4. `pnpm db:migrate`
5. Commit schema, file `.sql`, **dan folder `meta/`** ke git.

Kalau schema tidak berubah tapi ada migrasi baru (misalnya hasil `git pull`), cukup `pnpm db:migrate`.

## Kenapa ada folder `meta/`?

Supaya `db:generate` tahu apa yang berubah sejak migrasi terakhir, **tanpa perlu melihat database**.

Analogi renovasi rumah: tukang tidak boleh masuk rumah. Ia diberi dua kertas.

- **Kertas lama**: denah sebelum renovasi, yaitu `snapshot.json`.
- **Kertas baru**: denah yang diinginkan, yaitu schema TypeScript.

Tukang membandingkan keduanya dan menulis daftar kerjaan, yaitu file `.sql`. Setelah itu denah baru disimpan sebagai kertas lama untuk renovasi berikutnya.

Tanpa kertas lama, drizzle akan menganggap semua tabel baru dan menulis ulang `CREATE TABLE`, yang error di database yang tabelnya sudah ada.

`_journal.json` hanya daftar urutan migrasi, supaya `db:migrate` tahu file mana dijalankan lebih dulu.

Aturan untuk `meta/`:

- Jangan diedit manual, drizzle yang mengisinya.
- Jangan dihapus dan jangan di-gitignore.
- Harus ikut di-commit.

## Kapan `meta/` berubah?

| Kejadian | Efek ke `meta/` |
|----------|-----------------|
| `db:generate` dengan ada perubahan schema | `_journal.json` bertambah, muncul snapshot baru |
| `db:generate` tanpa perubahan | Tidak ada ("nothing to migrate") |
| `db:migrate` | Tidak berubah |
| Menambah / mengubah data | Tidak berubah |

## Dua tahap yang berbeda

**`db:generate`** (belum menyentuh database)
- Ada beda antara schema dan `meta`: dibuat file `.sql` baru.
- Tidak ada beda: tidak membuat apa-apa.

**`db:migrate`** (mengubah database)
1. Membaca `_journal.json` untuk daftar dan urutan migrasi.
2. Mengecek tabel `drizzle.__drizzle_migrations` di database untuk melihat mana yang sudah jalan.
3. Menjalankan hanya file `.sql` yang belum tercatat, berurutan, lalu mencatatnya.

`db:migrate` **tidak** membandingkan struktur tabel di database dengan schema. Ia hanya tahu migrasi nomor sekian sudah jalan atau belum.

## Struktur vs data

- **Struktur** (tabel, kolom, index, constraint): selalu lewat migrasi. Jangan ubah langsung di Neon SQL console, karena drizzle tidak akan tahu.
- **Data** (insert, update, delete): tidak perlu migrasi. Bisa lewat aplikasi, `db:studio`, atau script seperti `pnpm seed-user`.
- Kalau data awal ingin ikut tercatat sebagai migrasi: `pnpm drizzle-kit generate --custom --name=seed_roles`, lalu isi file `.sql` kosong yang terbentuk dengan `INSERT`.

## `drizzle-kit push` (hanya untuk dev)

```
pnpm drizzle-kit push
```

Membandingkan schema langsung dengan database dan mengubahnya saat itu juga. Tidak ada file `.sql` dan tidak ada `meta/`. Cepat untuk eksperimen, tapi tidak ada riwayat di git, tidak bisa diulang persis di environment lain, dan perubahan berbahaya (misalnya hapus kolom) langsung kena data. Jangan dipakai untuk production.

## Contoh: menambah tabel `DATA_Projects`

1. Tambah di `db/schema/data.ts`:

   ```ts
   import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
   import { auditColumns } from "./_columns";

   export const dataProjects = pgTable("DATA_Projects", {
     Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
     Name: varchar("Name", { length: 150 }).notNull(),
     ...auditColumns,
   });
   ```

2. `pnpm db:generate`
3. `pnpm db:migrate`
