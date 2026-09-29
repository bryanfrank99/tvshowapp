# Plan 059: Sistema Flexible de Disponibilidad de Catálogo

## 1. Arquitectura de Verificación de Catálogo

```
                                  URL de Disponibilidad
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        [¿Contiene {id} o formato probe?]            [¿Es lista global TXT o JSON?]
                     │                                             │
                     ▼                                             ▼
          PROBE PUNTUAL (On-Demand)                    BATCH CATALOG (Bulk List)
     - Interpolación: {id}, {s}, {e}               - Descarga periódica con TTL 6h
     - Petición HTTP rápida (HEAD/GET)             - Soporte: TXT (líneas),
     - Evaluación de status (200 vs 404)             JSON (array IDs, array objetos,
     - Detección de mensajes "não encontrado"        estructura con items y episodios)
     - Caché en memoria con TTL 30m                - Búsqueda en memoria O(1) (Set/Map)
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            ▼
                           Resultado: ¿Disponible en el servidor?
                                    (true / false)
```

## 2. Modificaciones a Realizar

### 1. `lib/redeflix-availability.ts`
- Implementar utilidades:
  - `isProbeUrl(url: string)`: detecta si la URL es una plantilla de comprobación puntual (contiene `{id}`, `{tmdb}`, `{s}`, etc., o patrón como `/movie/\d+` o `/tvshow/\d+/\d+/\d+`).
  - `normalizeProbeUrl(url: string, type: "movie" | "tv")`: convierte URLs con IDs concretos ingresados por error o como ejemplo (ej. `.../movie/969681` → `.../movie/{id}`) a plantilla estándar.
  - `interpolateProbeUrl(template: string, params: { id: string; season?: string | number; episode?: string | number })`: interpola `{id}`, `{tmdb}`, `{imdb}`, `{s}`, `{season}`, `{e}`, `{episode}`.
  - `probeUrlAvailability(url: string)`: ejecuta petición HEAD/GET con timeout de 3.5s, verifica código 200 vs 404/500 y mensajes de texto ("não encontrado", "not found"). Almacena en `probeCache` con TTL de 30m.
  - Actualizar `getRedeflixMovieSet`: si la URL es JSON, parsear array de IDs, array de objetos (`item.id || item.id_tmdb || item.tmdb_id`), o diccionario de claves.
  - Actualizar `isRedeflixAvailable`:
    - Si `movieListUrl` o `tvListUrl` es un Probe URL, ejecuta `probeUrlAvailability`.
    - Si es Batch List, ejecuta `getRedeflixMovieSet` o `getRedeflixTvMap`.
  - Exportar `checkCatalogAvailability` como alias moderno de `isRedeflixAvailable` preservando ambos nombres.

### 2. `app/api/admin/providers/route.ts`
- Enriquecer endpoint para permitir probar URLs de comprobación con una acción `test_availability`:
  - `POST` o `PUT` con `{ action: "test_availability", url, type, tmdbId, season, episode }`.
  - Ejecuta la prueba en el servidor (evitando problemas de CORS en el navegador) y retorna `{ available: boolean, status: number, reason: string }`.

### 3. `app/admin/page.tsx`
- Actualizar el título y descripción de la sección:
  "Comprobación de Disponibilidad de Catálogo (Opcional)"
  "Configura cómo verificar si este servidor tiene un título antes de mostrarlo: puede ser una lista en lote (.txt o .json con todos los IDs), una API de catálogo, o un link de comprobación puntual (ej. https://v2.watchplay.shop/movie/{id} o https://v2.watchplay.shop/tvshow/{id}/{s}/{e})."
- Botón interactivo "Probar URL" junto a los campos de disponibilidad que llama al endpoint `/api/admin/providers` (`action: "test_availability"`).
- Normalización automática si el administrador pega `https://v2.watchplay.shop/movie/969681`, sugiriendo o transformando a `https://v2.watchplay.shop/movie/{id}`.

### 4. `app/api/resolve/route.ts`
- Asegurar que cualquier servidor con `movie_list_url` o `tv_list_url` use la verificación unificada con TMDB ID.

## 3. Verificación
- Crear `scripts/test-flexible-catalog-availability.mjs`:
  1. Test de Probe URL para películas (`https://v2.watchplay.shop/movie/{id}`): ID 969681 disponible, ID inexistente no disponible.
  2. Test de Probe URL para series (`https://v2.watchplay.shop/tvshow/{id}/{s}/{e}`): ID 1396 T1E1 disponible, episodio/serie inexistente no disponible.
  3. Test de Batch List TXT (RedeFlix).
  4. Test de Batch List JSON (array de IDs, array de objetos).
  5. Test de normalización automática de URLs con números a plantillas `{id}`.
- Ejecución de pruebas y `npm run build`.
