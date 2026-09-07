# Plan: rutas por query (spec ./spec.md)

## Enfoque
Nueva ruta estática `/title` (client-ready, lee `?type=&id=`) que renderiza
detalle de peli o serie; `/person?name=` y `/genre?id=&name=` igual.
Se borran `app/movie/[id]`, `app/tv/[id]`, `app/person/[name]`, `app/genre/[id]`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `app/title/page.tsx` | crear (lógica fusionada movie+tv) |
| `app/person/page.tsx` | crear (misma lógica actual) |
| `app/genre/page.tsx` | crear (misma lógica actual) |
| `app/movie/[id]`, `app/tv/[id]`, `app/person/[name]`, `app/genre/[id]` | eliminar |
| `components/Cards.tsx`, `FeaturedCarousel.tsx`, `ContinueWatching.tsx`, `MyList.tsx`, `app/page.tsx`, `app/list/page.tsx`, `app/search/page.tsx`, `app/watch/page.tsx`, `app/tv/[id]`(muere) | Links `/${type}/${id}` → `/title?type=&id=`; `/person/x` → `/person?name=`; `/genre/x` → `/genre?id=&name=` |

## Decisiones
- Una sola ruta `/title` con `type` en vez de dos: menos archivos y mismo fetch.
- `id`/`name` por query: compatible con export estático y con `useSearchParams`.

## Riesgos
- Olvidar algún Link → grep final `"/${` y `"/person/` `"/genre/`.
- Backlinks externos/SEO: se acepta (app, no web pública indexada).

## Verificación
- `npm run build`
- curl `/` 200 + grep sin segmentos `[`.
- Clic home → detalle → volver.
