# Supabase Setup

Run migrations from the `migrations` folder in Supabase SQL Editor.

## Migration order

1. `migrations/001_initial_schema.sql`
2. `migrations/002_enable_realtime.sql`
3. `migrations/003_allow_profile_insert.sql`
4. `migrations/004_persist_workspace_ui_state.sql`
5. `migrations/005_profile_status_realtime.sql`

## Notes

- `profiles` is linked to Supabase Auth users.
- `workspaces`, `channels`, `messages`, and `files` are the core chat data.
- `summaries` stores Gemini-generated discussion summaries.
- `direct_*` tables support direct messages.
- `device_tokens` stores mobile push notification tokens.
- Row Level Security is enabled for all app tables.

Storage bucket expected by the schema:

```text
workspace-files
```
