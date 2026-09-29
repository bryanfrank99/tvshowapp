# Tasks 060: Soporte Dual de Identificadores (IMDb y TMDB) en la Comprobación de Disponibilidad

- [x] Task 1: Actualizar `lib/redeflix-availability.ts` para soportar `{imdb}`, `{tmdb}` e `{id}` dual, catálogos mixtos y eliminación de restricción anti-tt <!-- id: 060-task-1 -->
- [x] Task 2: Actualizar `app/api/resolve/route.ts` para resolver ambos IDs (IMDb y TMDB) y pasarlos a la comprobación de disponibilidad <!-- id: 060-task-2 -->
- [x] Task 3: Actualizar `app/api/admin/providers/route.ts` para soportar ambos IDs en `test_availability` <!-- id: 060-task-3 -->
- [x] Task 4: Actualizar `app/admin/page.tsx` con documentación de placeholders `{tmdb}` y `{imdb}` y pruebas duales <!-- id: 060-task-4 -->
- [x] Task 5: Crear script de pruebas automatizado `scripts/test-dual-id-catalog-availability.mjs` y verificar los casos de uso <!-- id: 060-task-5 -->
- [x] Task 6: Ejecutar suite completa de regresión y `npm run build` <!-- id: 060-task-6 -->
