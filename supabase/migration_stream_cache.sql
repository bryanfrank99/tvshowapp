-- Migración para almacenamiento y caché de streams M3U8 extraídos directamente en Base de Datos
-- Permite resolución instantánea (< 20ms) sin scraping recurrente en cada reproducción.

create table if not exists stream_cache (
  id text primary key, -- Identificador único: "provider:type:targetId[:s:e]"
  provider_id text not null,
  media_type text not null default 'movie',
  target_id text not null,
  season int not null default 1,
  episode int not null default 1,
  hls_url text not null,
  backup_urls jsonb default '[]'::jsonb,
  extracted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_stream_cache_expires on stream_cache(expires_at);
create index if not exists idx_stream_cache_lookup on stream_cache(provider_id, target_id);

alter table stream_cache disable row level security;
