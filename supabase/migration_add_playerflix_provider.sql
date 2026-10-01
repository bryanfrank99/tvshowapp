-- Migración: Añadir proveedor PlayerFlix (S20) con extracción directa HLS
insert into providers (id, name, movie_tpl, tv_tpl, needs_tmdb, tv_ok, entry_key, active, ord, lang)
values (
  'playerflix',
  'PlayerFlix',
  '/api/playerflix?type=movie&id={id}&redirect=1',
  '/api/playerflix?type=tv&id={id}&s={s}&e={e}&redirect=1',
  true,
  true,
  '',
  true,
  20,
  'pt,en'
)
on conflict (id) do update set
  name = excluded.name,
  movie_tpl = excluded.movie_tpl,
  tv_tpl = excluded.tv_tpl,
  needs_tmdb = true,
  tv_ok = true,
  active = true,
  ord = 20,
  lang = 'pt,en';
