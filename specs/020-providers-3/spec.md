# Spec: 3 proveedores más — EmbedMovies / RedeFlix / PipocaCine

## Contexto
Usuario pide agregar:
- https://www.embedmovies.org/ (via myembed.biz)
- https://redeflixapi.store/
- https://pipocacine.lat/ (embed-docs)
Todos son iframes basados en TMDB ID, sin hospedaje, ya verificados vía `webfetch`.

## Objetivos
- [ ] Agregar 3 proveedores nuevos a `public/providers.json` + `supabase/seed.sql` + tabla `providers`.
- [ ] Templates probados con 550 (Fight Club) y 1399 (GoT) / 19995 (Avatar).
- [ ] `needsTmdb` correcto por compatibilidad IMDb.

## Patrones verificados
| Proveedor | Movie | TV | needsTmdb | Fuente |
| --- | --- | --- | --- | --- |
| EmbedMovies | `https://myembed.biz/filme/{id}` (TMDB `969681` o IMDb `tt22084616`) | `https://myembed.biz/serie/{id}/{s}/{e}` (ej `30984/1/1`) | false (acepta IMDb en movie) | embedmovies.org#guia-rapido |
| RedeFlix | `https://redeflixapi.store/filme/{id}` | `https://redeflixapi.store/serie/{id}/{s}/{e}` | true (TMDB only) | redeflixapi.store/documentacao |
| PipocaCine | `https://pipocacine.lat/embed/{id}` | `https://pipocacine.lat/embed/{id}/{s}/{e}` | true (TMDB only) | pipocacine.lat/embed-docs (JS `origin+'/embed/'+id`) |

## No objetivos
- Cambiar UI ni `needsTmdb` de existentes.
- Probar fuentes de video (solo URL válida).

## Criterios de aceptación
- [ ] `/api/embed-url?provider=embedmovies&type=movie&id=550` → `https://myembed.biz/filme/550`
- [ ] `&type=tv&id=1399&s=1&e=1` → `https://myembed.biz/serie/1399/1/1` con IMDb→TMDB fallback si `needsTmdb=true` vía `lib/resolve.ts:1`
- [ ] RedeFlix y PipocaCine análogos, `public/providers.json` version bump `4→5`, lista `v5` en header.
- [ ] `npm run build` verde, `GET /api/providers` devuelve 13 providers.

## Restricciones
- Constitución: 3. Sin keys, sin `sandbox` extra. Ord 10,11,12 tras `vidzee`.
