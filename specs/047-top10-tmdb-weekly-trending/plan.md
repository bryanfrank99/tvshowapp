# Plan: Tendencia semanal de TMDB

## 1. Pasos de Implementación

1. **Paso 1: Actualizar `lib/dict.ts`**
   - Actualizar `top10` en `es`, `en`, `pt`:
     - `es`: `"Tendencia semanal de TMDB"`
     - `en`: `"TMDB Weekly Trending"`
     - `pt`: `"Tendência semanal do TMDB"`

2. **Paso 2: Actualizar `lib/catalog.ts`**
   - En `getTop10ImdbWeek` (y exportar `getTop10TmdbWeek`), respetar el orden nativo de popularidad de `/trending/all/week` de TMDB sin reordenar por `vote_average`.

3. **Paso 3: Pruebas Automatizadas**
   - Crear `scripts/test-tmdb-weekly-trending.mjs` para verificar el nuevo título del diccionario y el orden nativo de TMDB.

4. **Paso 4: Compilación y Verificación**
   - Ejecutar `npm run build` y suites de regresión.
