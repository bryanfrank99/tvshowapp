-- Migración: Añadir proveedor WatchPlay (S18) con extracción directa HLS
insert into providers (id, name, movie_tpl, tv_tpl, needs_tmdb, tv_ok, entry_key, active, ord, lang)
values (
  'watchplay',
  'WatchPlay',
  'https://v2.watchplay.shop/movie/{id}',
  'https://v2.watchplay.shop/tvshow/{id}/{s}/{e}',
  true,
  true,
  '',
  true,
  18,
  'pt'
)
on conflict (id) do update set
  name = excluded.name,
  movie_tpl = excluded.movie_tpl,
  tv_tpl = excluded.tv_tpl,
  needs_tmdb = true,
  tv_ok = true,
  active = true,
  ord = 18,
  lang = 'pt';
