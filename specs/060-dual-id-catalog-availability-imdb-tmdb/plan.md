# Plan 060: Soporte Dual de Identificadores (IMDb y TMDB) en la Comprobación de Disponibilidad

## 1. Arquitectura de Identificadores Duales

```
                                 Título solicitado
                         (rawId: TMDB numérico o IMDb "tt...")
                                        │
                                        ▼
                           RESOLVER DE IDENTIFICADORES
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
             effectiveTmdbId                       effectiveImdbId
               (ej. 969681)                         (ej. tt6263850)
                     │                                     │
                     └──────────────────┬──────────────────┘
                                        │
                                        ▼
                          isRedeflixAvailable (Unified)
             { tmdbId: effectiveTmdbId, imdbId: effectiveImdbId, ... }
                                        │
                ┌───────────────────────┴───────────────────────┐
                ▼                                               ▼
         PROBE URL MODE                                  BATCH LIST MODE
    - {tmdb} -> effectiveTmdbId                     - TXT/JSON con IDs TMDB o IMDb
    - {imdb} -> effectiveImdbId                     - movieSet.has(tmdb) || movieSet.has(imdb)
    - {id}   -> TMDB (o IMDb según needs_tmdb)      - tvMap.has(tmdb) || tvMap.has(imdb)
    - Soporta URLs con {tmdb} y {imdb} juntos
```

## 2. Componentes e Implementación

### 1. `lib/redeflix-availability.ts`
- Actualizar interfaces:
  ```ts
  export interface RedeFlixCheckOptions {
    type: "movie" | "tv";
    tmdbId?: string | number | null;
    imdbId?: string | number | null;
    season?: string | number | null;
    episode?: string | number | null;
    movieListUrl?: string | null;
    tvListUrl?: string | null;
    animeListUrl?: string | null;
    doramaListUrl?: string | null;
    needsTmdb?: boolean;
  }
  ```
- Actualizar `interpolateProbeUrl`:
  ```ts
  export function interpolateProbeUrl(
    template: string,
    params: {
      id?: string | number | null;
      tmdbId?: string | number | null;
      imdbId?: string | number | null;
      season?: string | number | null;
      episode?: string | number | null;
      needsTmdb?: boolean;
    }
  ): string
  ```
  - Reemplaza `{tmdb}` con `tmdbId || id`.
  - Reemplaza `{imdb}` con `imdbId || id`.
  - Reemplaza `{id}` con `(needsTmdb === false && imdbId) ? imdbId : (tmdbId || id || imdbId)`.
  - Reemplaza `{s}`, `{season}`, `{e}`, `{episode}`.
- Actualizar `normalizeProbeUrl`:
  - Detecta patrones `tt\d+` para normalizar a `{imdb}`:
    ej. `.../movie/tt6263850` → `.../movie/{imdb}`.
  - Detecta patrones numéricos para normalizar a `{tmdb}` (o `{id}`).
- Actualizar `getRedeflixMovieSet` y `getRedeflixTvMap`:
  - En JSON: indexa tanto `id_tmdb` / `tmdb_id` como `id_imdb` / `imdb_id`.
  - En TXT: añade cualquier ID (sea numérico o empiece por `tt`).
- Actualizar `isRedeflixAvailable`:
  - Ya no rechaza IDs si empiezan por `tt`. Si solo se pasó `tmdbId` con valor `tt...`, lo trata automáticamente como `imdbId`.
  - En modo Probe: interpola con `tmdbId` e `imdbId`.
  - En modo Batch: verifica si el set o map contiene `tmdbId` O `imdbId`.

### 2. `app/api/resolve/route.ts`
- Asegurar que `effectiveTmdbId` y `effectiveImdbId` se resuelvan bidireccionalmente cuando haya proveedores que requieran disponibilidad o necesiten TMDB/IMDb.
- Al verificar disponibilidad, pasar:
  ```ts
  const isAvail = await isRedeflixAvailable({
    type,
    tmdbId: effectiveTmdbId,
    imdbId: effectiveImdbId,
    season: s,
    episode: e,
    movieListUrl,
    tvListUrl,
    animeListUrl,
    doramaListUrl,
    needsTmdb: p.needs_tmdb,
  });
  ```

### 3. `app/api/admin/providers/route.ts`
- En la acción `test_availability`:
  - Recibe o calcula `tmdbId` e `imdbId` por defecto:
    - Películas: `tmdbId: "969681"`, `imdbId: "tt6263850"`
    - Series: `tmdbId: "1396"`, `imdbId: "tt0903747"`
  - Pasa ambos IDs al evaluador `isRedeflixAvailable`.

### 4. `app/admin/page.tsx`
- En la sección del modal "Comprobación de Disponibilidad de Catálogo (Opcional)":
  - Documentar los placeholders: `{id}`, `{tmdb}`, `{imdb}`, `{s}`, `{e}`.
  - Explicar que la URL puede usar IMDb (ej. `{imdb}`), TMDB (ej. `{tmdb}`) o ambos.
  - En las pruebas de muestra, indicar que se prueban automáticamente ambos identificadores (ej. TMDB 969681 / IMDb tt6263850).

## 3. Pruebas y Verificación
- Crear `scripts/test-dual-id-catalog-availability.mjs`:
  1. Test de Probe URL con `{imdb}` (`https://api.example.com/movie/{imdb}`).
  2. Test de Probe URL con `{tmdb}` (`https://api.example.com/movie/{tmdb}`).
  3. Test de Probe URL con ambos `{tmdb}` y `{imdb}` (`https://api.example.com/check?tmdb={tmdb}&imdb={imdb}`).
  4. Test de Batch List con catálogo mixto de IDs (algunos títulos con TMDB y otros con IMDb).
  5. Test de resolución dual en el resolver de fuentes.
- Ejecutar suite completa y `npm run build`.
