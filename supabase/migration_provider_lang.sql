-- Migración: Añadir columna lang a providers con valores por defecto
-- Ejecutar en Supabase Dashboard → SQL Editor

alter table providers add column if not exists lang text not null default 'multi';

-- Asignar idioma principal a proveedores conocidos
update providers set lang = 'es' where id = 'vidcore';
update providers set lang = 'lat' where id = 'embos';
update providers set lang = 'pt' where id in ('streambetter', 'embedmovies', 'redeflix', 'pipocacine');
update providers set lang = 'en' where id in ('vidapi', 'superembed', 'moviesapi', 'cinesrc', 'vidzee');
update providers set lang = 'multi' where id in ('vidzy', 'vimeus');

-- Actualizar versión del catálogo
insert into config (key, value) values ('providers_version', '6')
on conflict (key) do update set value = excluded.value;
