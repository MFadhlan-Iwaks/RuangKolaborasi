-- Enable realtime updates for workspace role changes and member removal.

do $$
begin
  alter publication supabase_realtime add table public.workspace_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
