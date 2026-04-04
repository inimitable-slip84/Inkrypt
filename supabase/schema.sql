-- Canonical database schema for Vault (Chrome extension).
-- Kept in sync with: supabase/migrations/*.sql
--
-- Deploy to hosted Supabase:
--   npx supabase login
--   npx supabase link --project-ref <YOUR_PROJECT_REF>
--   npx supabase db push
--
-- Auth: enable Email + TOTP MFA in the dashboard. Turn off "Confirm email" for quick testing
-- or confirm email before enrolling MFA.
--
-- Backfill public.users for accounts created before this migration:
--   insert into public.users (id)
--   select id from auth.users
--   on conflict (id) do nothing;

/*
  Initial schema for Vault extension + Supabase Auth.
  Auth identities live in auth.users (managed by Supabase).
  public.users is a 1:1 app row created automatically on signup.
*/

-- Application user row (1:1 with auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'One row per auth user; credentials stay in auth.users.';

create or replace function public.set_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row
  execute procedure public.set_users_updated_at();

alter table public.users enable row level security;
alter table public.users force row level security;

revoke all on table public.users from anon;
revoke all on table public.users from authenticated;
grant select, update on table public.users to authenticated;

drop policy if exists "Users select own row" on public.users;
drop policy if exists "Users update own row" on public.users;
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_update_own" on public.users;

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

-- Keep public.users in sync when someone signs up via Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_users on auth.users;
create trigger on_auth_user_created_users
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();

-- Password manager rows ( ciphertext only; extension encrypts client-side )
create table if not exists public.vault (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_url text not null,
  label text,
  username text,
  password_cipher text,
  password_iv text,
  totp_cipher text,
  totp_iv text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_vault_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vault_set_updated_at on public.vault;
create trigger vault_set_updated_at
  before update on public.vault
  for each row
  execute procedure public.set_vault_updated_at();

create index if not exists vault_user_id_idx on public.vault (user_id);

alter table public.vault enable row level security;
alter table public.vault force row level security;

revoke all on table public.vault from anon;
revoke all on table public.vault from authenticated;
grant select, insert, update, delete on table public.vault to authenticated;

drop policy if exists "Users own their vault" on public.vault;
drop policy if exists "vault_select_own" on public.vault;
drop policy if exists "vault_insert_own" on public.vault;
drop policy if exists "vault_update_own" on public.vault;
drop policy if exists "vault_delete_own" on public.vault;

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
