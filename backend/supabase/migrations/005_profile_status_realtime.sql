-- Persist and broadcast user profile presence status.

alter table public.profiles
  add column if not exists status text not null default 'online'
  check (status in ('online', 'idle', 'dnd', 'offline'));

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;
