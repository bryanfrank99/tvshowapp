# TVShow — Catálogo + Player multi-servidor

App Next.js 14 + TypeScript + Tailwind. Indexa películas/series (TMDB o modo free
Cinemeta + TVMaze con IDs IMDb) y las reproduce vía iframes de proveedores configurables.

No aloja video: solo indexa IDs/posters/metadata y embebe reproductores de terceros.

![Vista principal de la app](./public/tvshowapp.png)

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
  "version": "1",
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
- **`version` (recomendado)**: súbelo en cada cambio (1, 2, 3…). La web lo muestra
  en el header (`(8) v3`) y en el reproductor (`lista v3`): así verificas de un
  vistazo que cargó la versión correcta y no una caché vieja.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción
- `npm version patch|minor|major` — sube la versión de la app
  (se muestra en el footer como `vX.Y.Z`)
- `npm run sync -- movie:550 tv:1399 --lang es,en,pt` — vuelca TMDB a SQLite

## Caché SQLite (`data/tmdb.db`, sin imágenes)

Con key TMDB, el detalle de pelis/series/personas se guarda en SQLite local
(detalle, géneros, créditos, temporadas, episodios, IMDb id) con caducidad de
7 días: las visitas no pegan a la API si hay dato fresco. Precarga con:

```bash
# en .env.local: TMDB_API_KEY=tu_key
npm run sync -- movie:550 tv:1399 person:3223 --lang es,en,pt
npm run sync -- --popular movie 10 --lang es
npm run sync -- --trending tv --lang es
```

El `.db` está en `.gitignore`. En Vercel el FS es efímero: funciona como
caché por instancia (se rellena solo al visitar).

## Notas

- Navegable con mando de TV (flechas + OK + Atrás) y foco visible.
- Seguir viendo, Mi lista y servidor elegido viven en `localStorage` (por navegador).
