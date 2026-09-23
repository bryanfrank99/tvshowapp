-- TVShow: Migración para control anti-reúso de dispositivos (Spec 035)
-- Evita que un mismo dispositivo active nuevas claves si ya está vinculado a una clave inactiva o vencida
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Tabla persistente de vinculación de dispositivos a claves
create table if not exists device_bindings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  code_id uuid not null references access_codes(id) on delete cascade,
  device_hint text default 'Dispositivo',
  ip text default '',
  first_bound_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint uq_device_code unique (device_id, code_id)
);

-- 2. Índices de alta velocidad
create index if not exists idx_device_bindings_dev on device_bindings (device_id);
create index if not exists idx_device_bindings_code on device_bindings (code_id);
create index if not exists idx_device_bindings_last_seen on device_bindings (last_seen_at desc);

-- 3. Columna auxiliar en sessions para correlación directa
alter table sessions add column if not exists device_id text;
create index if not exists idx_sessions_device_id on sessions (device_id);

-- 4. Desactivar RLS para operaciones con service_role
alter table device_bindings disable row level security;
