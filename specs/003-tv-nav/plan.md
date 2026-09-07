# Plan: navbar izquierda + espacial (spec ./spec.md)

## Enfoque
1. `components/SideNav.tsx`: rail fijo izquierdo (lg+), iconos + etiquetas que
   aparecen con foco/hover (ancho animado). Reordena layout con `lg:pl-16`.
2. `components/TvNav.tsx`: manejador global de flechas —
   - `data-rail` en rails/cuadrículas: izq/der = foco previo/siguiente visible.
   - arriba/abajo = elemento más cercano en X en el rail anterior/siguiente.
   - Solo actúa si el foco está dentro de un rail (no rompe inputs).
3. Memoria: `sessionStorage` guarda selector del foco por pathname; al volver se restaura.
4. CSS: foco con escala + anillo en tarjetas/links.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `components/SideNav.tsx` | crear |
| `components/TvNav.tsx` | reescribir (espacial + memoria) |
| `app/layout.tsx` | montar SideNav + padding |
| `app/globals.css` | foco TV (escala) |
| `app/page.tsx`, `app/live/page.tsx`, `app/list/page.tsx`, `components/ContinueWatching.tsx`, `components/MyList.tsx` | `data-rail` en rails/grids |

## Decisiones
- Sin libs externas (navegación propia, ~80 líneas).
- Top menu desktop se conserva (mockup trae ambos).

## Riesgos
- Diferencias de spatial entre navegadores TV → el manejador propio lo uniforma.
- Iframes (player) capturan flechas: fuera del player todo funciona; dentro manda el proveedor.

## Verificación
- `npm run build` + recorrido solo-teclado en desktop (Tab/flechas).
