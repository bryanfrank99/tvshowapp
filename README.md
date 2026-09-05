# TVShow — Catálogo + Player multi-servidor

App Next.js 14 + TypeScript + Tailwind. Indexa películas/series (TMDB o modo free
Cinemeta + TVMaze con IDs IMDb) y las reproduce vía iframes de proveedores configurables.

No aloja video: solo indexa IDs/posters/metadata y embebe reproductores de terceros.

## Requisitos

- Node 18+

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellena tus keys
npm run dev                  # http://localhost:3000
```

## Variables (.env.local)

| Var | Obligatoria | Descripción |
| --- | --- | --- |
| `TMDB_API_KEY` | No | Key gratuita de themoviedb.org. Sin ella, modo free (Cinemeta + TVMaze). |
| `NEXT_PUBLIC_PROVIDERS_URL` | No | URL del JSON de servidores. Por defecto `/providers.json`. |
| `NEXT_PUBLIC_VIMEUS_VIEW_KEY` | Solo si usas Vimeus | View key de tu panel Vimeus. |

## Servidores (sin recompilar)

La lista vive en un JSON externo: `NEXT_PUBLIC_PROVIDERS_URL`
(ej. `https://raw.githubusercontent.com/.../providers.json`).
Edítalo para agregar/quitar servidores. Esquema por entrada:

```json
{ "id": "vidzy", "name": "Vidzy", "needsTmdb": true,
  "movie": "https://vidzy.org/movie/{id}?autoplay=1",
  "tv": "https://vidzy.org/serie/{id}/{s}/{e}?autoplay=1&autonext=1" }
```

Placeholders: `{id} {s} {e} {key} {idparam}` (`{idparam}` = `imdb=tt…` o `tmdb=…`).
`needsTmdb: true` convierte IMDb→TMDB solo vía Cinemeta. Si el JSON falla,
se usa la lista integrada de `lib/providers.ts`.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción

## Notas

- Navegable con mando de TV (flechas + OK + Atrás) y foco visible.
- Seguir viendo, Mi lista y servidor elegido viven en `localStorage` (por navegador).
