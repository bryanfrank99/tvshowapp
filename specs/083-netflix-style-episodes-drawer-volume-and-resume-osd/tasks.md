# Tasks: Spec 083 - Notificación de Reanudación, Barra de Volumen y Selector de Episodios Estilo Netflix

- [x] **Tarea 1: Notificación de reanudación translúcida en esquina**
  - [x] Crear estado `resumeNotice` en `NativeSourcePlayer.tsx`.
  - [x] Al detectar progreso guardado, activar `resumeNotice` con timeout de 2.2 segundos.
  - [x] Renderizar badge translúcido en la esquina superior derecha (`top-4 right-4 sm:top-5 sm:right-6`).

- [x] **Tarea 2: Corrección estética de la barra de volumen**
  - [x] Envolver el `<input type="range">` en un contenedor con `overflow-hidden` y ancho dinámico (`w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20`).
  - [x] Ocultar la bola nativa (`opacity-0 pointer-events-none group-hover/vol:opacity-100`) cuando no esté en hover/foco.

- [x] **Tarea 3: Implementar selector de episodios estilo Netflix dentro del reproductor**
  - [x] Obtener metadatos de temporadas y episodios en `app/watch/page.tsx` para series de TV.
  - [x] Pasar información de serie (`seriesInfo`, `onSelectEpisode`) a `PlayerContainer` y `NativeSourcePlayer`.
  - [x] Añadir botón "Episodios" (con icono) en la barra de controles de `NativeSourcePlayer.tsx` cuando `type === "tv"`.
  - [x] Diseñar el overlay in-player estilo Netflix con pestañas de temporada y cards de episodios (número, miniatura, título, sinopsis y badge del episodio en reproducción).
  - [x] Permitir cerrar con ✕, Escape o clic fuera.

- [x] **Tarea 4: Verificación y Pruebas**
  - [x] Verificar con `npx tsc --noEmit`.
  - [x] Crear script de validación para comprobar la estructura de componentes y props (`scripts/test-netflix-drawer-volume-resume.mjs`).

- [x] **Tarea 5: Documentación y Commit**
  - [x] Actualizar `tasks.md`.
  - [x] Realizar commit y push a `origin/main`.
