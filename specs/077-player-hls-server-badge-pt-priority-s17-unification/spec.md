# Spec 077: Badge HLS con Servidor Activo, Prioridad/Tiempo de Servidores PT y Unificación de S17

## 1. Problema y Requerimientos del Usuario

### Requerimiento 1: Badge Superior Izquierdo en el Reproductor HLS
- Actualmente, en la esquina superior izquierda del reproductor nativo aparece "HLS" y "1080p Full HD".
- El usuario solicita:
  1. Mostrar el nombre del servidor actual por el que se está reproduciendo dentro del pool HLS (ejemplo: `HLS - S14`, `HLS - S19`, `HLS - S17`, `HLS - S18`).
  2. Quitar el texto de "1080p Full HD" (y el punto separador).

### Requerimiento 2: Carga y Tiempo de Espera para Servidores Prioritarios (Portugués)
- Al cargar servidores con idioma portugués (`pt`), el servidor prioritario/predeterminado (ej. MegaEmbed S14, WatchPlay S18) tarda unos segundos más en extraer el stream.
- Debido a que la caché está desactivada y la extracción en `route.ts` no se ejecutaba para MegaEmbed (solo leía caché) o tenía tiempos de espera muy reducidos (2.8s en WatchPlay), el servidor portugués prioritario no lograba cargar y el reproductor cambiaba a otro servidor prematuramente.
- Solución:
  1. Los servidores prioritarios o predeterminados según el idioma del usuario deben intentar cargarse primero.
  2. Permitir un tiempo adecuado de espera (5.5s a 6s) para la extracción en vivo de los servidores prioritarios.
  3. Ejecutar las extracciones de servidores en paralelo (`Promise.all`) para no sumar latencias acumulativas.
  4. Si el servidor prioritario efectivamente no tiene el contenido (404/error), conmutar limpiamente al siguiente servidor disponible.

### Requerimiento 3: Unificación de Mirrors de S17 (NasriPlay) en un Solo Recuadro
- Previamente, cada sub-proveedor de NasriPlay (Streamwish, Voe, Streamtape, etc.) se agregaba como un servidor independiente en la lista, generando 7 recuadros idénticos `S17` en la cuadrícula de servidores (`SourceSelectorGrid`).
- Solución:
  1. Consolidar todos los mirrors/sub-proveedores de S17 en una **única tarjeta** de servidor en la cuadrícula (`S17 NasriPlay`).
  2. Dentro del panel de servidor activo en `SourceSelectorGrid`, desplegar un sub-selector interactivo con los distintos mirrors (ej. `[Principal] [Streamwish] [Voe] [Streamtape]`), permitiendo alternar entre ellos sin duplicar tarjetas en la cuadrícula principal.

---

## 2. Arquitectura de la Solución

### A. Mapeo de Servidores en el Pool HLS (`urlServerMap`)
- Al consolidar los streams en `app/api/resolve/route.ts`, se crea un mapa `urlServerMap: Record<string, string>` que asocia cada URL (principal y backups) con la etiqueta de su servidor de origen (ej: `{"https://...playercdn...": "S14", "https://...vimeos...": "S17"}`).
- En `NativeSourcePlayer.tsx`:
  - `activeUrl` determina el stream en reproducción.
  - El badge superior muestra: `HLS - ${serverLabel}` (ej. `HLS - S14`).
  - Se remueve `1080p Full HD`.

### B. Extracción Concurrente y Priorización de Servidores
- En `app/api/resolve/route.ts`:
  - Se agrega extracción en vivo para `megaembed` (`fetchMegaEmbedStream`) cuando `!cachedHls`.
  - Se aumenta el timeout de `watchplay` y `megaembed` a 5500ms para asegurar la extracción exitosa en portugués.
  - Se ejecutan los extractores concurrentemente con `Promise.all`.
  - Los servidores prioritarios para el idioma del usuario (`pt` o `es`) tienen prioridad para liderar el pool HLS correspondiente (`HLS (PT)` o `HLS (ES)`).

### C. Unificación de Sub-Proveedores en `Source.embedOptions`
- `Source` en `lib/sources.ts` añade `embedOptions?: SourceEmbedOption[]`.
- En `app/api/resolve/route.ts`, S17 genera una única entrada `nasriplay-iframe` con `embedOptions: fetchedEmbeds`.
- En `SourceSelectorGrid.tsx`:
  - En la cuadrícula se renderiza únicamente 1 tarjeta para S17.
  - Cuando S17 está seleccionado, en la barra de opciones activas se muestran botones para conmutar directamente entre los mirrors disponibles.
