# Plan 056: Verificación de Disponibilidad de Contenido para RedeFlix

## 1. Arquitectura de la Solución

```
+-------------------------------------------------------------------------+
|                               Cliente                                   |
|                 (Solicita /api/resolve?type=...&id=...)                 |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        app/api/resolve/route.ts                         |
|  - Carga proveedores activos desde Supabase                             |
|  - Resuelve TMDB ID / IMDb ID                                           |
|  - Itera sobre proveedores:                                             |
|      ¿Es proveedor RedeFlix (id='redeflix' o 'redeflixapi.store')?       |
|         │                                                               |
|         ├── SÍ ──> isRedeflixAvailable(type, tmdbId, s, e)              |
|         │             ├── DISPONIBLE -> Incluir en sources             |
|         │             └── NO DISPONIBLE -> Filtrar y omitir            |
|         └── NO ──> Incluir según reglas estándar                        |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                     lib/redeflix-availability.ts                        |
|  Caché en memoria con TTL de 6 horas y estructuras O(1)                 |
|                                                                         |
|  1. Catálogo Películas (list-movie-ids.txt):                            |
|     - Set<string> con 23,500+ TMDB IDs                                  |
|     - Consulta: movieSet.has(tmdbId)                                    |
|                                                                         |
|  2. Catálogo Series (list-tv-ids.txt + animes/doramas opcional):        |
|     - Map<string, Record<season, Record<episode, url>>>                 |
|     - Consulta: tvMap.has(tmdbId) && tvMap.get(id)[s]?.[e]             |
+-------------------------------------------------------------------------+
```

## 2. Componentes e Implementación

### Archivo 1: `lib/redeflix-availability.ts`
- Variables de caché en memoria a nivel de módulo:
  - `cachedMovies: Set<string> | null`
  - `cachedTv: Map<string, Record<string, Record<string, string>>> | null`
  - `lastMovieFetch: number`
  - `lastTvFetch: number`
- Constantes:
  - `MOVIE_LIST_URL = "https://redeflixapi.store/list-movie-ids.txt"`
  - `TV_LIST_URL = "https://redeflixapi.store/list-tv-ids.txt"`
  - `CACHE_TTL_MS = 6 * 60 * 60 * 1000` (6 horas)
- Funciones:
  - `getMovieSet(): Promise<Set<string>>`
  - `getTvMap(): Promise<Map<string, Record<string, Record<string, string>>>>`
  - `isRedeflixAvailable({ type, tmdbId, season, episode }): Promise<boolean>`
  - `isRedeflixProvider(provider: { id?: string; movie_tpl?: string; tv_tpl?: string }): boolean`

### Archivo 2: `app/api/resolve/route.ts`
- Importar `isRedeflixProvider` e `isRedeflixAvailable` desde `@/lib/redeflix-availability`.
- En el bucle de proveedores (`for (const p of providersData)`):
  - Si `isRedeflixProvider(p)`:
    - Si no hay `effectiveTmdbId`, omitir.
    - Llamar a `await isRedeflixAvailable({ type, tmdbId: effectiveTmdbId, season: s, episode: e })`.
    - Si devuelve `false`, omitir `p` de `eligibleProviders`.
- Asegurar que la omisión no rompa los identificadores canónicos de los demás servidores (`S{ord}`).

### Archivo 3: `app/api/embed-url/route.ts`
- Validar `isRedeflixProvider` y comprobar `isRedeflixAvailable`. Si no está disponible, responder 404.

## 3. Plan de Pruebas y Validación

### Script: `scripts/test-redeflix-availability.mjs`
1. Probar parsing y validación unitaria de `isRedeflixAvailable`:
   - Película existente (TMDB 550) -> `true`.
   - Película inexistente (TMDB 999999999) -> `false`.
   - Serie existente con episodio existente (TMDB 1664 S1E1) -> `true`.
   - Serie existente con episodio inexistente (TMDB 1664 S1E99) -> `false`.
   - Serie inexistente (TMDB 999999999) -> `false`.
2. Probar integración con el endpoint `/api/resolve`:
   - Simular resolución con un título presente en RedeFlix -> RedeFlix aparece en `sources`.
   - Simular resolución con un título ausente en RedeFlix -> RedeFlix NO aparece en `sources`.
3. Ejecutar suite de pruebas de regresión existentes (`test-trailer-in-app.mjs`, `test-theaters-45-days.mjs`, `test-adblock-banners.mjs`).
4. Ejecutar `npm run build`.
