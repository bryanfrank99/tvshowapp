# Implementation Plan: Rediseño UI/UX y Dimensionamiento del Reproductor de TV en Vivo

## Architecture & Layout Plan

### 1. State Management in `LivePage` (`app/live/page.tsx`)
- Ampliar el estado `current` para almacenar el objeto canal completo:
  ```ts
  type ActiveLiveChannel = {
    key: string;
    name: string;
    sub: string;
    image: string;
    url: string;
    now?: string;
  };
  ```
- Añadir estado para `playerSize`: `"normal" | "theater" | "compact"` (default: `"normal"`).
- Añadir estado `streamKey`: número o timestamp para forzar recarga del iframe sin desarmar el reproductor.
- Referencia al contenedor `playerBoxRef` para soportar `requestFullscreen()`.

### 2. Contenedor del Reproductor
- Crear un contenedor responsivo con transición suave de tamaño:
  - `normal`: `max-w-4xl xl:max-w-5xl mx-auto w-full aspect-video max-h-[58vh]`
  - `theater`: `max-w-6xl mx-auto w-full aspect-video max-h-[75vh]`
  - `compact`: `max-w-2xl mx-auto w-full aspect-video max-h-[40vh]`
- Envoltorio de cristal oscuro (`bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-3 sm:p-4`).

### 3. Header y Controles del Reproductor
- Fila superior con:
  - Logo del canal (`Image` optimizado o fallback estilizado).
  - Título del canal, badge de categoría (`sub`) y programa en vivo (`now` / EPG).
  - Badge `● EN VIVO` con pulso animado.
  - Botones de acción:
    - `btn-live-prev` (◀ Anterior) y `btn-live-next` (Siguiente ▶).
    - `btn-live-reload` (🔄 Recargar).
    - `btn-live-size` (🗖 Teatro / 🗗 Normal).
    - `btn-live-fullscreen` (⛶ Pantalla Completa).
    - `btn-live-close` (✕ Cerrar).

### 4. Carrusel Rápido de Canales (Quick Zapping Rail)
- Barra horizontal debajo del marco de video con desplazamiento horizontal suave.
- Muestra los canales activos con miniatura, nombre y estado activo.
- Al hacer clic o presionar Enter en un canal, conmuta la reproducción instantáneamente.

### 5. Verificación & Testing
- Crear `scripts/test-live-player-ui.mjs` para verificar estáticamente:
  - Presencia de clases de dimensionamiento acotado (`max-w-4xl`, `aspect-video`, `max-h-`).
  - Presencia de los controles (`btn-live-prev`, `btn-live-next`, `btn-live-reload`, `btn-live-fullscreen`, `btn-live-close`).
  - Presencia de soporte de metadatos (logo, EPG `now`, categoría).
  - Carrusel rápido de zapping (`live-zapping-rail`).
- Ejecutar `npm run build` para asegurar compilación limpia sin errores de tipos.
