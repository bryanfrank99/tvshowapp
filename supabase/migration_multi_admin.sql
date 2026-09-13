-- TVShow: Migración para sistema Multi-Administrador y atribución de claves
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Ampliar tabla de administradores
alter table admin_users add column if not exists name text default 'Administrador';
alter table admin_users add column if not exists role text not null default 'admin';
alter table admin_users add column if not exists is_active boolean not null default true;
alter table admin_users add column if not exists last_login_at timestamptz;

-- Asegurar que el usuario 'admin' principal tenga rol superadmin y esté activo
update admin_users set role = 'superadmin', is_active = true where username = 'admin';

-- 2. Ampliar tabla de sesiones de administrador
alter table admin_sessions add column if not exists user_id uuid references admin_users(id) on delete cascade;
alter table admin_sessions add column if not exists username text default 'admin';
alter table admin_sessions add column if not exists role text default 'admin';
alter table admin_sessions add column if not exists last_seen_at timestamptz not null default now();

-- 3. Ampliar tabla de claves de acceso para atribuir el creador
alter table access_codes add column if not exists created_by uuid references admin_users(id) on delete set null;
alter table access_codes add column if not exists creator_username text default 'admin';

-- Asignar las claves existentes al usuario admin principal
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from admin_users where username = 'admin' limit 1;
  if admin_id is not null then
    update access_codes set created_by = admin_id, creator_username = 'admin' where created_by is null;
  end if;
end $$;

-- 4. Índices para rendimiento óptimo
create index if not exists idx_access_codes_created_by on access_codes (created_by);
create index if not exists idx_access_codes_creator_username on access_codes (creator_username);
create index if not exists idx_admin_sessions_user_id on admin_sessions (user_id);
