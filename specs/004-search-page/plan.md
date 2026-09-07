# Plan: página de búsqueda TV (spec ./spec.md)

## Enfoque
- `app/api/search/route.ts`: `?q=&fresh=` → `searchAll` o trending; idioma por cookie.
- `app/search/page.tsx` → cliente: teclado ES + input + resultados.
- `components/ProvidersDot.tsx`: detector extraído del Header.
- Header: solo logo. SideNav + bottom bar: item Buscar (6 tabs).
- `lib/catalog.ts`: `getTrending(n)`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `app/api/search/route.ts` | crear |
| `app/search/page.tsx` | reescribir cliente |
| `components/ProvidersDot.tsx` | crear (mover lógica Header) |
| `components/Header.tsx` | solo logo |
| `components/SideNav.tsx` | item Buscar |
| `lib/catalog.ts` | `getTrending` |

## Riesgos
- Teclado en pantalla + foco: usar `data-rail` y botones nativos.
- Doble fetch inicial (StrictMode dev): aceptable; prod OK.

## Verificación
- `npm run build`, curl `/search` y `/api/search`, recorrido con Tab.
