-- Allow authenticated users to create their own profile row.
-- This is useful for users created before the auth trigger existed,
-- or when the client needs to repair a missing profile during development.

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());
