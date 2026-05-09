# Supabase Setup

Run migrations from the `migrations` folder in Supabase SQL Editor.

## Migration order

1. `migrations/001_initial_schema.sql`
2. `migrations/002_enable_realtime.sql`
3. `migrations/003_allow_profile_insert.sql`
4. `migrations/004_persist_workspace_ui_state.sql`
5. `migrations/005_profile_status_realtime.sql`
6. `migrations/006_secure_invite_codes_and_channel_rbac.sql`
7. `migrations/007_workspace_invites_and_profile_bio.sql`
8. `migrations/008_message_reply_forward_reactions.sql`
9. `migrations/009_message_user_states.sql`

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
