-- Persist message reply, forwarded message metadata, and emoji reactions.

alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null,
  add column if not exists reply_snapshot jsonb,
  add column if not exists forwarded_from_message_id uuid references public.messages(id) on delete set null,
  add column if not exists forwarded_snapshot jsonb;

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji),
  constraint message_reactions_emoji_length check (char_length(emoji) between 1 and 16)
);

create index if not exists message_reactions_message_id_idx
  on public.message_reactions(message_id);

create index if not exists messages_reply_to_message_id_idx
  on public.messages(reply_to_message_id);

create index if not exists messages_forwarded_from_message_id_idx
  on public.messages(forwarded_from_message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "Members can read message reactions" on public.message_reactions;
create policy "Members can read message reactions"
on public.message_reactions for select
to authenticated
using (
  exists (
    select 1
    from public.messages m
    join public.channels c on c.id = m.channel_id
    where m.id = message_id
      and public.is_workspace_member(c.workspace_id)
  )
);

drop policy if exists "Members can add own message reactions" on public.message_reactions;
create policy "Members can add own message reactions"
on public.message_reactions for insert
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

drop policy if exists "Users can remove own message reactions" on public.message_reactions;
create policy "Users can remove own message reactions"
on public.message_reactions for delete
to authenticated
using (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
