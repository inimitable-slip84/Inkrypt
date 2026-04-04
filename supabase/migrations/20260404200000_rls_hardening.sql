/*
  Strict RLS for public.users and public.vault:
  - Per-command policies with explicit WITH CHECK (prevents cross-tenant inserts/updates).
  - Policies scoped to role authenticated only (anon has no table access).
  - FORCE ROW LEVEL SECURITY for defense in depth.
  - Supporting index on vault.user_id for filtered queries under RLS.
  Auth trigger handle_new_auth_user() remains SECURITY DEFINER (bypasses RLS as definer).
*/

create index if not exists vault_user_id_idx on public.vault (user_id);

alter table public.users enable row level security;
alter table public.vault enable row level security;

alter table public.users force row level security;
alter table public.vault force row level security;

revoke all on table public.users from anon;
revoke all on table public.vault from anon;

revoke all on table public.users from authenticated;
revoke all on table public.vault from authenticated;

grant select, update on table public.users to authenticated;
grant select, insert, update, delete on table public.vault to authenticated;

drop policy if exists "Users select own row" on public.users;
drop policy if exists "Users update own row" on public.users;
drop policy if exists "Users own their vault" on public.vault;

create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "vault_select_own"
  on public.vault
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "vault_insert_own"
  on public.vault
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "vault_update_own"
  on public.vault
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "vault_delete_own"
  on public.vault
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
