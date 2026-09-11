-- TVShow: Migración para tracking de conexiones y dispositivos en sessions
-- Ejecutar en Supabase Dashboard → SQL Editor

alter table sessions add column if not exists last_seen_at timestamptz not null default now();
alter table sessions add column if not exists device_hint text default 'Navegador Web';

-- Índice para acelerar conteo y ordenamiento de sesiones por código
create index if not exists idx_sessions_code_id on sessions (code_id, created_at desc);
