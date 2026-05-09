alter table public.profiles
  add column if not exists bio text;

alter table public.workspaces
  add column if not exists photo_url text;

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  invited_email text not null,
  role public.workspace_role not null default 'member',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_invites_pending_email_key
  on public.workspace_invites(workspace_id, lower(invited_email))
  where status = 'pending';

create index if not exists workspace_invites_invited_email_idx
  on public.workspace_invites(lower(invited_email));

create index if not exists workspace_invites_invited_user_id_idx
  on public.workspace_invites(invited_user_id);

create index if not exists workspace_invites_inviter_id_idx
  on public.workspace_invites(inviter_id);

drop trigger if exists set_workspace_invites_updated_at on public.workspace_invites;
create trigger set_workspace_invites_updated_at
before update on public.workspace_invites
for each row execute function public.set_updated_at();

alter table public.workspace_invites enable row level security;

drop policy if exists "Users can read relevant workspace invites" on public.workspace_invites;
create policy "Users can read relevant workspace invites"
on public.workspace_invites for select
to authenticated
using (
  inviter_id = auth.uid()
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
);

drop policy if exists "Owners and admins can create workspace invites" on public.workspace_invites;
create policy "Owners and admins can create workspace invites"
on public.workspace_invites for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and (
    (
      role = 'member'
      and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
    or (
      role = 'admin'
      and public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
    )
  )
);

drop policy if exists "Invite participants can update workspace invites" on public.workspace_invites;
create policy "Invite participants can update workspace invites"
on public.workspace_invites for update
to authenticated
using (
  inviter_id = auth.uid()
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
)
with check (
  inviter_id = auth.uid()
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
);

drop policy if exists "Invite senders can delete pending workspace invites" on public.workspace_invites;
create policy "Invite senders can delete pending workspace invites"
on public.workspace_invites for delete
to authenticated
using (
  status = 'pending'
  and (
    inviter_id = auth.uid()
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
  )
);

do $$
begin
  alter publication supabase_realtime add table public.workspace_invites;
exception
  when duplicate_object then null;
end $$;
