# Tasks: Spec 071 - Configuración de Pools HLS como Servidores Prioritarios

- [x] **Tarea 1: Resolver y Ordenamiento por Prioridad (`lib/sources.ts` y `app/api/resolve/route.ts`)**
  - [x] Hacer que `sortSourcesByPriority` reconozca `"hls"` para fuentes con `type === "hls"` o `providerName === "HLS"`.
  - [x] Garantizar aislamiento lingüístico: solo asignar la prioridad de `hls` a pools HLS compatibles con el idioma del usuario.

- [x] **Tarea 2: Interfaz de Administración (`app/admin/page.tsx`)**
  - [x] Agregar la opción especial `⚡ Pool HLS Nativo (Multi-Stream)` en el dropdown de selección de prioridades por idioma.
  - [x] Renderizar tarjeta visual especializada cuando `"hls"` esté en la lista de prioridades con botones de orden (▲, ▼, ✕).
  - [x] Añadir botón de acceso directo "Fijar como Prioridad #1" en las tarjetas del panel de Pools HLS por idioma con autoguardado.

- [x] **Tarea 3: Verificación y Pruebas**
  - [x] Crear script de prueba automatizado `scripts/test-hls-pool-priority.mjs` que valida ordenamiento y aislamiento (9/9 pruebas superadas).
  - [x] Validar con `npx tsc --noEmit` (0 errores de compilación).
