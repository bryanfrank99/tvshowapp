# Spec 104: Notificación No Invasiva en Esquina Superior y Auto-Ocultamiento Fiable de Controles en el Reproductor

## 1. Contexto y Problema
En la versión anterior del reproductor nativo (`NativeSourcePlayer.tsx`):
1. **Cartel OSD Central Invasivo**: Al alternar pistas de audio o subtítulos, se activaba `triggerFeedback`, el cual pintaba un recuadro oscuro centrado (`osdFeedback`) en mitad del encuadre del video. Esto bloquea la visualización del contenido y genera una experiencia molesta e incómoda.
2. **Bloqueo del Auto-Ocultamiento de Controles ("Bugeo")**: Al interactuar con los menús de audio o subtítulos y seleccionar una opción, el reproductor dejaba los controles y barras superiores/inferiores permanentemente visibles en pantalla.
   - **Causa Raíz A**: `resetHideTimer` capturaba en su closure `showAudioMenu = true` (o `showSubtitlesMenu = true`) antes del commit del estado; al cumplirse el timeout de 4500ms, evaluaba `if (!showAudioMenu)` usando el valor obsoleto (`true`), cancelando el ocultamiento.
   - **Causa Raíz B**: Al cerrarse los menús tras la selección, ningún efecto reiniciaba activamente el temporizador de ocultamiento si no había nuevo movimiento de ratón.
   - **Causa Raíz C**: Al hacer clic en el contenedor de fondo para cerrar popovers, `showAudioMenu` no se reseteaba a `false`.
3. **Inconsistencia Visual**: El reproductor ya cuenta con un sistema discreto, elegante y auto-dismiss para avisos en la esquina superior derecha (`resumeNotice`), el cual es el patrón de UX ideal solicitado por el usuario.

## 2. Objetivos
- [ ] Eliminar completamente el modal OSD centrado invasivo para cambios de audio y subtítulos.
- [ ] Implementar un sistema unificado de notificaciones no invasivas en la esquina superior derecha (`cornerNotice` / toast translúcido), replicando exactamente la UX de `resumeNotice`:
  - Formato píldora translúcida con backdrop-blur en `top-4 right-4 sm:top-5 sm:right-6`.
  - Icono distintivo (🎧 para Audio, 💬 para Subtítulos, ▶ para Reanudación).
  - Auto-dismiss suave a los ~2000-2200ms sin perturbar el visionado.
- [ ] Corregir integralmente el auto-ocultamiento de controles (`resetHideTimer`):
  - Emplear referencias mutables (`useRef`) para el estado de los menús (`showAudioMenuRef`, `showSubtitlesMenuRef`, `showSettingsRef`, `showEpisodesDrawerRef`, `isDraggingRef`) para erradicar cierres obsoletos (stale closures).
  - Reiniciar automáticamente el hide timer (3500ms) cuando se cierre cualquier menú o se seleccione una pista.
  - Asegurar que al hacer clic en el contenedor se cierren todos los menús abiertos (`showAudioMenu`, `showSubtitlesMenu`, `showSettings`) y se reinicie el temporizador.
- [ ] Validar con pruebas automatizadas y compilación exitosa (`npm run build`).

## 3. Criterios de Aceptación
1. Al cambiar de pista de audio:
   - NO aparece ningún cartel en el centro de la pantalla.
   - Aparece una píldora discreta en la esquina superior derecha: `🎧 Audio: [Nombre de la pista]`.
   - La píldora desaparece automáticamente tras 2 segundos.
2. Al cambiar de subtítulos o desactivarlos:
   - NO aparece ningún cartel en el centro de la pantalla.
   - Aparece una píldora discreta en la esquina superior derecha: `💬 Subtítulos: [Nombre de la pista]` o `💬 Subtítulos desactivados`.
   - La píldora desaparece automáticamente tras 2 segundos.
3. Auto-ocultamiento de controles:
   - Una vez seleccionada la pista de audio o subtítulo (o tras cerrar el menú), los controles y las barras se ocultan automáticamente tras ~3.5 segundos de inactividad mientras el video se reproduzca.
   - El ratón en reposo oculta el cursor (`cursor-none`).
   - Mover el ratón o pulsar teclas del D-Pad vuelve a mostrar los controles y reinicia el contador.
4. `npm run build` compila con 0 errores y todas las pruebas pasan satisfactoriamente.
