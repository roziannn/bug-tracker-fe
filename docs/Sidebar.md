# Sidebar dan izin role

Sidebar dibangun dari tabel menu di database, lalu difilter sesuai **role user yang sedang login**. Menu dan button yang boleh dipakai ditentukan di **Settings → Role → Configure access**.

## Alur

1. User login, cookie `session` berisi email user.
2. Setelah halaman dimuat, browser memanggil `GET /api/auth/me`.
3. Server membaca user dari database, mencari role-nya lewat `CORE_RoleClaim` (dicocokkan dengan email), lalu mengumpulkan izin role itu.
4. Server membangun daftar menu sidebar dan mengirimkannya bersama nama role dan daftar izin.
5. Sidebar menggambar menu itu sebagai pohon (menu, sub menu, sub sub menu).

Role dan izin dibaca dari database setiap kali, bukan dari isi cookie. Jadi kalau role user diganti, atau izin role diubah, hasilnya terlihat saat halaman dimuat ulang tanpa perlu login ulang.

## Data yang dikirim `/api/auth/me`

```json
{
  "name": "Administrator",
  "email": "administrator@dev.com",
  "role": { "id": 1, "name": "Administrator" },
  "menus": ["all-issues", "settings", "role"],
  "actions": ["all-issues.add", "role.btn-add"],
  "navigation": [
    { "id": "all-issues", "label": "All Issues", "parentId": null, "path": "/issues", "icon": "CircleDot" }
  ]
}
```

- `menus` dan `actions` adalah `Code` yang diizinkan untuk role itu.
- `navigation` adalah menu yang sudah difilter dan siap digambar, urut sesuai **Order** di Settings → Menu.

## Aturan menu muncul di sidebar

Sebuah menu muncul kalau semuanya benar:

1. Menunya diizinkan untuk role (dicentang di Configure access).
2. Switch **Visible** di Settings → Menu menyala.
3. **Semua parent-nya** juga diizinkan dan Visible. Sub menu yang parent-nya tidak diizinkan tidak muncul, walaupun sub menu itu sendiri dicentang.
4. Menu yang tidak punya Path dan tidak punya sub menu yang muncul (grup kosong) disembunyikan.

## Kondisi khusus

| Kondisi | Hasil |
|---------|-------|
| User belum punya role | sidebar kosong, tulisan "No menus are assigned to your role." |
| Role dinonaktifkan | semua izin dianggap kosong |
| User dinonaktifkan atau dihapus | `/api/auth/me` menjawab 401, user dianggap tidak login |
| Data masih dimuat | sidebar menampilkan skeleton |

## Perilaku sidebar

- Menu yang sedang dibuka ditandai aktif. Yang dipilih adalah menu dengan Path **terpanjang** yang cocok dengan alamat sekarang, jadi `/settings/role/Administrator` hanya menyalakan menu Role.
- Grup yang berisi halaman aktif terbuka otomatis. Buka atau tutup manual tetap bisa.
- Menu utama menampilkan ikon sesuai kolom Icon. Sub menu biasanya tanpa ikon.
- Menu yang punya sub menu berfungsi sebagai grup (klik untuk buka/tutup), bukan link.
- Nama dan role user ditampilkan di menu profil di bawah sidebar.

## Memakai izin button di kode

Daftar `Code` button yang diizinkan tersedia lewat `useCurrentUser()`:

```tsx
const { hasAction } = useCurrentUser();

{hasAction("all-issues.add") ? <Button>Add issue</Button> : null}
```

Contoh di atas hanya cara memakainya. Belum ada tombol di aplikasi yang memakai `hasAction`.

## Tabel

Didefinisikan di [db/schema/core.ts](../db/schema/core.ts).

| Tabel | Isi |
|-------|-----|
| `CORE_RoleMenu` | menu yang diizinkan per role (`RoleId`, `MenuId`), unik per pasangan |
| `CORE_RoleMenuAction` | button yang diizinkan per role (`RoleId`, `MenuActionId`), unik per pasangan |

Menghapus menu atau button menghapus izin yang menunjuk ke sana (cascade).

## Membuat admin pertama

Tabel izin baru kosong, jadi role yang sudah ada belum punya akses apa pun dan sidebar-nya kosong. Beri akses penuh ke role admin:

```
pnpm seed-access "Administrator"
```

Setelah itu role lain diatur lewat Settings → Role → Configure access.

## Yang perlu diperhatikan

- **Path menu harus sama dengan route aplikasi.** Sidebar membuka Path persis seperti yang tertulis di Settings → Menu. Path yang salah (contoh `/overview` padahal halamannya `/`) membuka halaman 404.
- **Kalau admin mencabut akses menu Role atau Menu dari role-nya sendiri**, ia tidak bisa membukanya lagi dari sidebar. Pulihkan dengan `pnpm seed-access`.
- **Izin baru memengaruhi sidebar, belum membatasi halaman.** User yang tidak punya izin sebuah menu tidak melihatnya di sidebar, tapi masih bisa membuka halamannya kalau mengetik alamatnya langsung. Begitu juga API-nya.

## Letak kode

| File | Isi |
|------|-----|
| [repositories/access.repository.ts](../repositories/access.repository.ts) | `getCurrentUser`, `getRoleAccess`, `setRoleAccess`, dan penyaringan menu |
| [app/api/auth/me/route.ts](../app/api/auth/me/route.ts) | data user, role, izin, dan sidebar |
| [app/api/roles/[id]/access/route.ts](../app/api/roles/%5Bid%5D/access/route.ts) | baca dan simpan izin role |
| [components/layout/sidebar-navigation.tsx](../components/layout/sidebar-navigation.tsx) | menggambar sidebar |
| [components/app/user-provider.tsx](../components/app/user-provider.tsx) | menyimpan data user di sisi browser (`useCurrentUser`, `hasAction`) |
| [features/settings/components/role-access-page.tsx](../features/settings/components/role-access-page.tsx) | halaman Configure access |
| [scripts/seed-access.ts](../scripts/seed-access.ts) | memberi akses penuh ke satu role |
