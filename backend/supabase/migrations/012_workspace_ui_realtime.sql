-- Keep workspace UI changes in sync across web clients.

alter table public.workspace_members replica identity full;
alter table public.channels replica identity full;
alter table public.workspaces replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.channels;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workspaces;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
