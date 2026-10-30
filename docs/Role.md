# Role

Menu: **Settings → Role** (`/settings/role`)

Fitur untuk mengelola role (tambah dan edit) yang tersimpan di tabel `CORE_Role` di Neon. Pengaturan akses menu/button per role ada di halaman terpisah (**Configure access**).

## Ringkasan

| Bagian | Disimpan di | Status |
|--------|-------------|--------|
| Daftar role (nama, aktif/nonaktif) | Database (`CORE_Role`) | Sudah ke database |
| Akses menu & button per role | `localStorage` browser | Belum ke database |

## Tabel `CORE_Role`

Didefinisikan di [db/schema/core.ts](../db/schema/core.ts).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key, otomatis naik |
| `NewId` | uuid | otomatis (`gen_random_uuid()`), unik |
| `Name` | varchar(100) | nama role, unik |
| `IsActive` | boolean | default `true` |
| `CreatedBy` | varchar(100) | email user yang membuat |
| `CreatedDate` | timestamp | otomatis saat dibuat |
| `UpdatedBy` | varchar(100) | email user yang terakhir mengubah |
| `UpdatedDate` | timestamp | otomatis saat diubah |

Tidak ada hapus (delete). Role yang tidak dipakai cukup dinonaktifkan lewat switch **Aktif**.

## Halaman Role

File: [features/settings/components/role-settings-page.tsx](../features/settings/components/role-settings-page.tsx)

- **Tabel:** kolom Role, Menus, Buttons, Created by, Created date, Action. Role nonaktif tampil redup dengan badge "Inactive".
- **Pagination:** dari server, 5 role per halaman.
- **Add Role:** membuka dialog berisi nama role dan switch Aktif.
- **Ikon pensil:** membuka dialog yang sama untuk mengedit nama dan status aktif.
- **Configure access:** membuka `/settings/role/<nama role>`.
- **Notifikasi:** toast sukses atau error setelah menyimpan.

Kolom **Menus** dan **Buttons** menunjukkan jumlah akses yang aktif dibanding total, dibaca dari `localStorage`. Role yang belum pernah diatur dihitung punya menu `overview` saja dan 0 button.

## API

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/roles?page=1&pageSize=5&search=` | daftar role dengan paging dan pencarian nama |
| `GET` | `/api/roles/:id` | satu role |
| `POST` | `/api/roles` | tambah role |
| `PUT` | `/api/roles/:id` | ubah nama dan/atau status aktif |

Body `POST` dan `PUT`:

```json
{ "name": "Product Manager", "isActive": true }
```

`isActive` boleh dikosongkan. Saat tambah, default `true`. Saat ubah, nilai lama dipertahankan.

Respons error:

| Status | Penyebab | Pesan |
|--------|----------|-------|
| 400 | nama kosong, lebih dari 100 karakter, atau id tidak valid | "Role name is required" / "Role name must be at most 100 characters" / "Invalid id" |
| 404 | role tidak ditemukan (`PUT`/`GET` by id) | "Role not found" |
| 409 | nama sudah dipakai role lain | "Role name is already in use" |
| 500 | kesalahan server | "Internal server error" |

Nama dicek kembar **tanpa membedakan huruf besar/kecil**: "Admin" dan "admin" dianggap sama. Karakter seperti `_` dan `%` diperlakukan biasa, jadi "QA_Lead" dan "QA-Lead" boleh ada bersamaan.

`CreatedBy` diisi dari email di sesi login. Kalau belum login, diisi `System`. Role lama yang `CreatedBy`-nya `null` tetap tampil sebagai "System" di tabel. `UpdatedBy` diisi email login, atau `null` kalau belum login.

## Letak kode

| File | Isi |
|------|-----|
| [db/schema/core.ts](../db/schema/core.ts) | definisi tabel `CORE_Role` |
| [repositories/role.repository.ts](../repositories/role.repository.ts) | `getRoles`, `getRoleById`, `createRole`, `updateRole` |
| [lib/validation.ts](../lib/validation.ts) | `roleSchema` (validasi nama dan `isActive`) |
| [app/api/roles/route.ts](../app/api/roles/route.ts) | `GET` daftar, `POST` tambah |
| [app/api/roles/[id]/route.ts](../app/api/roles/%5Bid%5D/route.ts) | `GET` satu, `PUT` ubah |
| [features/settings/components/role-settings-page.tsx](../features/settings/components/role-settings-page.tsx) | halaman daftar, dialog tambah/edit |
| [features/settings/components/role-access-page.tsx](../features/settings/components/role-access-page.tsx) | halaman Configure access |
| [features/settings/data/role-access-store.ts](../features/settings/data/role-access-store.ts) | penyimpanan akses di `localStorage` |

## Configure access

Halaman `/settings/role/<nama role>` mengatur menu mana yang tampil dan button mana yang boleh dipakai role tersebut.

- Saat dibuka, halaman mengecek ke `/api/roles` apakah role dengan nama itu ada di database. Kalau tidak ada, muncul "Role tidak ditemukan".
- Pengaturannya disimpan di `localStorage` dengan key `bug-tracker:role-access`, dikaitkan lewat **nama role**.
- Saat nama role diubah di halaman Role, entri akses ikut dipindahkan ke nama baru, tapi hanya di browser yang dipakai untuk mengedit.

### Keterbatasan saat ini

- Akses hanya ada di browser yang mengaturnya. Browser atau komputer lain tidak melihatnya, dan data hilang kalau storage dibersihkan.
- Role dari database yang belum pernah diatur dimulai dengan menu `overview` saja.
- Role default lama (Admin, Lead, Engineer, QA) hanya bawaan front-end, **tidak** ada di database. Tambahkan lewat Add Role kalau masih dibutuhkan.
- Akses belum dipakai untuk membatasi apa pun di aplikasi. Saat ini hanya tampilan pengaturan.

Langkah berikutnya yang masuk akal adalah memindahkan akses ke database (tabel baru, misalnya `CORE_RoleAccess`, lewat migrasi) supaya bisa dibaca saat login dan dipakai untuk membatasi menu.

## Cek data dari terminal

```
pnpm db:query "SELECT [Id], [Name], [IsActive] FROM CORE_Role"
```

## Menambah kolom baru ke role

1. Tambah kolom di `coreRole` pada [db/schema/core.ts](../db/schema/core.ts).
2. `pnpm db:generate`
3. `pnpm db:migrate`
4. Tambah di `COLUMNS` dan query `createRole`/`updateRole` di repository, `roleSchema` di validasi, tipe `Role` di [types/index.ts](../types/index.ts), lalu form di halaman Role.

Detail alur migrasi ada di [Drizzle migration.md](Drizzle%20migration.md).
