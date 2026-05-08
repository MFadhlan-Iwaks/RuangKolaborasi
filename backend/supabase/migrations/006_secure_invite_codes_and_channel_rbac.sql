create extension if not exists pgcrypto;

alter table public.workspaces
  add column if not exists invite_code text;

update public.workspaces
set invite_code = 'RK-' || upper(encode(gen_random_bytes(5), 'hex'))
where invite_code is null;

alter table public.workspaces
  alter column invite_code set not null;

create unique index if not exists workspaces_invite_code_key
  on public.workspaces(invite_code);

drop policy if exists "Owners and admins can add workspace members" on public.workspace_members;
create policy "Owners and admins can add workspace members"
on public.workspace_members for insert
to authenticated
with check (
  (
    role = 'member'
    and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
  )
  or (
    role = 'admin'
    and public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
  )
);

drop policy if exists "Owners and admins can update workspace members" on public.workspace_members;
create policy "Owners and admins can update workspace members"
on public.workspace_members for update
to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
)
with check (
  (
    role = 'member'
    and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
  )
  or (
    role = 'admin'
    and public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
  )
);

drop policy if exists "Members can create channels" on public.channels;
create policy "Owners and admins can create channels"
on public.channels for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
);
