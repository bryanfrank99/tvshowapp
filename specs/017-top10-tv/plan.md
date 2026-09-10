# Plan: Top 10 TV = web

## Enfoque
- Aislar Top 10 con clase `top10` en el grid de `app/page.tsx`.
- En `app/globals.css` revertir overrides TV que tocaban `.md:grid-cols-2` (3 cols + padding) y reemplazar por regla `body.tv .top10 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: web }` y reset de font/padding.
- Dejar `sm:grid-cols-4`/`lg:grid-cols-6` (Upcoming etc.) en 6/8 cols solo TV.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `app/page.tsx` | añadir `top10` al grid de Top 10 |
| `app/globals.css` | quitar `body.tv .md:grid-cols-2` 3cols + spans, añadir `body.tv .top10` 2cols web |

## Riesgos
- Selectores `md\:grid-cols-2` genéricos afectarían otros grids; usar `.top10`.

## Verificación
- `npm run build` + captura TV vs web.
