# Plan: skeletons (spec ./spec.md)

## Enfoque
1. `components/Skeleton.tsx`: `Shimmer` base (CSS pulse) + `CardSkeleton`,
   `HeroSkeleton`, `RailSkeleton(n)`, `GridSkeleton(n)`, `TextSkeleton`.
2. `app/loading.tsx`: hero + 3 rails (home).
3. `app/title/loading.tsx`, `app/person/loading.tsx`, `app/genre/loading.tsx`,
   `app/movies/loading.tsx`, `app/series/loading.tsx`: variantes acordes.
4. Cliente: search (grid skeleton al buscar), live (cards skeleton),
   list (montaje), watch (player skeleton mientras resuelve/carga).
5. CSS shimmer en `globals.css` (gradiente animado, respeta
   `prefers-reduced-motion`).

## Archivos
| Archivo | Cambio |
| --- | --- |
| `components/Skeleton.tsx` | crear |
| `app/loading.tsx`, `app/title/loading.tsx`, `app/person/loading.tsx`, `app/genre/loading.tsx`, `app/movies/loading.tsx`, `app/series/loading.tsx` | crear |
| `app/search/page.tsx`, `app/live/page.tsx`, `app/list/page.tsx`, `app/watch/page.tsx` | estados skeleton |
| `app/globals.css` | keyframes shimmer |

## Riesgos
- `loading.tsx` requiere Suspense implícito: funciona por defecto en app router.

## Verificación
- `npm run build`, throttle en DevTools, curl 200.
