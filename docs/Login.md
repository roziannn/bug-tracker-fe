# Login

Halaman: `/login`. Autentikasi memakai email dan password dari tabel `CORE_User`, sesi disimpan di cookie JWT.

## Alur

1. User mengisi email dan password di `/login`, lalu `POST /api/auth/login`.
2. Server mencari user berdasarkan email (huruf besar/kecil tidak dibedakan), lalu mencocokkan password dengan hash bcrypt.
3. Kalau cocok, server membuat cookie `session` (JWT, `HttpOnly`, `SameSite=Lax`, `Secure` di production) berisi `userId`, `email`, `name`, dan `roleId`.
4. Halaman memuat ulang data user (nama dan email di sidebar), lalu masuk ke `/`.

`roleId` diambil dari `CORE_RoleClaim` (dicocokkan lewat email). User tanpa role tetap bisa login dengan `roleId` 0.

## Perlindungan halaman dan API

File [proxy.ts](../proxy.ts) memeriksa cookie `session` di setiap request:

| Request | Tanpa sesi valid | Dengan sesi valid |
|---------|------------------|-------------------|
| Halaman (misalnya `/settings/menu`) | diarahkan ke `/login` | tampil |
| API (misalnya `/api/menus`) | `401 {"error":"Unauthorized"}` | diproses |
| `/login` | tampil | diarahkan ke `/` |
| `/api/auth/login`, `/api/auth/logout` | diproses | diproses |

Cookie yang rusak atau kedaluwarsa dihapus otomatis. Aset statis (`_next`, `favicon.ico`, `icon`, gambar) tidak diperiksa.

## Lama sesi

- Sesi berlaku **10 menit** sejak dibuat atau diperbarui.
- Selama user aktif (mouse, keyboard, scroll), browser memanggil `POST /api/auth/refresh` paling sering sekali per menit untuk memperpanjang sesi. Logikanya di [hooks/use-idle-logout.ts](../hooks/use-idle-logout.ts).
- Tidak ada aktivitas 10 menit: user otomatis logout dan diarahkan ke `/login`.
- Di halaman `/login` pengecekan ini dimatikan, karena belum ada sesi.

## API

| Method | URL | Fungsi |
|--------|-----|--------|
| `POST` | `/api/auth/login` | login. Body `{ "email", "password" }` |
| `GET` | `/api/auth/me` | nama dan email user yang sedang login |
| `POST` | `/api/auth/refresh` | perpanjang sesi |
| `POST` | `/api/auth/logout` | hapus cookie sesi |

Error login:

| Status | Penyebab | Pesan |
|--------|----------|-------|
| 400 | format email salah atau password kosong | "Invalid email format" / "Password is required" |
| 401 | email tidak terdaftar atau password salah | "Invalid email or password" |
| 403 | akun nonaktif | "Your account is inactive, please contact an administrator" |

Email tidak terdaftar dan password salah sengaja memakai pesan yang sama supaya orang tidak bisa menebak email yang terdaftar.

## Pengaturan

`.env` harus punya:

```
DATABASE_URL=...
JWT_SECRET=<teks acak panjang>
```

Tanpa `JWT_SECRET`, semua sesi dianggap tidak valid dan login tidak akan berhasil. Setelah mengubah `.env`, restart `pnpm dev`. Untuk membuat nilai acak:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Di production, pakai `JWT_SECRET` yang berbeda dari development.

## Membuat user untuk login

- Lewat halaman **Settings → Users** (butuh sudah login).
- Atau `pnpm seed-user`, yang membuat tiga user contoh (`admin@dev.com`, `developer@dev.com`, `qa@dev.com`) dengan password `password`. Hanya untuk development.

Lupa password user: login dengan user lain, buka Settings → Users, klik ikon pensil, lalu isi **New password**.

## Letak kode

| File | Isi |
|------|-----|
| [proxy.ts](../proxy.ts) | penjaga halaman dan API |
| [lib/auth.ts](../lib/auth.ts) | membuat, membaca, dan menghapus cookie sesi |
| [app/api/auth/](../app/api/auth) | login, logout, me, refresh |
| [repositories/user.repository.ts](../repositories/user.repository.ts) | `getUserForAuth` |
| [features/auth/components/login-page.tsx](../features/auth/components/login-page.tsx) | halaman login |
| [components/app/user-provider.tsx](../components/app/user-provider.tsx) | data user yang sedang login di UI |
| [components/app/idle-logout-watcher.tsx](../components/app/idle-logout-watcher.tsx) | logout otomatis saat idle |

## Belum ada

- Pembatasan percobaan login (rate limit). Password bisa ditebak berulang.
- Pembatasan akses menu atau button berdasarkan role. Login hanya memastikan user terdaftar, belum memeriksa hak akses per role.
