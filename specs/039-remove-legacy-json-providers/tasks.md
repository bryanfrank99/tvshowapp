# Tasks: Eliminación del Sistema de Proveedores Legacy Basado en JSON

- [x] 1. Eliminar el archivo `public/providers.json`.
- [x] 2. Limpiar `lib/providers.ts` eliminando la función obsoleta `providersUrl()`.
- [x] 3. Eliminar el bloque de fallback a `public/providers.json` en `app/api/admin/live/health-check/route.ts`.
- [x] 4. Actualizar `scripts/supabase.mjs` y pruebas de regresión para eliminar la dependencia de `public/providers.json`.
- [x] 5. Crear y ejecutar `scripts/test-remove-json-providers.mjs`.
- [x] 6. Ejecutar `npm run build` para asegurar la compilación limpia.
