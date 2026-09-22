-- TVShow: Migración para Control de Ventas, Cierres de Facturación y Suspensión por Morosidad (Spec 025)
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Ampliar tabla de claves de acceso con banderas de facturación
alter table access_codes add column if not exists suspended_by_billing boolean not null default false;
alter table access_codes add column if not exists last_billing_period_id uuid;

-- 2. Tabla de Períodos de Facturación (Cierres semanales o mensuales)
create table if not exists billing_periods (
  id uuid primary key default gen_random_uuid(),
  period_type text not null default 'weekly', -- 'weekly' | 'monthly'
  start_date timestamptz not null default now(),
  end_date timestamptz not null default now(),
  status text not null default 'open',        -- 'open' | 'closed'
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Tabla de Liquidaciones / Facturas por Administrador para cada Período
create table if not exists admin_invoices (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references billing_periods(id) on delete cascade,
  admin_id uuid references admin_users(id) on delete cascade,
  admin_username text not null default 'admin',
  total_codes int not null default 0,
  total_days int not null default 0,
  total_amount numeric(10, 2) not null default 0.00,
  status text not null default 'pending',     -- 'pending' | 'paid'
  is_suspended boolean not null default false, -- true si sus claves de ese período fueron cortadas por morosidad
  paid_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now()
);

-- 4. Tabla de Transacciones / Libro Contable Inmutable de Códigos
create table if not exists code_transactions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references access_codes(id) on delete set null,
  ref_code text not null default '',
  admin_id uuid references admin_users(id) on delete set null,
  admin_username text not null default 'admin',
  type text not null default 'create',        -- 'create' | 'renew' | 'extend'
  days int not null default 30,
  unit_price numeric(10, 4) not null default 0.1000,
  total_amount numeric(10, 2) not null default 3.00,
  period_id uuid references billing_periods(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Índices para consultas de alta velocidad
create index if not exists idx_code_transactions_admin_id on code_transactions(admin_id);
create index if not exists idx_code_transactions_created_at on code_transactions(created_at);
create index if not exists idx_code_transactions_code_id on code_transactions(code_id);
create index if not exists idx_admin_invoices_period_id on admin_invoices(period_id);
create index if not exists idx_admin_invoices_admin_id on admin_invoices(admin_id);
create index if not exists idx_admin_invoices_status on admin_invoices(status);
create index if not exists idx_billing_periods_status on billing_periods(status);
create index if not exists idx_access_codes_suspended_billing on access_codes(suspended_by_billing);

-- 6. Valores por defecto de configuración financiera en la tabla config
insert into config (key, value) values ('billing_price_per_day', '0.10') on conflict (key) do nothing;
insert into config (key, value) values ('billing_cycle_type', 'weekly') on conflict (key) do nothing;
insert into config (key, value) values ('billing_closing_day', '0') on conflict (key) do nothing; -- 0 = Domingo
insert into config (key, value) values ('billing_currency', '$') on conflict (key) do nothing;

-- 7. Desactivar RLS para acceso seguro desde service_role
alter table billing_periods disable row level security;
alter table admin_invoices disable row level security;
alter table code_transactions disable row level security;
