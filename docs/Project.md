# Project

Halaman project semuanya memakai database:

| Halaman | Fungsi |
|---------|--------|
| **Projects** (`/projects`) | daftar project dengan pencarian, filter, dan export CSV |
| **Create Project** (`/projects/create`) | membuat project baru, lengkap dengan timeline, repository, tag, dan URL per environment |
| **Project Detail** (`/projects/<id>`) | detail satu project, termasuk Gantt chart timeline-nya |
| **Edit Project** (`/projects/<id>/edit`) | mengubah data project yang sudah ada |

## Yang disimpan

| Isian di form | Disimpan di |
|---------------|-------------|
| Project name, Owner, Description, Priority, Go Live date | `DATA_Projects` |
| Timeline (phase dengan tanggal mulai dan selesai) | `DATA_ProjectPhases` |
| Tags (nilai Teams Domain) | `DATA_ProjectTags` |
| Repositories | `DATA_ProjectRepositories` |
| Environment URLs | `DATA_ProjectEnvironments` |

Semua disimpan dalam **satu transaksi**: kalau satu bagian gagal, tidak ada yang tersimpan setengah jadi.

## Tabel

Didefinisikan di [db/schema/data.ts](../db/schema/data.ts). Nama tabel berawalan `DATA_` karena ini data transaksi, bukan master/settings.

### `DATA_Projects`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `NewId` | uuid | ID bergaya GUID, otomatis, dipakai di URL dan API |
| `Name` | varchar(150) | nama project, unik |
| `OwnerId` | integer | user pemilik (`CORE_User.Id`) |
| `Description` | text | boleh kosong |
| `Priority` | varchar(10) | `Low`, `Medium`, atau `High`. Default `Medium` |
| `GoLiveDate` | date | boleh kosong |
| kolom audit | | `IsActive`, `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate` |

### Tabel anak

Semuanya punya `ProjectId` yang menunjuk ke `DATA_Projects`, dan ikut terhapus kalau project-nya dihapus (cascade). Semuanya juga punya kolom audit yang sama.

| Tabel | Kolom utama | Aturan |
|-------|-------------|--------|
| `DATA_ProjectPhases` | `Name`, `StartDate`, `EndDate`, `Sequence` | `Sequence` mengikuti urutan di form |
| `DATA_ProjectTags` | `CategoryId` (ke `CORE_Category`) | pasangan project + kategori unik |
| `DATA_ProjectRepositories` | `Url`, `Sequence` | |
| `DATA_ProjectEnvironments` | `Environment`, `Url` | pasangan project + environment unik |

## Aturan

- **Nama project unik**, tanpa membedakan huruf besar/kecil. Nama kembar ditolak dengan pesan di bawah field nama.
- **Owner** wajib, harus user yang aktif.
- **Tags** hanya boleh nilai kategori **Teams Domain**. Id dari kategori lain ditolak.
- **Phase**: nama wajib, tanggal harus valid (misalnya 30 Februari ditolak), dan tanggal selesai tidak boleh sebelum tanggal mulai. Maksimal 50 phase.
- **Repository**: isian kosong dibuang, dan repository yang sama (tanpa membedakan huruf besar/kecil) hanya disimpan sekali, memakai penulisan yang pertama.
- **Environment URL**: harus diawali `http://` atau `https://`. Environment yang URL-nya kosong tidak disimpan.
- **Go Live date** boleh kosong.
- **Priority** berisi tiga pilihan tetap: **Low**, **Medium**, atau **High**. Kalau tidak dipilih, nilainya **Medium** (project yang dibuat sebelum kolom ini ada juga otomatis Medium). Nilai lain ditolak. Daftar pilihannya ada di [features/projects/data/priorities.ts](../features/projects/data/priorities.ts), bukan di Settings → Categories, jadi tidak bisa diubah dari halaman settings.

## Setelah menekan Create project

Project disimpan, muncul notifikasi "Project created", lalu halaman pindah ke daftar **Projects** tempat project baru muncul paling atas. Tombol Save draft sudah dihapus.

## Halaman daftar (`/projects`)

- **Kartu ringkasan**, semuanya dihitung dari database:
  - **Tracked projects**: jumlah project.
  - **Upcoming go-lives**: project yang Go Live date-nya hari ini atau sesudahnya.
  - **In progress**: project yang punya phase yang sedang berjalan hari ini.
  - **Project owners**: jumlah owner yang berbeda.
- **Tabel**: kolom **Action** ada di paling depan berisi dua tombol, ikon mata (**Show**, membuka halaman detail) dan ikon pensil (**Edit**, membuka halaman edit). Setelah itu Project (nama), Current status, Priority (badge: High merah, Medium abu-abu, Low outline), Owner, Go Live, Timeline (rentang tanggal), Created by (kosong tampil "System"), dan Created date.
- **Pencarian** mencakup nama, deskripsi, owner, dan status saat ini. Ada filter **Owner** dan **Status**, serta **Export** CSV untuk hasil yang sedang difilter (kolom Priority, Current Status, dan Tags ikut di CSV).
- Terurut dari yang terbaru, 10 baris per halaman, dengan skeleton saat data dimuat.

### Current status

Kolom **Current status** dihitung dari phase timeline project dan tanggal **hari ini** (di browser), jadi berubah sendiri tanpa perlu diedit. Tanggal mulai dan tanggal selesai phase sama-sama dihitung masih berjalan.

| Kondisi hari ini | Yang tampil |
|------------------|-------------|
| Ada di dalam satu phase | nama phase itu, misalnya **Brainstorming** (badge biru) |
| Ada di dalam beberapa phase yang tumpang tindih | semua nama phase itu |
| Sebelum phase pertama dimulai | **Not started** |
| Di antara dua phase (ada jeda tanggal) | **Between phases** |
| Setelah phase terakhir selesai | **Completed** |
| Project belum punya phase | tanda hubung (-) |

Aturannya ada di [features/projects/data/current-status.ts](../features/projects/data/current-status.ts). Filter **Status** berisi nama phase dan label di atas yang sedang dipakai project mana pun.

Versi sebelumnya punya kolom **Status**, **Issues**, **Critical**, **Team**, dan **Next milestone**, plus kartu **Critical projects**, yang berasal dari data contoh di kode. Kolom dan kartu itu dihapus karena tidak ada sumbernya di database: data issue belum ada di database, dan status project kini dihitung dari timeline (lihat di atas). Menampilkan angka contoh akan berarti menampilkan angka palsu.

## Edit project (`/projects/<id>/edit`)

Dibuka dari ikon pensil di daftar, atau tombol **Edit** di halaman detail. Memakai form yang sama dengan Create Project, tetapi isiannya sudah terisi dari data project: nama, owner, tag, Go Live date, deskripsi, timeline (phase), repository, dan URL environment.

- Tombol **Save changes** menyimpan lewat `PUT /api/projects/<id>`, lalu kembali ke halaman detail project. **Cancel** juga kembali ke halaman detail.
- Semua isian bisa diubah: menambah, mengubah, atau menghapus phase, repository, dan URL environment. Yang dihapus di form ikut terhapus dari database.
- Aturan validasinya sama seperti saat membuat project. Nama project tidak boleh sama dengan project lain, tetapi boleh tetap memakai namanya sendiri.
- **Tag yang nilainya sudah dinonaktifkan** di Settings → Categories tetap tampil dan tercentang di form edit, supaya tidak hilang diam-diam saat disimpan. Owner yang akunnya sudah nonaktif juga tetap tampil sebagai pilihan.
- `UpdatedBy` dan `UpdatedDate` terisi saat disimpan. Penyimpanan berjalan dalam satu transaksi: kalau ada yang gagal, project tetap seperti sebelum diedit.
- ID project (GUID) tidak berubah.

## Halaman detail (`/projects/<id>`)

`<id>` adalah `NewId` (GUID) project. Isinya: nama, deskripsi, Project ID, Owner, Go Live date, pembuat dan tanggal dibuat, Tags (Tags tetap tampil di halaman ini), **Gantt chart** timeline, daftar Repositories, dan Environment URLs (bisa diklik).

Id lama dari data contoh (misalnya `3f2504e0-...`) tidak ada di database, jadi membukanya menampilkan "Project not found".

## API

Semua endpoint butuh login.

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/projects` | daftar project (nama, owner, tag, Go Live, jumlah phase, dan rentang tanggal timeline), terbaru dulu |
| `POST` | `/api/projects` | buat project |
| `GET` | `/api/projects/:id` | detail lengkap, `:id` adalah `NewId` (GUID) |
| `PUT` | `/api/projects/:id` | mengubah project. Isi body sama dengan `POST`. Phase, tag, repository, dan URL environment diganti sesuai kiriman, dan `priority` yang tidak dikirim kembali jadi `Medium` |

Body `POST`:

```json
{
  "name": "Analytics Console",
  "ownerId": 1,
  "description": "Internal analytics",
  "priority": "High",
  "goLiveDate": "2027-03-15",
  "tags": [3, 4],
  "repositories": ["github.com/company/analytics-console"],
  "environments": { "Development": "https://dev.example.com", "Production": "https://example.com" },
  "phases": [
    { "name": "Planning", "start": "2026-11-02", "end": "2026-11-20" },
    { "name": "Development", "start": "2026-11-21", "end": "2027-01-31" }
  ]
}
```

`tags` berisi `Id` dari `CORE_Category` (Teams Domain). Tanggal memakai format `YYYY-MM-DD`.

Error:

| Status | Penyebab |
|--------|----------|
| 400 | nama kosong, owner kosong atau tidak aktif, tanggal tidak valid, phase terbalik, URL environment salah, atau tag tidak valid |
| 404 | project tidak ditemukan atau `:id` bukan GUID |
| 409 | nama project sudah dipakai |
| 401 | belum login |

## Letak kode

| File | Isi |
|------|-----|
| [db/schema/data.ts](../db/schema/data.ts) | kelima tabel |
| [repositories/project.repository.ts](../repositories/project.repository.ts) | transaksi pembuatan, `getProjects`, `getProjectDetail` |
| [lib/validation.ts](../lib/validation.ts) | `createProjectSchema` |
| [app/api/projects/](../app/api/projects) | route API |
| [features/projects/components/projects-page.tsx](../features/projects/components/projects-page.tsx) | halaman daftar |
| [features/projects/components/project-detail-page.tsx](../features/projects/components/project-detail-page.tsx) | halaman detail |
| [features/projects/components/project-form-page.tsx](../features/projects/components/project-form-page.tsx) | form Create dan Edit (satu komponen) |
| [app/projects/[id]/edit/page.tsx](../app/projects/%5Bid%5D/edit/page.tsx) | route halaman edit |
| [lib/project-api.ts](../lib/project-api.ts) | pemetaan error repository ke respons API |
| [features/projects/data/priorities.ts](../features/projects/data/priorities.ts) | daftar prioritas (Low, Medium, High) |
| [features/projects/components/priority-badge.tsx](../features/projects/components/priority-badge.tsx) | badge prioritas |
| [features/projects/components/project-gantt.tsx](../features/projects/components/project-gantt.tsx) | Gantt chart timeline |
