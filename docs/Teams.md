# Teams

Halaman Teams memakai database. Ada tiga halaman:

| Halaman | Fungsi |
|---------|--------|
| **Teams** (`/teams`) | daftar group team: lead, jumlah anggota, status |
| **Manage Group Teams** (`/teams/groups`) | membuat, mengubah, dan mengaktifkan/menonaktifkan group team |
| **Add Members** (`/teams/<id>/members`) | menambah dan mengelola anggota sebuah group team |

## Konsep

- **Satu group team per Teams Domain.** Group team tidak punya nama sendiri: **domain-nya sekaligus menjadi namanya** (misalnya domain "Backend" berarti group team "Backend"). Domain berasal dari nilai kategori **Teams Domain** di Settings → Categories, jadi tidak ada lagi isian "Group name".
- **Lead** dipilih dari user lewat dropdown yang bisa dicari (nama atau email).
- **Status Active / Inactive** menggantikan SLA. Group yang nonaktif tetap tampil, redup dan berlabel Inactive.
- **Anggota** adalah user. Tiap anggota punya Role dan Access level.

## Tabel

Didefinisikan di [db/schema/core.ts](../db/schema/core.ts). Berawalan `CORE_` karena ini data master organisasi.

### `CORE_Team`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `NewId` | uuid | ID bergaya GUID, dipakai di URL dan API |
| `DomainId` | integer | nilai Teams Domain (`CORE_Category.Id`), **unik** |
| `LeadId` | integer | user yang menjadi lead (`CORE_User.Id`) |
| kolom audit | | `IsActive`, `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate` |

### `CORE_TeamMember`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `TeamId` | integer | group team (`CORE_Team.Id`), ikut terhapus kalau group-nya dihapus |
| `UserId` | integer | user yang menjadi anggota (`CORE_User.Id`) |
| `Role` | varchar(20) | `Admin`, `Lead`, `Engineer`, atau `QA`. Default `Engineer` |
| `AccessLevel` | varchar(20) | `member`, `lead`, atau `observer`. Default `member` |
| kolom audit | | sama seperti di atas |

Pasangan `TeamId` dan `UserId` unik: satu user hanya bisa jadi anggota satu kali di satu group.

## Aturan

- **Domain**: harus nilai Teams Domain yang aktif dan belum dipakai group lain. Saat mengedit, domain milik group itu sendiri tetap boleh walau sudah dinonaktifkan. Dropdown Domain hanya menawarkan domain yang masih bebas.
- **Lead**: harus user yang aktif. Lead yang akunnya kemudian dinonaktifkan tetap tampil di form edit.
- **Jumlah anggota** di daftar menghitung anggota yang **aktif** saja.
- **Anggota**: hanya user aktif yang bisa ditambahkan, dan yang sudah jadi anggota tidak ditawarkan lagi. Orangnya tidak bisa diganti saat edit, hanya Role, Access level, dan status aktif.
- **Lead tidak otomatis menjadi anggota.** Tambahkan lewat halaman Add Members kalau perlu.
- **Group tidak bisa dihapus**, hanya dinonaktifkan.
- **Nilai Teams Domain yang dipakai group tidak bisa dihapus** di Settings → Categories (muncul pesan bahwa nilai itu sedang dipakai). Nonaktifkan saja kalau tidak ingin dipakai lagi.

## Halaman

**Manage Group Teams**: daftar kartu, tiap kartu berisi domain (nama group), jumlah anggota, lead, status, pembuat dan tanggal dibuat. Tiap kartu punya switch aktif, ikon pensil untuk edit (Domain dan Lead), dan tombol **Add people**. Tombol **Create group** membuka dialog dengan dua isian, **Domain** dan **Lead**.

**Teams**: tabel Team, Lead, Members, Status, Created by (kosong tampil "System"), Created date, dan tombol **Add member**.

**Add Members**: tabel Name, Email, Team, Role, Access level, Created by, Created date, Active (switch), dan ikon edit. Dialog tambah berisi User (dropdown yang bisa dicari), Role, dan Access level.

Semua halaman memakai skeleton saat data dimuat.

### Yang dihapus dari versi sebelumnya

Kolom **SLA**, **Total Issues**, **High**, dan **Critical**, serta kartu **Squad issue focus**, dihapus. Semuanya berasal dari data contoh di kode (issue belum ada di database), jadi menampilkannya berarti menampilkan angka palsu. Pilihan domain lama (engineering, platform, operations) juga diganti dengan nilai Teams Domain yang sebenarnya.

## API

Semua endpoint butuh login. `:id` adalah `NewId` (GUID) group team.

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/teams` | semua group team (domain, lead, jumlah anggota aktif, status) |
| `POST` | `/api/teams` | buat group. Body `{ "domainId": 3, "leadId": 1 }` |
| `GET` | `/api/teams/:id` | satu group |
| `PUT` | `/api/teams/:id` | ubah domain dan lead |
| `PATCH` | `/api/teams/:id` | aktif / nonaktif. Body `{ "isActive": false }` |
| `GET` | `/api/teams/:id/members` | anggota sebuah group |
| `POST` | `/api/teams/:id/members` | tambah anggota. Body `{ "userId": 1, "role": "Engineer", "accessLevel": "member" }` |
| `PUT` | `/api/teams/:id/members/:memberId` | ubah role dan access level (`isActive` opsional) |
| `PATCH` | `/api/teams/:id/members/:memberId` | aktif / nonaktif anggota |

Error:

| Status | Penyebab |
|--------|----------|
| 400 | domain atau lead tidak valid, user tidak aktif, role atau access level salah |
| 404 | group atau anggota tidak ditemukan, atau `:id` bukan GUID |
| 409 | domain sudah punya group, atau user sudah jadi anggota |
| 401 | belum login |

## Letak kode

| File | Isi |
|------|-----|
| [db/schema/core.ts](../db/schema/core.ts) | tabel `CORE_Team` dan `CORE_TeamMember` |
| [repositories/team.repository.ts](../repositories/team.repository.ts) | query dan aturan group dan anggota |
| [lib/team-api.ts](../lib/team-api.ts) | pemetaan error repository ke respons API |
| [lib/validation.ts](../lib/validation.ts) | `teamSchema`, `createTeamMemberSchema`, `updateTeamMemberSchema` |
| [app/api/teams/](../app/api/teams) | route API |
| [features/teams/components/](../features/teams/components) | tiga halaman |
| [features/teams/data/team-options.ts](../features/teams/data/team-options.ts) | daftar Role dan Access level |
| [lib/request.ts](../lib/request.ts) | pemanggil API sisi browser |
