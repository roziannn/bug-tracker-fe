# Environment

Menu: **Settings → Environment** (`/settings/environment`)

Mengelola environment variable (Label, Key, Value, Secret) untuk tiap environment. Datanya tersimpan di tabel `CORE_Env` di database.

## Fitur

- Pilih environment di dropdown. **Development**, **Staging**, dan **Production** selalu ada di daftar, ditambah environment lain yang sudah punya variable di database.
- Tambah, edit, dan hapus variable. Hapus meminta konfirmasi.
- Variable **Secret** nilainya disembunyikan (`••••••••`). Klik ikon mata untuk melihatnya.
- **Copy .env** menyalin seluruh variable environment yang dipilih dalam format `KEY=value`.
- **Add Environment** menambah nama environment baru.
- Kolom **Created by** (kosong tampil "System") dan **Created date**, serta skeleton saat data dimuat.

## Tabel `CORE_Env`

Didefinisikan di [db/schema/core.ts](../db/schema/core.ts).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `Id` | integer, identity | primary key |
| `Environment` | varchar(50) | nama environment |
| `Label` | varchar(100) | nama tampilan, kalau kosong diisi sama dengan Key |
| `Key` | varchar(100) | nama variable, huruf besar/angka/underscore, diawali huruf |
| `Value` | text | isi variable |
| `IsSecret` | boolean | true berarti nilainya disembunyikan |
| `IsActive`, `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate` | | kolom audit standar |

Pasangan `Environment` dan `Key` unik.

## Aturan

- **Key otomatis huruf besar** dan harus cocok dengan `^[A-Z][A-Z0-9_]*$`.
- **Nama environment tidak membedakan huruf besar/kecil.** Kalau `Staging` sudah ada, menambah variable ke `staging` dipakai ke `Staging`.
- **Environment tanpa variable tidak tersimpan.** Environment baru dari Add Environment hanya ada di halaman sampai variable pertamanya disimpan. Setelah halaman dimuat ulang, environment kosong yang bukan Development, Staging, atau Production hilang.
- **Environment tidak punya status** (Active, Synced, Protected) seperti di versi sebelumnya, karena tidak ada tempat menyimpannya di `CORE_Env`.
- Nama environment tidak bisa diubah atau dihapus. Untuk memindahkan variable, tambahkan di environment tujuan lalu hapus yang lama.

## Variable secret

Nilai variable secret **tidak ikut terkirim** saat daftar dimuat. Browser baru menerimanya saat:

- ikon mata ditekan (`GET /api/env/:id/value`), atau
- **Copy .env** ditekan (`GET /api/env/export`).

Saat mengedit variable secret, kolom Value kosong dan berarti **nilai lama dipertahankan**. Isi hanya kalau ingin menggantinya.

Nilai disimpan sebagai **teks biasa** di database. Siapa pun yang bisa membaca database atau memanggil API ini bisa melihat semua secret. Jangan simpan secret production di sini kecuali sudah ada enkripsi atau pembatasan akses per role.

## API

Semua endpoint butuh login.

| Method | URL | Fungsi |
|--------|-----|--------|
| `GET` | `/api/env` | semua variable (nilai secret `null`) |
| `POST` | `/api/env` | tambah variable |
| `GET` | `/api/env/:id` | satu variable (nilai secret `null`) |
| `PUT` | `/api/env/:id` | ubah variable |
| `DELETE` | `/api/env/:id` | hapus variable |
| `GET` | `/api/env/:id/value` | nilai asli satu variable |
| `GET` | `/api/env/export?environment=Staging` | isi `.env` satu environment |
| `GET` | `/api/env/environments` | nama environment saja (Development, Staging, Production, ditambah yang ada di tabel). Dipakai form Create Project |

Body `POST`:

```json
{ "environment": "Staging", "label": "JWT Secret", "key": "JWT_SECRET", "value": "...", "isSecret": true }
```

Body `PUT` sama tanpa `environment`. Kalau `value` tidak dikirim, nilai lama dipertahankan.

Error:

| Status | Penyebab |
|--------|----------|
| 400 | key tidak valid, environment kosong, atau id tidak valid |
| 404 | variable tidak ditemukan |
| 409 | key sudah ada di environment itu |
| 401 | belum login |

## Letak kode

| File | Isi |
|------|-----|
| [db/schema/core.ts](../db/schema/core.ts) | tabel `CORE_Env` |
| [repositories/env.repository.ts](../repositories/env.repository.ts) | query dan aturan (penyamaan nama environment, key kembar) |
| [lib/validation.ts](../lib/validation.ts) | `createEnvVarSchema`, `updateEnvVarSchema` |
| [app/api/env/](../app/api/env) | route API |
| [features/settings/components/environment-settings-page.tsx](../features/settings/components/environment-settings-page.tsx) | halaman |
