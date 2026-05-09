# Handoff Fitur Web untuk Backend dan Mobile

Dokumen ini berisi daftar fitur yang sudah terlihat atau disiapkan di frontend web RuangKolaborasi, tetapi masih perlu dukungan backend dan penyesuaian mobile agar pengalaman antarplatform konsisten.

## Ringkasan

Frontend web saat ini sudah memiliki banyak fitur produktivitas dan chat secara frontend-only. Beberapa fitur sudah berjalan di UI, tetapi sebagian datanya masih lokal, mock, atau belum persistent. Backend perlu menyediakan API, struktur data, dan storage yang sesuai. Mobile perlu menyamakan fitur umum yang tidak termasuk fitur spesifik platform.

## Kebutuhan untuk Backend

### 1. Profil Pengguna

Backend perlu mendukung penyimpanan data profil pengguna:

- `full_name` atau nama tampilan pengguna.
- `username`.
- `avatar_url` atau `photo_url`.
- `bio`.
- `profile_status`, misalnya `online`, `idle`, `dnd`, dan `offline`.

Endpoint yang dibutuhkan:

- Update nama pengguna.
- Update username.
- Upload dan update foto profil.
- Update bio.
- Update status pengguna.

Catatan: foto profil sebaiknya disimpan di storage, lalu database hanya menyimpan URL atau path file.

### 2. Profil Grup atau Workspace

Frontend web sudah menyiapkan foto profil grup. Backend perlu menambahkan dukungan:

- Field `photo_url` pada workspace/grup.
- Endpoint update workspace menerima perubahan foto grup.
- Upload foto grup ke storage.
- Validasi role: hanya owner/admin yang bisa mengubah identitas grup.

Data workspace minimal:

- `id`
- `name`
- `description`
- `short_name`
- `color`
- `photo_url`
- `invite_code`

### 3. Pesan Chat

Beberapa fitur pesan di web masih perlu disambungkan ke backend:

- Edit pesan.
- Hapus pesan untuk saya.
- Hapus pesan untuk semua orang.
- Tombstone message, misalnya pesan tampil sebagai "Pesan ini telah dihapus".
- Reply pesan.
- Reaction emoji.
- Star atau favorite message.
- Pin dan unpin message.
- Forward pesan ke channel lain.
- Info pesan dan status pengiriman.

Field tambahan yang disarankan:

- `reply_to_message_id`
- `edited`
- `deleted_for_everyone`
- `pinned`
- `starred`
- `delivery_status`
- `created_at`
- `updated_at`

Untuk reaction, lebih baik dibuat tabel terpisah:

- `message_id`
- `user_id`
- `emoji`
- `created_at`

### 4. File dan Media

Frontend web sekarang bisa preview dan download file. Backend perlu memastikan:

- File diupload ke storage.
- Metadata file tersimpan di database.
- Signed URL atau public URL valid untuk preview/download.
- CORS storage aman untuk fetch blob dari frontend.
- URL file dapat diakses dengan `fetch(fileUrl)` dari browser karena web sekarang memaksa download melalui `fetch -> Blob -> anchor download`, bukan lagi membuka file di tab baru.

Metadata file yang dibutuhkan:

- `id`
- `message_id`
- `file_name`
- `mime_type`
- `file_size`
- `storage_path`
- `signed_url` atau URL akses.

Jenis file yang perlu didukung:

- Gambar.
- Dokumen.
- Audio.
- Video.
- Voice note.

### 5. Invite Anggota

Frontend web sudah punya flow invite dengan pilihan gabung atau tolak. Backend perlu mendukung:

- Membuat invite.
- Mengirim invite ke email/user tujuan.
- Status invite: `pending`, `accepted`, `declined`.
- Accept invite.
- Decline invite.
- Membatalkan invite oleh pengirim/admin.
- Validasi role pengundang.

Data invite yang disarankan:

- `id`
- `workspace_id`
- `inviter_id`
- `invited_email`
- `role`
- `status`
- `invite_code`
- `created_at`
- `responded_at`

### 6. Notifikasi

Frontend web sudah menampilkan dropdown notifikasi. Backend perlu menyediakan data notifikasi untuk:

- Pesan baru.
- File baru.
- Mention.
- Invite.
- Hasil atau status AI summary.

Data notifikasi yang disarankan:

- `id`
- `user_id`
- `workspace_id`
- `channel_id`
- `kind`
- `title`
- `description`
- `read_at`
- `created_at`

### 7. AI Summary

Endpoint rangkuman AI sudah dipakai frontend. Web sekarang memanggil endpoint summary dengan `channelId`, sehingga backend perlu mengambil histori pesan channel dari database.

Request dari frontend:

```json
{
  "channelId": "id-channel-aktif",
  "limit": 100
}
```

Response yang dibutuhkan:

```json
{
  "summary": "..."
}
```

Backend perlu:

- Menyimpan hasil summary.
- Menyimpan siapa yang meminta summary.
- Menyimpan channel dan workspace terkait.
- Mengatur format prompt agar hasil mudah dibaca.
- Memastikan `channelId` valid dan user yang request adalah member workspace/channel.
- Memastikan pesan chat sudah persistent di tabel `messages`; jika pesan hanya ada di state frontend, AI summary dari `channelId` akan kosong.
- Memastikan `GEMINI_API_KEY` terbaca dari `backend/.env`.

Format rangkuman yang disarankan:

- Ringkasan utama.
- Keputusan yang dibuat.
- Tindak lanjut.
- Pertanyaan terbuka.
- Daftar tugas jika ada.

Data summary yang disarankan:

- `id`
- `workspace_id`
- `channel_id`
- `requested_by`
- `summary_text`
- `created_at`

### 8. Role dan Permission

Backend perlu memastikan permission untuk fitur penting:

- Owner/admin bisa mengubah workspace.
- Owner/admin bisa membuat, mengedit, dan menghapus channel.
- Owner/admin bisa invite anggota.
- User hanya bisa edit/hapus pesan sendiri, kecuali aturan admin dibuat berbeda.
- User hanya bisa keluar dari workspace yang ia ikuti.

### 9. Register Flow Web

Frontend web sekarang memakai flow berikut:

- Setelah register berhasil, user diarahkan ke halaman login.
- Jika Supabase otomatis membuat session setelah register, frontend akan menjalankan `signOut()` lebih dulu.
- User tidak lagi langsung masuk ke workspace setelah register.

Backend tidak perlu mengubah endpoint khusus untuk flow ini, tetapi error register tetap perlu dikirim dengan pesan yang jelas agar bisa ditampilkan oleh frontend.

## Kebutuhan untuk Mobile

### 1. Sinkronisasi Workspace

Mobile perlu menampilkan data workspace yang sama dengan web:

- Nama grup.
- Deskripsi grup.
- Foto profil grup.
- Jumlah anggota.
- Daftar channel.
- Role user dalam workspace.

Jika user owner/admin, mobile bisa menyediakan opsi edit profil grup. Jika ingin scope mobile lebih ringan, minimal mobile menampilkan data hasil update dari web.

### 2. Profil Pengguna

Mobile perlu menyamakan profil pengguna:

- Ganti foto profil.
- Edit nama.
- Edit bio.
- Tampilkan bio di daftar anggota.
- Tampilkan status online/idle/dnd/offline.

### 3. Chat

Fitur chat umum yang sebaiknya sama dengan web:

- Kirim pesan teks.
- Reply pesan.
- Edit pesan sendiri.
- Hapus pesan.
- Reaction emoji.
- Star pesan.
- Pin pesan.
- Forward pesan ke channel lain.
- Info pesan.

Fitur khusus mobile tetap dipertahankan:

- Document scanner dari kamera.
- Push notification native.

### 4. File dan Media

Mobile perlu mendukung:

- Preview gambar.
- Preview audio.
- Preview video.
- Download file ke device.
- Upload file.
- Voice note.
- Kirim hasil scan dokumen.

### 5. Invite dan Notifikasi

Mobile perlu menampilkan:

- Invite masuk.
- Tombol gabung.
- Tombol tolak.
- Status invite.
- Push notification untuk pesan, file, mention, dan invite.

### 6. AI Summary

Mobile perlu menyediakan:

- Tombol rangkum diskusi.
- Tampilan hasil rangkuman yang mudah dibaca.
- Opsi share atau download hasil rangkuman jika memungkinkan.

Minimal mobile dapat menampilkan hasil summary dari backend. Export PDF bisa menjadi fitur tambahan jika waktu cukup.

### 7. Theme

Mobile sebaiknya mendukung:

- Light mode.
- Dark mode.
- Simpan preferensi theme di local storage/shared preferences.
- Ikuti system theme device jika belum ada pilihan manual.

## Prioritas Implementasi

### Prioritas Tinggi

1. Persistensi pesan chat.
2. Upload dan download file.
3. Profil pengguna.
4. Invite anggota.
5. Role dan permission.

### Prioritas Menengah

1. Foto profil grup.
2. Reaction, reply, edit, dan delete pesan.
3. Pin/star/forward pesan.
4. Notifikasi.
5. AI summary tersimpan.

### Prioritas Tambahan

1. Export summary ke PDF dari backend.
2. Riwayat summary per channel.
3. Advanced message info.
4. Sinkronisasi theme lintas perangkat.

## Catatan untuk Integrasi

- Frontend web sudah menyiapkan banyak UI dan state lokal.
- Backend sebaiknya mengutamakan API dan struktur database yang stabil.
- Mobile sebaiknya menyamakan fitur umum agar pengalaman pengguna tidak berbeda jauh.
- Fitur spesifik platform tetap dipisahkan:
  - Web: drag and drop file.
  - Mobile: document scanner dan push notification native.
