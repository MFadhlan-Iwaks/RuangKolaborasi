-- Enable Supabase Realtime Postgres Changes for chat tables.
-- Run this after 001_initial_schema.sql.

do $$
begin
  create publication supabase_realtime;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception
  when duplicate_object then null;
end $$;
