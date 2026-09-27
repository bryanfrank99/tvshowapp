# Plan: Actualización de Marca a "TVShow - Indexador"

## 1. Pasos de Ejecución

1. **Paso 1: Modificar `app/layout.tsx`**
   - Actualizar `metadata.title` a `"TVShow - Indexador"`.
2. **Paso 2: Modificar `app/title/page.tsx`**
   - Actualizar `fallback.title` a `"TVShow - Indexador"`.
3. **Paso 3: Modificar `electron/main.js`**
   - Actualizar el título de la ventana en `BrowserWindow` a `'TVShow - Indexador'`.
4. **Paso 4: Actualizar `fastlane/metadata/android/short_description.txt`**
   - Actualizar la descripción a "Indexador de películas, series y TV en vivo con bloqueo de anuncios integrado."
5. **Paso 5: Pruebas y Compilación**
   - Crear `scripts/test-brand-title.mjs` que verifique la ausencia total de "Catálogo + Player" y la presencia de "TVShow - Indexador".
   - Ejecutar `npm run build`.
