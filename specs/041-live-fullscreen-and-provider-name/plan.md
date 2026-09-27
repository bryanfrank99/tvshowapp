# Implementation Plan: Ajuste de Pantalla Completa y Nombre del Proveedor #2

## Changes in `app/live/page.tsx`

1. **Estado `isFullscreen` y Eventos**:
   - Añadir `const [isFullscreen, setIsFullscreen] = useState(false);`.
   - Añadir `useEffect` para escuchar `fullscreenchange` y `webkitfullscreenchange` en `document`.
   - Cuando cambie el estado, actualizar `setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement))`.

2. **Ajuste Dinámico del Contenedor e Iframe**:
   - `#tv-live-player-box`:
     - Si `isFullscreen`: `fixed inset-0 z-[9999] w-screen h-screen max-w-none max-h-none rounded-none m-0 p-0 bg-black flex flex-col`
     - Si no: normal con `max-w-4xl lg:max-w-5xl` o teatro `max-w-6xl xl:max-w-7xl`.
   - Contenedor del video:
     - Si `isFullscreen`: `flex-1 w-full h-full max-h-none aspect-auto` (ocupa todo el espacio vertical disponible).
     - Si no: `aspect-video max-h-[52vh] sm:max-h-[500px]` (o teatro).
   - Iframe: `w-full h-full bg-black block border-0`.
   - Barra inferior: `shrink-0`.

3. **Corrección del Título del Proveedor #2**:
   - Reemplazar en la renderización de las secciones:
     ```tsx
     <h2 className="text-xl font-extrabold mb-3 inline-flex items-center gap-2">
       {src.id === "tvf90" ? <IconBall className="text-emerald-400" /> : <IconSignal className="text-red-400" />}
       {src.name || (src.id === "tvf90" ? d.agenda : src.format === "streambetter" ? d.canales : "Canales")}
     </h2>
     ```
   - Al usar `src.name`, se mostrará `"Deportes ES"` tal como viene de Supabase y seed.

4. **Testing & Build**:
   - Crear `scripts/test-fullscreen-and-provider-name.mjs`.
   - Ejecutar pruebas y `npm run build`.
   - Commit & push.
