-- Migración: Configuración Dinámica de Extractor HLS por Proveedor (Spec 096)
-- Permite almacenar recetas y parámetros JSON editables desde el panel de administración

alter table if exists providers
  add column if not exists extractor_config jsonb default '{}'::jsonb;

-- Configurar interruptor global para permitir o no iframes embed de respaldo (por defecto false: solo HLS)
insert into config (key, value)
values ('allow_embed_fallback', 'false')
on conflict (key) do nothing;
