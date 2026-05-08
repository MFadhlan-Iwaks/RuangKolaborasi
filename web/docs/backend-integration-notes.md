# Backend Integration Notes untuk Fitur Web

Catatan ini merangkum kebutuhan backend agar fitur frontend RuangKolaborasi yang sudah dibuat bisa tersambung penuh.

## 1. Invite Workspace

Frontend saat ini sudah punya alur UI untuk invite pending, diterima, dan dibatalkan. Backend perlu menyediakan data invite yang dipisah menjadi:

- Incoming invite: undangan yang diterima user saat ini.
- Outgoing invite: undangan yang dikirim dari workspace aktif.

Endpoint yang dibutuhkan:

- `GET /api/workspaces/invites`
  - Mengembalikan incoming dan outgoing invites untuk user login.
- `POST /api/workspaces/:workspaceId/invite`
  - Membuat invite pending berdasarkan email dan role.
- `POST /api/workspaces/invites/:inviteId/accept`
  - User menerima invite dan masuk menjadi member aktif.
- `POST /api/workspaces/invites/:inviteId/decline`
  - User menolak invite.
- `DELETE /api/workspaces/invites/:inviteId`
  - Pengirim membatalkan invite pending.

Field minimal invite:

```json
{
  "id": "invite-id",
  "workspaceId": "workspace-id",
  "workspaceName": "Tugas Besar PABP",
  "inviterName": "Nama Pengundang",
  "invitedEmail": "teman@kampus.ac.id",
  "role": "Member",
  "inviteCode": "ABC123",
  "status": "pending",
  "direction": "incoming"
}
```

## 2. Profile User

Frontend sudah mendukung foto profil dan bio secara lokal. Backend perlu menyimpan:

- `avatar_url`
- `bio`
- `status`

Endpoint yang dibutuhkan:

- `PATCH /api/auth/profile`
  - Update `bio` dan `avatar_url`.
- Storage upload avatar, bisa lewat Supabase Storage atau endpoint backend khusus.

Response profile sebaiknya dikembalikan dalam bootstrap workspace agar sidebar anggota bisa menampilkan foto dan bio anggota.

## 3. Message Realtime

Frontend sudah menangani insert realtime dan deduplicate pesan. Backend/realtime perlu mendukung event:

- insert message
- update message untuk edit/pin
- delete message

Field message ideal:

```json
{
  "id": "message-id",
  "channel_id": "channel-id",
  "sender_id": "user-id",
  "sender_name": "Nama User",
  "content": "Isi pesan",
  "type": "text",
  "pinned": false,
  "edited": false,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## 4. File Upload

Frontend sudah memvalidasi ukuran maksimal 10 MB dan menampilkan preview gambar. Backend perlu:

- validasi ukuran file maksimal 10 MB
- validasi mime type
- generate signed URL untuk preview/download
- menyimpan metadata file

Endpoint saat ini yang dipakai frontend:

- `POST /api/workspaces/channels/:channelId/files`

Payload frontend saat ini mengirim:

- `fileName`
- `mimeType`
- `fileSize`
- `contentBase64`
- `caption`

## 5. Error Response Konsisten

Frontend sudah menampilkan toast dari error message. Backend sebaiknya mengembalikan error JSON konsisten:

```json
{
  "message": "Invite sudah pernah dikirim.",
  "code": "INVITE_ALREADY_EXISTS"
}
```

## 6. Bootstrap Workspace

Endpoint `GET /api/workspaces/bootstrap` sebaiknya mengembalikan semua data awal:

- workspaces
- roomsByWorkspace
- messagesByWorkspace
- membersByWorkspace
- incomingInvites
- outgoingInvites

Dengan begitu frontend tidak perlu request berulang saat halaman workspace pertama kali dibuka.
