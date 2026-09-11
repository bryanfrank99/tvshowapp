-- Migración: Soporte para múltiples idiomas de audio y subtítulos por proveedor
-- Ejecutar en Supabase Dashboard → SQL Editor

alter table providers add column if not exists subtitles text not null default '';

-- Actualizar audios (lang separado por comas) y subtítulos de los servidores
update providers set lang = 'es,en', subtitles = 'es,en' where id = 'vidcore';
update providers set lang = 'lat,es,en', subtitles = 'es' where id = 'embos';
update providers set lang = 'en', subtitles = 'es,en,pt' where id = 'vidapi';
update providers set lang = 'pt', subtitles = 'pt' where id = 'streambetter';
update providers set lang = 'en,es', subtitles = 'es,en' where id = 'vidzy';
update providers set lang = 'en,es,lat', subtitles = 'es,en' where id = 'vimeus';
update providers set lang = 'en', subtitles = 'es,en' where id = 'superembed';
update providers set lang = 'en', subtitles = 'en' where id = 'moviesapi';
update providers set lang = 'en', subtitles = 'es,en' where id = 'cinesrc';
update providers set lang = 'en', subtitles = 'es,en' where id = 'vidzee';
update providers set lang = 'pt', subtitles = 'pt' where id = 'embedmovies';
update providers set lang = 'pt', subtitles = 'pt' where id = 'redeflix';
update providers set lang = 'pt,lat', subtitles = 'pt' where id = 'pipocacine';

-- Incrementar versión de proveedores
insert into config (key, value) values ('providers_version', '7')
on conflict (key) do update set value = excluded.value;
