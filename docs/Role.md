# Role

Menu: **Settings → Role** (`/settings/role`)

Fitur untuk mengelola role (tambah dan edit) yang tersimpan di tabel `CORE_Role` di Neon. Pengaturan akses menu/button per role ada di halaman terpisah (**Configure access**).

## Ringkasan

| Bagian | Disimpan di | Status |
|--------|-------------|--------|
| Daftar role (nama, aktif/nonaktif) | Database (`CORE_Role`) | Sudah ke database |
| Akses menu & button per role | Database (`CORE_RoleMenu`, `CORE_RoleMenuAction`) | Sudah ke database, dipakai untuk sidebar. Lihat [Sidebar](Sidebar.md) |

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

Kolom **Menus** dan **Buttons** menunjukkan jumlah menu dan button yang diizinkan dibanding total, dihitung dari database. Role yang belum pernah diatur menunjukkan 0.

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
| [repositories/access.repository.ts](../repositories/access.repository.ts) | baca dan simpan izin role |
| [app/api/roles/[id]/access/route.ts](../app/api/roles/%5Bid%5D/access/route.ts) | API izin role |

## Configure access

Halaman `/settings/role/<nama role>` mengatur menu mana yang boleh dilihat dan button mana yang boleh dipakai role tersebut.

- Saat dibuka, halaman mencari role di database dan memuat izinnya. Kalau role tidak ada, muncul "Role ... not found".
- Centang **Menu Access** untuk mengizinkan sebuah menu. Button (function) di menu itu baru bisa dicentang setelah menunya diizinkan.
- Tombol **Save changes** menyimpan ke database. Kalau yang diubah adalah role milik user yang sedang login, sidebar-nya langsung ikut berubah.
- Izin terikat ke **id role**, jadi mengganti nama role tidak memutus izinnya.

### API izin

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/roles/:id/access` | daftar `Code` menu dan button yang diizinkan |
| `PUT` | `/api/roles/:id/access` | mengganti seluruh izin role |

Body `PUT`:

```json
{ "menus": ["all-issues", "settings"], "actions": ["all-issues.add"] }
```

`Code` yang tidak dikenal diabaikan. Button hanya disimpan kalau menu pemiliknya ikut diizinkan.

### Memberi akses penuh

```
pnpm seed-access "Administrator"
```

Memberi satu role akses ke semua menu dan semua button. Berguna untuk admin pertama, atau kalau admin tidak sengaja mencabut aksesnya sendiri. Tanpa argumen, role yang dipakai adalah "Administrator".

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
