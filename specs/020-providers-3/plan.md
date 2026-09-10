# Plan: 3 proveedores más

## Enfoque
Añadir filas a `providers` (id,name,movie_tpl,tv_tpl,needs_tmdb,tv_ok,entry_key,active,ord) y mantener `public/providers.json` + `supabase/seed.sql` sincronizados. `version` `4→5` en ambos + `config` table.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `public/providers.json` | version 5 + 3 objetos providers (ord 10-12) |
| `supabase/seed.sql` | 3 `insert ... on conflict do nothing` + `config value '5'` + bump |
| `lib/providers.ts` | sin cambio (dinámico vía Supabase) |
| `app/api/embed-url/route.ts` | sin cambio (fill ya maneja `{id}/{s}/{e}`) |

## Detalle SQL
```sql
insert into providers (id,name,movie_tpl,tv_tpl,needs_tmdb,tv_ok,entry_key,active,ord) values ('embedmovies','EmbedMovies','https://myembed.biz/filme/{id}','https://myembed.biz/serie/{id}/{s}/{e}',false,false,'',true,10) on conflict (id) do update set movie_tpl=excluded.movie_tpl, tv_tpl=excluded.tv_tpl;
-- redeflix 11 true
-- pipocacine 12 true
```

## Verificación
- `npm run build` + `curl /api/embed-url?provider=pipocacine&type=tv&id=1399&s=1&e=1` (requiere sesión) → URL esperada
- `GET /api/providers` → 13 rows
- Manual iframe `src` en `/watch` con cada provider.

## Riesgos
- EmbedMovies `myembed.biz` puede redirigir; validar `frame-ancestors` no bloquea.
- RedeFlix pago R$199 pero embed público gratuito confirmado en docs.
