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

drop policy if exists "Users select own row" on public.users;
create policy "Users select own row"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users update own row" on public.users;
create policy "Users update own row"
  on public.users for update
  using (auth.uid() = id);

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

alter table public.vault enable row level security;

drop policy if exists "Users own their vault" on public.vault;
create policy "Users own their vault"
  on public.vault for all
  using (auth.uid() = user_id);
