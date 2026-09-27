# Implementation Plan: Reordenamiento del Reproductor de TV en Vivo

## Architecture & Layout Changes in `app/live/page.tsx`

1. **Reordenar JSX dentro de `#tv-live-player-box`**:
   - Marco de Video `iframe` primero:
     ```tsx
     {/* Marco de video proporcional */}
     <div className={`relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center ${
       playerSize === "theater" ? "max-h-[72vh]" : "max-h-[52vh] sm:max-h-[500px]"
     }`}>
       <iframe
         key={`${current.url}-${streamKey}`}
         src={current.url}
         className="w-full h-full bg-black block border-0"
         allowFullScreen
         allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
         referrerPolicy="origin"
       />
     </div>
     ```
   - Barra de Metadatos y Controles (Green Box) a continuación (debajo del video):
     ```tsx
     {/* Barra Inferior de Metadatos y Acciones */}
     <div className="flex items-center justify-between gap-3 p-3 sm:px-4 sm:py-3 bg-gradient-to-t from-white/10 via-white/5 to-transparent border-t border-white/10 flex-wrap">
       ...
     </div>
     ```
   - Eliminar el bloque `<div id="live-zapping-rail">...</div>` (Red Box).

2. **Actualizar Pruebas**:
   - Modificar `scripts/test-live-player-ui.mjs` para validar que:
     - El iframe precede a la barra de controles en el DOM.
     - `live-zapping-rail` ya no existe.
     - Todos los botones de acción (`btn-live-prev`, `btn-live-next`, `btn-live-reload`, `btn-live-size`, `btn-live-fullscreen`, `btn-live-close`) siguen presentes y operativos.

3. **Compilación y Entrega**:
   - Ejecutar pruebas y `npm run build`.
   - Git add, commit y push.
