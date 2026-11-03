# Folder `meta/` di Drizzle

Lokasi: `db/migrations/meta/`

Folder ini dibuat dan diisi otomatis oleh `drizzle-kit`. Tugasnya satu: **menyimpan ingatan drizzle-kit tentang kondisi schema setelah migrasi terakhir**, supaya `db:generate` tahu apa yang berubah tanpa perlu membaca database.

## Isi folder

```
db/migrations/
  0000_lonely_blur.sql        daftar kerjaan (SQL) untuk migrasi 0
  meta/
    _journal.json             daftar urutan migrasi
    0000_snapshot.json        kondisi schema setelah migrasi 0
```

Setiap migrasi baru menambah satu file `.sql` dan satu snapshot, misalnya `0001_xxx.sql` dan `0001_snapshot.json`.

## `_journal.json`

Daftar urutan migrasi. Contoh isi proyek ini:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    { "idx": 0, "version": "7", "when": 1793188169341, "tag": "0000_lonely_blur", "breakpoints": true }
  ]
}
```

| Field | Arti |
|-------|------|
| `idx` | nomor urut migrasi |
| `tag` | nama file `.sql` (tanpa ekstensi) yang harus dijalankan |
| `when` | waktu migrasi dibuat (timestamp) |
| `breakpoints` | memisahkan statement SQL satu per satu saat dijalankan |

**Dipakai oleh:** `db:migrate`. Ia membaca file ini untuk tahu file `.sql` mana yang ada dan urutannya.

## `NNNN_snapshot.json`

Gambaran lengkap seluruh schema (tabel, kolom, tipe, default, primary key, index, foreign key) **setelah** migrasi tersebut dijalankan. Potongan dari `0000_snapshot.json`:

```json
{
  "id": "f34d...",
  "prevId": "00000000-0000-0000-0000-000000000000",
  "tables": {
    "public.CORE_Role": {
      "columns": {
        "Name": { "type": "varchar(100)", "notNull": true }
      }
    }
  }
}
```

| Field | Arti |
|-------|------|
| `id` | ID snapshot ini |
| `prevId` | ID snapshot sebelumnya (migrasi pertama berisi nol semua) |
| `tables` | seluruh tabel beserta kolomnya |

**Dipakai oleh:** `db:generate`. Ia membandingkan schema TypeScript dengan snapshot **terakhir**, lalu selisihnya ditulis jadi file `.sql` baru.

## Analogi

Renovasi rumah dengan tukang yang tidak boleh masuk rumah. Tukang diberi dua kertas:

- **Kertas lama** (`snapshot.json`): denah sebelum renovasi.
- **Kertas baru** (schema TypeScript): denah yang diinginkan.

Tukang membandingkan keduanya dan menulis daftar kerjaan (`.sql`). Setelah selesai, denah baru disimpan jadi kertas lama untuk renovasi berikutnya. `_journal.json` hanyalah buku catatan urutan renovasi.

## Kapan `meta/` berubah?

| Kejadian | Efek |
|----------|------|
| `pnpm db:generate` dengan ada perubahan schema | `_journal.json` bertambah satu entri, muncul snapshot baru |
| `pnpm db:generate` tanpa perubahan | tidak ada ("nothing to migrate") |
| `pnpm db:migrate` | tidak berubah |
| menambah / mengubah **data** (insert, update, delete) | tidak berubah |
| `pnpm drizzle-kit push` | tidak berubah, dan tidak membuat file apa pun |

## Aturan

- **Jangan diedit manual.** Drizzle yang mengisinya.
- **Jangan dihapus.** Tanpa snapshot, `db:generate` menganggap semua tabel baru dan menulis ulang `CREATE TABLE`, yang error di database yang tabelnya sudah ada. Tanpa journal, `db:migrate` tidak tahu file mana yang dijalankan.
- **Jangan di-gitignore.** Harus ikut di-commit bersama file `.sql`. Kalau teman satu tim tidak punya snapshot terbaru, `generate` di komputernya menghasilkan diff yang salah.

## Hubungan dengan database

`meta/` hanya ada di folder proyek (git). Riwayat migrasi yang **sudah dijalankan** dicatat terpisah di database, di tabel `drizzle.__drizzle_migrations`.

| Tempat | Menyimpan | Dipakai saat |
|--------|-----------|--------------|
| `meta/` (git) | kondisi schema & urutan migrasi | `db:generate`, `db:migrate` |
| `drizzle.__drizzle_migrations` (database) | migrasi mana yang sudah jalan | `db:migrate` |

`db:migrate` menjalankan file di journal yang belum tercatat di tabel tersebut.

## Kalau terjadi masalah

| Gejala | Kemungkinan penyebab | Solusi |
|--------|----------------------|--------|
| `generate` membuat ulang `CREATE TABLE` untuk tabel yang sudah ada | snapshot hilang atau tidak ikut ter-pull | ambil kembali `meta/` dari git |
| `migrate` tidak menjalankan apa-apa padahal ada file `.sql` baru | file `.sql` tidak terdaftar di `_journal.json` (dibuat manual) | jangan buat file `.sql` manual, selalu lewat `db:generate` (atau `generate --custom` untuk SQL sendiri) |
| konflik git di `meta/` saat merge | dua orang membuat migrasi di waktu bersamaan | gabungkan perubahan schema, hapus migrasi yang konflik, lalu `db:generate` ulang |
