  -- Persist per-user message actions such as "delete for me" and starred messages.

  create table if not exists public.message_user_states (
    message_id uuid not null references public.messages(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    hidden boolean not null default false,
    starred boolean not null default false,
    updated_at timestamptz not null default now(),
    primary key (message_id, user_id)
  );

  create index if not exists message_user_states_user_id_idx
    on public.message_user_states(user_id);

  create index if not exists message_user_states_message_id_idx
    on public.message_user_states(message_id);

  drop trigger if exists set_message_user_states_updated_at on public.message_user_states;
  create trigger set_message_user_states_updated_at
  before update on public.message_user_states
  for each row execute function public.set_updated_at();

  alter table public.message_user_states enable row level security;

  drop policy if exists "Users can read own message states" on public.message_user_states;
  create policy "Users can read own message states"
  on public.message_user_states for select
  to authenticated
  using (user_id = auth.uid());

  drop policy if exists "Users can create own message states" on public.message_user_states;
  create policy "Users can create own message states"
  on public.message_user_states for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_id
        and public.is_workspace_member(c.workspace_id)
    )
  );

  drop policy if exists "Users can update own message states" on public.message_user_states;
  create policy "Users can update own message states"
  on public.message_user_states for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

  drop policy if exists "Users can delete own message states" on public.message_user_states;
  create policy "Users can delete own message states"
  on public.message_user_states for delete
  to authenticated
  using (user_id = auth.uid());

  do $$
  begin
    alter publication supabase_realtime add table public.message_user_states;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end $$;
