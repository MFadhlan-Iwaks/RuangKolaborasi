# RuangKolaborasi Backend

Express API service for features that should not run directly from the web or mobile client, such as Gemini AI calls, notification triggers, and custom backend logic.

## Setup

```bash
npm install
npm run dev
```

The default API base URL is:

```text
http://localhost:5000
```

## Environment

Create `backend/.env` from `backend/.env.example`.

```env
PORT=5000
CORS_ORIGIN=*

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

`SUPABASE_SECRET_KEY` must only be used in this backend service. Do not put it in web or mobile code.

## Initial Endpoints

```text
GET /api/health
GET /api/auth/me
POST /api/ai/polish-message
POST /api/ai/summarize
```

`GET /api/auth/me` requires:

```text
Authorization: Bearer <supabase_access_token>
```

AI endpoints also require the same bearer token.

Polish a draft message:

```http
POST /api/ai/polish-message
Authorization: Bearer <supabase_access_token>
Content-Type: application/json

{
  "text": "gw udh bikin db nya cek ya"
}
```

Summarize recent messages from a channel:

```http
POST /api/ai/summarize
Authorization: Bearer <supabase_access_token>
Content-Type: application/json

{
  "channelId": "channel-uuid",
  "limit": 50
}
```

For early UI testing without database messages, summarize manual messages:

```http
POST /api/ai/summarize
Authorization: Bearer <supabase_access_token>
Content-Type: application/json

{
  "messages": [
    {
      "senderName": "Rezza",
      "content": "Struktur database sudah dibuat."
    },
    {
      "senderName": "Sammi",
      "content": "Nanti aku sambungkan ke form Next.js."
    }
  ]
}
```

## Web and Mobile Integration

See [docs/web-mobile-integration.md](docs/web-mobile-integration.md).
