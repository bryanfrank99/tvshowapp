-- Migración: Soporte para URLs de disponibilidad de catálogo por proveedor
-- Permite configurar listas externas (TXT para películas, JSON para series/animes/doramas)

alter table if exists providers
  add column if not exists movie_list_url text default '',
  add column if not exists tv_list_url text default '',
  add column if not exists anime_list_url text default '',
  add column if not exists dorama_list_url text default '';

-- Poblar valores iniciales para RedeFlix si existe
update providers
set
  movie_list_url = 'https://redeflixapi.store/list-movie-ids.txt',
  tv_list_url = 'https://redeflixapi.store/list-tv-ids.txt',
  anime_list_url = 'https://redeflixapi.store/list-anime-ids.txt',
  dorama_list_url = 'https://redeflixapi.store/list-dorama-ids.txt'
where id = 'redeflix';
