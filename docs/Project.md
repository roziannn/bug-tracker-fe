# Project

Halaman **Create Project** (`/projects/create`) menyimpan project baru ke database, lengkap dengan timeline, repository, tag, dan URL per environment.

## Yang disimpan

| Isian di form | Disimpan di |
|---------------|-------------|
| Project name, Owner, Description, Go Live date | `DATA_Projects` |
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

## Setelah menekan Create project

Project disimpan, muncul notifikasi "Project created", dan form dikosongkan supaya bisa langsung membuat project berikutnya. Tombol Save draft sudah dihapus.

Halaman **Projects** (daftar) dan halaman detail project **belum membaca tabel ini**. Keduanya masih memakai data contoh, jadi project yang baru dibuat belum tampil di sana.

## API

Semua endpoint butuh login.

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/projects` | daftar project (nama, owner, tag, jumlah phase, Go Live) |
| `POST` | `/api/projects` | buat project |
| `GET` | `/api/projects/:id` | detail lengkap, `:id` adalah `NewId` (GUID) |

Body `POST`:

```json
{
  "name": "Analytics Console",
  "ownerId": 1,
  "description": "Internal analytics",
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
| [features/projects/components/create-project-page.tsx](../features/projects/components/create-project-page.tsx) | form |
| [features/projects/components/project-gantt.tsx](../features/projects/components/project-gantt.tsx) | Gantt chart timeline |
