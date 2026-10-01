# Tareas de Implementación - Spec 105

- [x] 1. Auto-ocultamiento del Sistema de Navegación del Reproductor
  - [x] 1.1 Eliminar la llamada destructiva `clearTimeout(hideTimerRef.current)` del cleanup del listener `keydown` en `NativeSourcePlayer.tsx`.
  - [x] 1.2 Usar `showControlsRef` para desacoplar el listener `keydown` del estado `showControls` y evitar re-suscripciones constantes.
  - [x] 1.3 Actualizar `autoFocusFullscreen` para usar `resetHideTimer()` en lugar de dejar `showControls` abierto sin temporizador.
- [x] 2. Modo de Entrega por Proveedor (HLS / EMBED / AMBOS) en API
  - [x] 2.1 Cargar y retornar `provider_stream_modes` en `GET` de `app/api/admin/providers/route.ts`.
  - [x] 2.2 Soportar `action: "set_provider_stream_mode"` y persistencia en `PUT` de `app/api/admin/providers/route.ts`.
  - [x] 2.3 Aplicar filtrado por `provider_stream_modes` en `app/api/resolve/route.ts` (HLS, EMBED o AMBOS).
- [x] 3. Panel de Administración de Servidores
  - [x] 3.1 Eliminar el banner estático obsoleto "Modo Servidores: 100% Streams HLS Nativos..." en `app/admin/page.tsx`.
  - [x] 3.2 Añadir selector directo HLS / EMBED / AMBOS en cada fila de proveedor en `app/admin/page.tsx`.
  - [x] 3.3 Añadir selector de modo en el modal de edición de proveedor (`openEditProv`).
- [x] 4. Verificación y Despliegue
  - [x] 4.1 Compilar proyecto con `npm run build` certificando cero errores.
  - [x] 4.2 Commit y push de la especificación completa a `main`.
