# Plan 054: Ventana de 45 Días para la Etiqueta "EN CINES"

## 1. Arquitectura y Flujo de Datos

```
+-------------------------------------------------------------+
|                      Datos de la Película                   |
|           { media_type: "movie", release_date: "YYYY-MM-DD" }|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   lib/theaters.ts: isMovieInTheaters()      |
|                                                             |
|  1. ¿Es serie (tv)? -------------------------> false        |
|  2. ¿Sin fecha de estreno válida? -----------> false        |
|  3. diffDays = Math.floor((todayUTC - releaseDateUTC)/86.4M)|
|     - Si diffDays < 0 (estreno futuro) ------> false        |
|     - Si 0 <= diffDays <= 45 ----------------> true (CINES) |
|     - Si diffDays >= 46 ---------------------> false        |
+------------------------------+------------------------------+
                               |
         +---------------------+---------------------+
         |                     |                     |
         v                     v                     v
+-----------------+   +-----------------+   +-----------------+
| Cards.tsx       |   | title/page.tsx  |   | watch/page.tsx  |
| Insignia sobre  |   | Badge "En Cines"|   | Badge "En Cines"|
| poster película |   | + Aviso CAM     |   | + Aviso CAM     |
+-----------------+   +-----------------+   +-----------------+
```

## 2. Fases de Implementación

### Fase 1: Motor de Cálculo y Regla en [`lib/theaters.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/theaters.ts)
- Implementar `getDaysSinceRelease(releaseDateStr: string): number | null`:
  - Parsea la fecha y compara con la fecha UTC actual a nivel de día (00:00:00 UTC).
- Actualizar `isMovieInTheaters(m: any): boolean`:
  - Descartar series de TV (`type === "tv"`, `media_type === "tv"`, `number_of_seasons`).
  - Obtener `daysSince` desde `m.release_date`.
  - Retornar `true` si `daysSince >= 0 && daysSince <= 45`.
  - Retornar `false` si `daysSince < 0` o `daysSince >= 46`.
  - Mantener soporte retrocompatible si el objeto trae `m.in_theaters === true` pero validando siempre que no supere los 45 días.

### Fase 2: Sincronización en Servidor y Catálogo
- **[`lib/theaters-server.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/theaters-server.ts)**:
  - Cambiar límite de ventana teatral de 90 a 45 días en el filtro de `getNowPlayingIds()`.
- **[`lib/catalog.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/catalog.ts)**:
  - Actualizar `tagInTheaters(items)` para que cualquier película con `0 <= daysSince <= 45` reciba `in_theaters: true`, eliminando el antiguo límite de 90 días.

### Fase 3: Pruebas Automatizadas y Verificación
- Crear `scripts/test-theaters-45-days.mjs`:
  - Prueba unitaria de día de estreno (`daysSince = 0`) → `true`.
  - Prueba de días intermedios (ej. día 10, día 30, día 45) → `true`.
  - Prueba de corte estricto en día 46 (`daysSince = 46`) → `false`.
  - Prueba de película vieja (`daysSince = 90`, `daysSince = 300`) → `false`.
  - Prueba de estreno futuro (`daysSince = -5`) → `false`.
  - Prueba de serie de TV con fecha reciente → `false`.
  - Prueba de integración en catálogo y tarjetas.
- Ejecutar build de producción (`npm run build`) y verificar que todos los suites pasen.
