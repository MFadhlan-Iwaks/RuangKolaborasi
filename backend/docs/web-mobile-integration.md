# Web and Mobile Integration Contract

This project uses a hybrid backend:

```text
Web / Mobile
  |-- Supabase client for auth, database, realtime, and storage
  |-- Express backend for protected custom logic such as AI and notifications
```

## Client Environment

Web and mobile clients should use the same Supabase project values, but the variable names may differ depending on the framework.

Web with Vite:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_BASE_URL=http://localhost:5000
```

Mobile with Expo:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
```

Only the backend may use:

```env
SUPABASE_SECRET_KEY=
```

## Minimum Integration Flow

1. Register or login with Supabase Auth.
2. Read the Supabase `access_token` from the active session.
3. Call the Express backend with `Authorization: Bearer <access_token>`.
4. Use Supabase client directly for workspace, channel, message, realtime, and storage operations.

## Backend Smoke Tests

Public endpoint:

```http
GET /api/health
```

Protected endpoint:

```http
GET /api/auth/me
Authorization: Bearer <supabase_access_token>
```

Expected response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "metadata": {}
  },
  "profile": {
    "id": "uuid",
    "full_name": null,
    "username": null,
    "avatar_url": null,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

If `profile` is `null`, the user may have been created before the `profiles` trigger existed. Insert the profile manually or re-register with a fresh test account.

## AI Endpoints

All AI endpoints require a Supabase access token:

```text
Authorization: Bearer <supabase_access_token>
```

Polish a message draft:

```http
POST /api/ai/polish-message
Content-Type: application/json

{
  "text": "gw udh bikin db nya cek ya"
}
```

Response:

```json
{
  "polishedText": "Saya sudah membuat struktur database. Mohon dicek, ya."
}
```

Summarize recent messages in a channel:

```http
POST /api/ai/summarize
Content-Type: application/json

{
  "channelId": "channel-uuid",
  "limit": 50
}
```

The backend checks whether the requester is a member of the workspace before reading channel messages.

## Supabase Tables Used Directly by Clients

Core tables:

```text
profiles
workspaces
workspace_members
channels
messages
files
summaries
```

Direct message tables:

```text
direct_conversations
direct_conversation_members
direct_messages
```

Push notification tokens:

```text
device_tokens
```

## Realtime Tables

Clients should subscribe to:

```text
messages
direct_messages
```

Example channel message subscription:

```js
supabase
  .channel(`channel-messages:${channelId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`,
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```
