# Tasks 054: Ventana de 45 Días para la Etiqueta "EN CINES"

- [x] 1. Implementar cálculo de días y regla de 45 días en `lib/theaters.ts`
  - [x] Añadir helper `getDaysSinceRelease(releaseDateStr)`
  - [x] Actualizar `isMovieInTheaters(m)` para aplicar `0 <= daysSince <= 45`
- [x] 2. Sincronizar ventana de 45 días en el servidor (`lib/theaters-server.ts`)
- [x] 3. Sincronizar asignación de etiqueta en catálogo (`lib/catalog.ts`)
- [x] 4. Crear suite de pruebas automatizadas `scripts/test-theaters-45-days.mjs`
- [x] 5. Ejecutar suite de pruebas y verificar `npm run build`
