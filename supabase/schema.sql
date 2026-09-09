-- TVShow: acceso por código + catálogo de proveedores en Supabase.
-- Ejecutar en Supabase Dashboard → SQL Editor.

create table if not exists access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  label text not null default '',
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  code_id uuid not null references access_codes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists providers (
  id text primary key,
  name text not null,
  movie_tpl text not null,
  tv_tpl text not null,
  needs_tmdb boolean not null default false,
  tv_ok boolean not null default false,
  entry_key text not null default '',
  active boolean not null default true,
  ord int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists live_sources (
  id text primary key,
  name text not null,
  format text not null,
  list_url text not null,
  active boolean not null default true,
  ord int not null default 0
);

create table if not exists config (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null default 'admin',
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now()
);

insert into config (key, value) values ('providers_version', '1')
on conflict (key) do nothing;

-- Desactivar RLS para que service_role pueda operar sin políticas (anon sigue bloqueado)
alter table access_codes disable row level security;
alter table sessions disable row level security;
alter table providers disable row level security;
alter table live_sources disable row level security;
alter table config disable row level security;
alter table admin_users disable row level security;
alter table admin_sessions disable row level security;
