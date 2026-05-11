-- Keep message deletion visible in realtime by updating the row instead of
-- relying on DELETE events, which can be less reliable with RLS clients.

alter table public.messages
  add column if not exists deleted_for_everyone boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create index if not exists messages_deleted_for_everyone_idx
  on public.messages(deleted_for_everyone);
