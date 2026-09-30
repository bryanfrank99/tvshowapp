-- Migración: Añadir proveedor Cinecalidad (S15) con comprobación de disponibilidad nativa y audio Latino
insert into providers (id, name, movie_tpl, tv_tpl, movie_list_url, tv_list_url, needs_tmdb, tv_ok, entry_key, active, ord, lang)
values (
  'cinecalidad',
  'Cinecalidad (Latino)',
  '/api/cinecalidad?type=movie&id={id}',
  '/api/cinecalidad?type=tv&id={id}&s={s}&e={e}',
  'https://tmdb.cinecalidad.am/v1/playback/movie/{id}',
  'https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}?season={s}&episode={e}',
  true,
  true,
  '',
  true,
  15,
  'es'
)
on conflict (id) do update set
  name = excluded.name,
  movie_tpl = excluded.movie_tpl,
  tv_tpl = excluded.tv_tpl,
  movie_list_url = excluded.movie_list_url,
  tv_list_url = excluded.tv_list_url,
  needs_tmdb = true,
  tv_ok = true,
  active = true,
  ord = 15,
  lang = 'es';
