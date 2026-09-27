# Plan: Eliminación de Episode Spotlight y Actualización a Tendencias de Hoy

## 1. Pasos de Ejecución

1. **Paso 1: Actualizar Diccionario (`lib/dict.ts`)**
   - Modificar las claves `toppicks` en `es`, `en` y `pt`:
     - `es`: `"Tendencias de hoy"`
     - `en`: `"Trending today"`
     - `pt`: `"Tendências de hoje"`

2. **Paso 2: Exponer `getTrendingToday` en `lib/catalog.ts`**
   - Crear función `getTrendingToday(page = 1, per = 12)` basada en `/trending/all/day?page=${page}`, garantizando el mismo tipado y rendimiento con caché.

3. **Paso 3: Actualizar `app/page.tsx`**
   - Eliminar `getEpisodeSpotlight` del `Promise.all` y de las importaciones.
   - Eliminar el bloque `<Section title={... text={d.spotlight} />`.
   - Limpiar importaciones no utilizadas (`SpotCard`, `IconFilm`).
   - Usar `getTrendingToday(1, 12)` para la sección `d.toppicks` ("Tendencias de hoy").

4. **Paso 4: Pruebas Automatizadas**
   - Crear `scripts/test-home-sections.mjs` para verificar la ausencia de Episode Spotlight y la presencia de Tendencias de Hoy.

5. **Paso 5: Compilación y Despliegue**
   - Ejecutar `npm run build` y asegurar cero regresiones.
