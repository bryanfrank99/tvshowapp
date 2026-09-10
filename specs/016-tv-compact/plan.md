# Plan: TV compact

## Enfoque
- Bajar `html:has(body.tv)` a 55% y ajustar solo bajo `body.tv` para no tocar web.
- Grids: `sm:grid-cols-4`→5-6 cols, `lg:grid-cols-6`→7-8 cols en TV con `!important`.
- Top 10: mantener 2 cols pero reducir padding/imagen vía `body.tv` y/o hacer 3 cols en TV grande.
- Verificar que `useIsTV` ya no contamina web (fix previo).

## Archivos
| Archivo | Cambio |
| --- | --- |
| `app/globals.css` | font 55%, hero 10/14rem, rail 96px, grids 5/7-8 cols, Top10 compact |
| `components/Cards.tsx` | Top10 padding/imagen condicional TV (opcional) |

## Riesgos
- Escapar `:` en clases Tailwind (`sm\:grid-cols-4`).

## Verificación
- `npm run build` + captura TV vs web.
