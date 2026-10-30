# Menu

Menu: **Settings → Menu** (`/settings/menu`)

CRUD untuk menu sidebar, tersimpan di database. Menu ini juga menjadi daftar menu dan button yang diatur di halaman **Configure access** milik tiap role.

## Fitur

- Tambah, edit, dan hapus menu.
- Sub menu (dua tingkat): pilih **Parent** saat menambah atau mengedit.
- Button / function per menu (contoh: Create issue, Export).
- Ubah urutan dengan tombol naik dan turun, per grup (menu utama atau sub menu dalam satu parent).
- Switch **Visible** untuk menampilkan atau menyembunyikan menu.
- Kolom **Created by** dan **Created date**. Kalau kosong, Created by tampil "System".
- Skeleton saat data dimuat. Tidak ada pagination, semua menu tampil dan halaman discroll.

## Tabel

Didefinisikan di [db/schema/core.ts](../db/schema/core.ts).

### `CORE_Menu`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `Code` | varchar(150) | unik, id teks yang dipakai role access (contoh `issues`). Dibuat otomatis dari nama |
| `Name` | varchar(100) | nama menu |
| `Path` | varchar(255) | URL, contoh `/issues` |
| `Icon` | varchar(50) | nama ikon, contoh `Gauge` |
| `ParentId` | integer, nullable | menu induk. Kosong berarti menu utama. Hapus parent ikut menghapus sub menunya |
| `Sequence` | integer | urutan di dalam grupnya |
| `IsVisible` | boolean | tampil atau sembunyi |
| `IsActive`, `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate` | | kolom audit standar |

### `CORE_MenuAction`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `MenuId` | integer | menu pemilik. Hapus menu ikut menghapus button-nya |
| `Code` | varchar(200) | unik, contoh `issues.create` |
| `Name` | varchar(100) | nama button |
| kolom audit | | sama seperti di atas |

## Aturan

- **Code dibuat otomatis** dari nama (huruf kecil, spasi jadi `-`). Kalau sudah dipakai, ditambah angka (`reports`, `reports-2`). Code tidak berubah walau nama menu diubah, supaya akses role yang sudah diatur tidak putus.
- **Hanya dua tingkat.** Parent harus menu utama. Menu yang sudah punya sub menu tidak bisa dijadikan sub menu.
- Pindah parent berarti menu masuk ke urutan paling bawah di grup barunya.
- Saat edit, button yang tidak ada lagi di daftar akan dihapus, dan button yang sudah ada hanya diganti namanya (Code tetap).
- Hapus menu meminta konfirmasi, karena sub menu dan button-nya ikut terhapus.

## API

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/menus` | semua menu, urut per grup |
| `POST` | `/api/menus` | tambah menu |
| `GET` | `/api/menus/:code` | satu menu |
| `PUT` | `/api/menus/:code` | ubah menu beserta daftar button-nya |
| `PATCH` | `/api/menus/:code` | ubah tampil/sembunyi |
| `DELETE` | `/api/menus/:code` | hapus menu (beserta sub menu dan button) |
| `POST` | `/api/menus/:code/move` | geser urutan |

Body `POST` dan `PUT`:

```json
{
  "label": "Reports",
  "path": "/reports",
  "icon": "Gauge",
  "parentId": null,
  "actions": [{ "label": "Export" }, { "id": "reports.print", "label": "Print" }]
}
```

- `parentId` berisi `Code` parent, atau `null` untuk menu utama.
- Di `actions`, isi `id` untuk button yang sudah ada. Tanpa `id` berarti button baru.

Body `PATCH`: `{ "visible": false }`. Body `move`: `{ "direction": -1 }` (naik) atau `{ "direction": 1 }` (turun).

Error:

| Status | Penyebab |
|--------|----------|
| 400 | nama kosong, parent tidak ditemukan, atau parent tidak valid |
| 404 | menu tidak ditemukan |
| 500 | kesalahan server |

## Memuat menu bawaan

Tabel baru kosong. Untuk mengisi dengan menu bawaan (Overview, All Issues, Kanban, Teams, Projects, Audit Trail, Settings beserta button-nya):

```
pnpm seed-menu
```

Aman dijalankan berulang. Menu yang `Code`-nya sudah ada dilewati.

## Hubungan dengan Role

Halaman [Role](Role.md) dan **Configure access** membaca daftar menu dan button dari `/api/menus`. Akses per role masih disimpan di `localStorage` dengan acuan `Code` menu dan button. Karena itu `Code` sengaja tidak berubah saat nama diganti.

Kalau menu atau button dihapus, akses lama yang menunjuk ke `Code` itu diabaikan dan tidak dihitung.

## Letak kode

| File | Isi |
|------|-----|
| [db/schema/core.ts](../db/schema/core.ts) | tabel `CORE_Menu`, `CORE_MenuAction` |
| [repositories/menu.repository.ts](../repositories/menu.repository.ts) | query, transaksi, aturan parent dan urutan |
| [lib/validation.ts](../lib/validation.ts) | `menuSchema`, `menuVisibleSchema`, `menuMoveSchema` |
| [app/api/menus/](../app/api/menus) | route API |
| [features/settings/components/menu-settings-page.tsx](../features/settings/components/menu-settings-page.tsx) | halaman |
| [features/settings/data/menu-store.ts](../features/settings/data/menu-store.ts) | `fetchMenus`, `orderMenus` |
| [components/ui/table-skeleton.tsx](../components/ui/table-skeleton.tsx) | skeleton tabel |
| [scripts/seed-menu.ts](../scripts/seed-menu.ts) | seed menu bawaan |

## Belum dilakukan

Sidebar aplikasi belum membaca tabel ini. Menu di sidebar masih tetap, jadi mengubah menu di sini belum mengubah tampilan sidebar.
