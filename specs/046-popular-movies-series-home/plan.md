# Plan: Películas Populares y Series Populares en la Portada

## 1. Pasos de Implementación

1. **Paso 1: Actualizar `lib/dict.ts`**
   - Añadir claves `popular_movies` y `popular_series` para `es`, `en`, `pt`.

2. **Paso 2: Modificar `app/page.tsx`**
   - Importar `getMovies` y `getSeries` de `lib/catalog.ts`.
   - Reemplazar las llamadas a `getTrendingToday` y `getUpcoming` por `getMovies(1, 12)` y `getSeries(1, 12)`.
   - Conectar las secciones con los títulos traducidos e iconos correspondientes (`IconFilm` para películas, `IconTv` para series).

3. **Paso 3: Pruebas Automatizadas**
   - Crear `scripts/test-popular-home-sections.mjs` para verificar la presencia de ambas secciones populares y las llamadas a `getMovies` y `getSeries`.

4. **Paso 4: Compilación y Verificación**
   - Ejecutar suite de pruebas y `npm run build`.
