# Tareas de Implementación - Spec 104

- [x] 1. Notificación en Esquina Superior Derecha (`cornerNotice`)
  - [x] 1.1 Implementar estado y función `showCornerNotice(icon, text, iconColor)` con temporizador auto-dismiss de 2200ms en `NativeSourcePlayer.tsx`.
  - [x] 1.2 Migrar avisos de `selectAudioTrack` y `selectSubtitleTrack` a `showCornerNotice`.
  - [x] 1.3 Unificar el renderizado de la píldora en `top-4 right-4` manteniendo el diseño translúcido de `resumeNotice`.
- [x] 2. Solución del Auto-Ocultamiento de Controles
  - [x] 2.1 Crear refs para `showAudioMenuRef`, `showSubtitlesMenuRef`, `showSettingsRef`, `showEpisodesDrawerRef` e `isDraggingRef`.
  - [x] 2.2 Actualizar `resetHideTimer` para evaluar los `.current` de las referencias evitando stale closures.
  - [x] 2.3 Añadir `useEffect` de auto-rearme del hide timer al cerrar cualquier menú.
  - [x] 2.4 Corregir el `onClick` del contenedor para cerrar `showAudioMenu`.
- [x] 3. Verificación y Despliegue
  - [x] 3.1 Ejecutar suite de pruebas de consistencia.
  - [x] 3.2 Compilación `npm run build` sin errores.
  - [x] 3.3 Commit y push con la especificación completa.
