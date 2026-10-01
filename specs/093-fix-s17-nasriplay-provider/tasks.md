# Tareas: Spec 093 - Corrección Integral de S17 (NasriPlay)

- [x] **Tarea 1: Base de Datos y Configuración de S17**
  - [x] Actualizar registro `nasriplay` en `providers` (plantillas embed y URLs de lista vacías).
  - [x] Limpiar `nasriplay` de `provider_availability_urls` en tabla `config`.

- [x] **Tarea 2: Optimizar `lib/nasriplay.ts`**
  - [x] Priorizar `directUrl` presente directamente en la respuesta de la API de NasriPlay sin sobrecargar llamadas.
  - [x] Evitar saturación de peticiones `/server-url` para prevenir bloqueos HTTP 429.
  - [x] Reducir la latencia total de extracción a <2.5s.

- [x] **Tarea 3: Crear Endpoint `app/api/nasriplay/route.ts`**
  - [x] Crear ruta API para consultar streams y persistir en caché de base de datos.
  - [x] Añadir cabeceras CORS y soporte para redirect.

- [x] **Tarea 4: Actualizar `app/watch/page.tsx`**
  - [x] Cambiar la extracción client-side en `extractionTasks` por fetch hacia `/api/nasriplay`.
  - [x] Cambiar la extracción en `onSelectSource` por fetch hacia `/api/nasriplay`.

- [x] **Tarea 5: Pruebas y Certificación**
  - [x] Crear `scripts/test-nasriplay-provider.mjs` y verificar resolución HLS y unificada de S17.
  - [x] Ejecutar `npm run build` y certificar 0 errores.
