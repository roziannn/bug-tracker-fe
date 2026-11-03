# Categories

Menu: **Settings → Categories**, lalu pilih salah satu: Teams Domain, Project Status, Issue Status, Issue Priority, atau Audit Trail Outcome. Halamannya `/settings/category/<slug>`.

Mengelola nilai-nilai yang bisa dipilih di tiap kategori, misalnya **Success**, **Warning**, dan **Blocked** untuk Audit Trail Outcome. Datanya tersimpan di tabel `CORE_Category`.

## Fitur

- Tambah, edit, dan hapus nilai. Hapus meminta konfirmasi.
- Switch **Active** untuk menonaktifkan nilai tanpa menghapusnya.
- Kolom **Created by** (kosong tampil "System") dan **Created date**.
- Skeleton saat data dimuat. Tidak ada pagination.

## Tabel `CORE_Category`

Didefinisikan di [db/schema/core.ts](../db/schema/core.ts). Satu nilai satu baris.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `CategoryName` | varchar(100) | nama kategori, contoh `Audit Trail Outcome` |
| `Name` | varchar(100) | salah satu nilainya, contoh `Success` |
| `Description` | varchar(255) | keterangan, boleh kosong |
| `IsActive` | boolean | false berarti nilai tidak dipakai lagi |
| `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate` | | kolom audit standar |

Contoh isi:

| CategoryName | Name | Description |
|--------------|------|-------------|
| Audit Trail Outcome | Success | The activity was carried out. |
| Audit Trail Outcome | Warning | Succeeded, but needs attention. |
| Audit Trail Outcome | Blocked | The activity was rejected or blocked. |
| Issue Priority | Critical | |
| Issue Priority | High | |

Pasangan `CategoryName` dan `Name` unik.

## Daftar kategori ada di kode

Kategori apa saja yang ada (slug, judul, deskripsi) didefinisikan di [features/settings/data/category-store.ts](../features/settings/data/category-store.ts), bukan di database, karena terkait langsung dengan route dan sidebar. `title` di file itu yang disimpan ke kolom `CategoryName`.

| Slug | CategoryName |
|------|--------------|
| `teams-domain` | Teams Domain |
| `project-status` | Project Status |
| `issue-status` | Issue Status |
| `issue-priority` | Issue Priority |
| `audit-trail-outcome` | Audit Trail Outcome |

Untuk menambah kategori baru: tambahkan satu entri di `categoryConfigs`, lalu tambahkan menunya di Settings → Menu dengan path `/settings/category/<slug>`. Tidak perlu migrasi, karena tabelnya sama.

**Mengubah `title` kategori** membuat baris lama di database tidak ikut berubah (masih memakai `CategoryName` lama). Kalau perlu, perbarui barisnya: `UPDATE "CORE_Category" SET "CategoryName" = 'Judul Baru' WHERE "CategoryName" = 'Judul Lama'`.

## Aturan

- Nama tidak boleh kembar **dalam satu kategori**, tanpa membedakan huruf besar/kecil. Nama yang sama boleh ada di kategori lain.
- Nilai dihapus permanen. Untuk berhenti memakainya tapi tetap menyimpannya, nonaktifkan lewat switch **Active**.
- Halaman lain (audit trail, issues, projects, teams) **belum membaca tabel ini**. Pilihan di sana masih tetap dari kode.

## Memuat nilai awal

Tabel baru kosong. Untuk mengisi dengan nilai awal semua kategori (18 baris):

```
pnpm seed-category
```

Aman dijalankan berulang. Nilai yang sudah ada dilewati.

## API

Semua endpoint butuh login.

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/categories?category=<slug>` | semua nilai satu kategori |
| `POST` | `/api/categories` | tambah nilai |
| `GET` | `/api/categories/:id` | satu nilai |
| `PUT` | `/api/categories/:id` | ubah nama dan deskripsi |
| `PATCH` | `/api/categories/:id` | aktifkan / nonaktifkan |
| `DELETE` | `/api/categories/:id` | hapus |

Body `POST`:

```json
{ "category": "audit-trail-outcome", "name": "Pending", "description": "Waiting for approval" }
```

Body `PUT`: `{ "name": "...", "description": "..." }`. Body `PATCH`: `{ "isActive": false }`.

Error:

| Status | Penyebab |
|--------|----------|
| 400 | kategori tidak dikenal, nama kosong atau terlalu panjang, id tidak valid |
| 404 | nilai tidak ditemukan |
| 409 | nama sudah ada di kategori itu |
| 401 | belum login |

## Letak kode

| File | Isi |
|------|-----|
| [db/schema/core.ts](../db/schema/core.ts) | tabel `CORE_Category` |
| [repositories/category.repository.ts](../repositories/category.repository.ts) | query dan pengecekan nama kembar |
| [lib/validation.ts](../lib/validation.ts) | `categorySchema`, `categoryActiveSchema` |
| [app/api/categories/](../app/api/categories) | route API |
| [features/settings/components/category-settings-page.tsx](../features/settings/components/category-settings-page.tsx) | halaman |
| [features/settings/data/category-store.ts](../features/settings/data/category-store.ts) | daftar kategori dan nilai awal |
| [scripts/seed-category.ts](../scripts/seed-category.ts) | seed nilai awal |
