-- Persist UI state that was previously stored only in the frontend.

alter table public.workspaces
  add column if not exists short_name text,
  add column if not exists color text;

alter table public.channels
  add column if not exists favorite boolean not null default false,
  add column if not exists archived boolean not null default false;

alter table public.messages
  add column if not exists pinned boolean not null default false,
  add column if not exists edited boolean not null default false;
