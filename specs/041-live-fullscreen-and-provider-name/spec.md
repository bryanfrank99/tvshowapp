# Specification: Ajuste de Pantalla Completa y Nombre del Proveedor #2 en TV en Vivo

## 1. Problem Statement
1. **Espacio negro en pantalla completa**:
   Al presionar el botón de pantalla completa (`btn-live-fullscreen`), el reproductor entra a fullscreen pero el contenedor interno del video mantenía `max-h-[52vh] sm:max-h-[500px]` y `aspect-video`. Esto provocaba que en monitores y televisores el video se detuviera a media altura, dejando la mitad inferior de la pantalla completamente en negro como espacio vacío.
2. **Nombre del proveedor #2 sobrescrito**:
   En la guía de canales, el proveedor `tvf90` (cuyo nombre configurado en la base de datos es `"Deportes ES"`) mostraba `"Agenda deportiva"` debido a una condición ternaria rígida `{src.id === "tvf90" ? d.agenda : ...}` que ignoraba `src.name`.

## 2. Requirements & Goals
1. **Fullscreen Responsivo y Flexible**:
   - Detectar el estado `isFullscreen` mediante eventos `fullscreenchange` y `webkitfullscreenchange`.
   - Cuando esté en pantalla completa:
     - El contenedor `#tv-live-player-box` debe ocupar `w-full h-full fixed inset-0 z-[9999] bg-black`.
     - El marco del video debe tener `flex-1 w-full h-full max-h-none aspect-auto` para que el iframe se ajuste al 100% de la pantalla vertical y horizontalmente.
     - La barra de controles se mantiene compacta en la parte inferior (`shrink-0`).
     - Al salir de pantalla completa, restaurar el dimensionamiento balanceado y acotado.
2. **Corrección del Título del Proveedor #2**:
   - Respetar el nombre oficial del proveedor configurado en la base de datos (`src.name`), mostrando `"Deportes ES"` en lugar de sobrescribirlo con `"Agenda deportiva"`.
3. **Pruebas y Verificación**:
   - Crear `scripts/test-fullscreen-and-provider-name.mjs` para verificar el manejo de pantalla completa y la visualización de `src.name`.
   - Ejecutar `npm run build` y comprobar compilación limpia sin errores.
