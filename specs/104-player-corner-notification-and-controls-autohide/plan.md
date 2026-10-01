# Plan de Implementación - Spec 104

## Arquitectura y Componentes Afectados

### 1. `components/player/NativeSourcePlayer.tsx`
- **Gestión de Notificaciones en Esquina (`cornerNotice`)**:
  - Definir estado `cornerNotice: { icon: string; text: string; iconColor?: string } | null`.
  - Crear función auxiliar `showCornerNotice(icon: string, text: string, iconColor?: string)` que actualiza el estado y gestiona un timer independiente de 2000-2200ms.
  - Reemplazar `setResumeNotice(...)` para unificarse o coexistir limpiamente en la misma posición visual.
  - Reemplazar `triggerFeedback` en `selectAudioTrack` y `selectSubtitleTrack` por llamadas a `showCornerNotice`.
  - Opcional: permitir a `changeSpeed` usar `showCornerNotice` para mantener la pantalla central despejada.
  - Renderizar en el JSX la píldora en la esquina superior derecha (`top-4 right-4 sm:top-5 sm:right-6 z-40 pointer-events-none animate-fade-in`).

- **Refactorización de `resetHideTimer` y Estados de Menús**:
  - Mantener referencias mutables sincronizadas:
    - `showAudioMenuRef`
    - `showSubtitlesMenuRef`
    - `showSettingsRef`
    - `showEpisodesDrawerRef`
    - `isDraggingRef`
  - Reemplazar la evaluación en `resetHideTimer` para que consulte `ref.current` en lugar de los valores capturados por closure.
  - Reducir el tiempo de inactividad a 3500ms para una experiencia más ágil.
  - Añadir efecto reactivo (`useEffect`) que vigile el cierre de menús (`showAudioMenu`, `showSubtitlesMenu`, `showSettings`, `showEpisodesDrawer`) y llame inmediatamente a `resetHideTimer()` cuando todos los menús estén cerrados y el video esté reproduciéndose.
  - En el `onClick` del contenedor exterior, incluir `if (showAudioMenu) setShowAudioMenu(false);`.

### 2. Verificación
- Escribir test script que verifique:
  - Presencia del componente toast corner sin modal central para audio/subtítulos.
  - Invocación de `resetHideTimer` con refs sincronizados.
- Ejecutar `npm run build` para validar cero errores de tipado o compilación.
