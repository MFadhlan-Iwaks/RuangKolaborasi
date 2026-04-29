-- RuangKolaborasi initial Supabase schema.
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

do $$
begin
  create type public.workspace_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_type as enum ('text', 'file', 'image', 'document_scan', 'summary');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.device_platform as enum ('web', 'android', 'ios');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  type public.message_type not null default 'text',
  file_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_content_or_file check (
    content is not null or file_id is not null
  )
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  bucket_name text not null default 'workspace-files',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.messages
    add constraint messages_file_id_fkey
    foreign key (file_id) references public.files(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  start_message_id uuid references public.messages(id) on delete set null,
  end_message_id uuid references public.messages(id) on delete set null,
  summary_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.direct_conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  type public.message_type not null default 'text',
  file_id uuid references public.files(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_messages_content_or_file check (
    content is not null or file_id is not null
  )
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform public.device_platform not null,
  token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists channels_workspace_id_idx on public.channels(workspace_id);
create index if not exists messages_channel_id_created_at_idx on public.messages(channel_id, created_at);
create index if not exists files_workspace_id_idx on public.files(workspace_id);
create index if not exists summaries_channel_id_created_at_idx on public.summaries(channel_id, created_at);
create index if not exists direct_conversation_members_user_id_idx on public.direct_conversation_members(user_id);
create index if not exists direct_messages_conversation_id_created_at_idx on public.direct_messages(conversation_id, created_at);
create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_channels_updated_at on public.channels;
create trigger set_channels_updated_at
before update on public.channels
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

drop trigger if exists set_direct_messages_updated_at on public.direct_messages;
create trigger set_direct_messages_updated_at
before update on public.direct_messages
for each row execute function public.set_updated_at();

drop trigger if exists set_device_tokens_updated_at on public.device_tokens;
create trigger set_device_tokens_updated_at
before update on public.device_tokens
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_workspace_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
after insert on public.workspaces
for each row execute function public.add_workspace_owner_member();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles public.workspace_role[]
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

create or replace function public.shares_workspace_with(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

create or replace function public.is_direct_conversation_member(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.direct_conversation_members dcm
    where dcm.conversation_id = target_conversation_id
      and dcm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.files enable row level security;
alter table public.summaries enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_conversation_members enable row level security;
alter table public.direct_messages enable row level security;
alter table public.device_tokens enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can read profiles in shared workspaces" on public.profiles;
create policy "Users can read profiles in shared workspaces"
on public.profiles for select
to authenticated
using (public.shares_workspace_with(id));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can read joined workspaces" on public.workspaces;
create policy "Users can read joined workspaces"
on public.workspaces for select
to authenticated
using (
  public.is_workspace_member(id)
);

drop policy if exists "Users can create owned workspaces" on public.workspaces;
create policy "Users can create owned workspaces"
on public.workspaces for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners and admins can update workspaces" on public.workspaces;
create policy "Owners and admins can update workspaces"
on public.workspaces for update
to authenticated
using (
  public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[])
)
with check (
  public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[])
);

drop policy if exists "Members can read workspace members" on public.workspace_members;
create policy "Members can read workspace members"
on public.workspace_members for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
);

drop policy if exists "Owners and admins can add workspace members" on public.workspace_members;
create policy "Owners and admins can add workspace members"
on public.workspace_members for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
);

drop policy if exists "Owners and admins can update workspace members" on public.workspace_members;
create policy "Owners and admins can update workspace members"
on public.workspace_members for update
to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
)
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
);

drop policy if exists "Members can read channels" on public.channels;
create policy "Members can read channels"
on public.channels for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
);

drop policy if exists "Members can create channels" on public.channels;
create policy "Members can create channels"
on public.channels for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "Members can read channel messages" on public.messages;
create policy "Members can read channel messages"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.channels c
    where c.id = channel_id
      and public.is_workspace_member(c.workspace_id)
  )
);

drop policy if exists "Members can send channel messages" on public.messages;
create policy "Members can send channel messages"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.channels c
    where c.id = channel_id
      and public.is_workspace_member(c.workspace_id)
  )
);

drop policy if exists "Senders can update their messages" on public.messages;
create policy "Senders can update their messages"
on public.messages for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

drop policy if exists "Members can read workspace files" on public.files;
create policy "Members can read workspace files"
on public.files for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
);

drop policy if exists "Members can create file metadata" on public.files;
create policy "Members can create file metadata"
on public.files for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "Members can read summaries" on public.summaries;
create policy "Members can read summaries"
on public.summaries for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
);

drop policy if exists "Members can create summaries" on public.summaries;
create policy "Members can create summaries"
on public.summaries for insert
to authenticated
with check (
  requested_by = auth.uid()
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "Conversation members can read conversations" on public.direct_conversations;
create policy "Conversation members can read conversations"
on public.direct_conversations for select
to authenticated
using (
  public.is_direct_conversation_member(id)
);

drop policy if exists "Authenticated users can create conversations" on public.direct_conversations;
create policy "Authenticated users can create conversations"
on public.direct_conversations for insert
to authenticated
with check (true);

drop policy if exists "Conversation members can read membership" on public.direct_conversation_members;
create policy "Conversation members can read membership"
on public.direct_conversation_members for select
to authenticated
using (
  public.is_direct_conversation_member(conversation_id)
);

drop policy if exists "Authenticated users can create conversation membership" on public.direct_conversation_members;
create policy "Authenticated users can create conversation membership"
on public.direct_conversation_members for insert
to authenticated
with check (true);

drop policy if exists "Conversation members can read direct messages" on public.direct_messages;
create policy "Conversation members can read direct messages"
on public.direct_messages for select
to authenticated
using (
  public.is_direct_conversation_member(conversation_id)
);

drop policy if exists "Conversation members can send direct messages" on public.direct_messages;
create policy "Conversation members can send direct messages"
on public.direct_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_direct_conversation_member(conversation_id)
);

drop policy if exists "Users can manage own device tokens" on public.device_tokens;
create policy "Users can manage own device tokens"
on public.device_tokens for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
