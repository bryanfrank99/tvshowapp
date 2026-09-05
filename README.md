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

## Servidores: cada uno gestiona los suyos (sin recompilar)

La lista de servidores **no está en el código**: vive en un JSON externo que cada
despliegue configura con `NEXT_PUBLIC_PROVIDERS_URL`. Así nadie depende de la
lista de otra persona.

1. Copia `public/providers.json` a tu propio host (un gist de GitHub, cualquier
   archivo estático con CORS abierto).
2. En tu `.env.local` pon `NEXT_PUBLIC_PROVIDERS_URL=https://tu-url/providers.json`.
3. Reinicia (`npm run dev` / redespliega). El detector del header pasa a 🟢 con tu conteo.

Si la variable se deja vacía, la app usa el `/providers.json` local incluido.
Si tu URL falla, se usa la lista integrada de `lib/providers.ts` como respaldo.

### Esquema del JSON

Bloque `providers` (reproductores de pelis/series) y `live` (fuentes de TV en vivo):

```json
{
  "providers": [
    { "id": "vidzy", "name": "Vidzy", "needsTmdb": true,
      "movie": "https://vidzy.org/movie/{id}?autoplay=1",
      "tv": "https://vidzy.org/serie/{id}/{s}/{e}?autoplay=1&autonext=1" }
  ],
  "live": [
    { "id": "tvf90", "name": "Agenda deportiva", "format": "tvf90",
      "list": "https://tvf90.com/status.json" }
  ]
}
```

- Placeholders reproductores: `{id} {s} {e} {key} {idparam}`
  (`{idparam}` = `imdb=tt…` o `tmdb=…`; `{key}` sale de `key` o `NEXT_PUBLIC_VIMEUS_VIEW_KEY`).
- `needsTmdb: true` convierte IMDb→TMDB solo vía Cinemeta.
- Formatos live soportados: `streambetter` y `tvf90`.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción

## Notas

- Navegable con mando de TV (flechas + OK + Atrás) y foco visible.
- Seguir viendo, Mi lista y servidor elegido viven en `localStorage` (por navegador).
