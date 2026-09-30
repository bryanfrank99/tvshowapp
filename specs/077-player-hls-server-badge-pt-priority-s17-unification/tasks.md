# Tasks: Spec 077 - Badge HLS con Servidor Activo, Prioridad/Tiempo PT y Unificación S17

- [x] **Tarea 1: Badge Superior en el Reproductor HLS (`NativeSourcePlayer.tsx` y `lib/sources.ts`)**
  - [x] Agregar `urlServerMap?: Record<string, string>` y `embedOptions?: SourceEmbedOption[]` a la interfaz `Source` en `lib/sources.ts`.
  - [x] En `NativeSourcePlayer.tsx`:
    - [x] Detectar el servidor activo actual según `activeUrl` y `source.urlServerMap` (con fallback a detección por dominio/puerto/ord).
    - [x] Renderizar en el badge superior: `HLS - ${serverName}` (ej: `HLS - S14`, `HLS - S19`, `HLS - S17`).
    - [x] Eliminar "1080p Full HD" y el separador.

- [x] **Tarea 2: Soporte y Tiempo de Carga de Servidores Prioritarios PT en `app/api/resolve/route.ts`**
  - [x] Integrar extracción en vivo para `megaembed` (`fetchMegaEmbedStream`) cuando no hay caché.
  - [x] Aumentar el timeout de extracción de servidores prioritarios (`megaembed`, `watchplay`, `nasriplay`, `cinecalidad`) a 5500ms.
  - [x] Paralelizar extracciones complejas para no acumular latencia secuencial.
  - [x] Construir `urlServerMap` durante la consolidación de `consolidatedHls` mapeando cada URL a su `S${ord}` correspondiente.

- [x] **Tarea 3: Unificación de S17 en un Solo Recuadro (`app/api/resolve/route.ts` y `SourceSelectorGrid.tsx`)**
  - [x] En `app/api/resolve/route.ts`, agrupar todos los sub-proveedores resueltos de S17 dentro de una sola fuente `Source` con `embedOptions`.
  - [x] En `SourceSelectorGrid.tsx`, mostrar 1 sola tarjeta para S17 en la cuadrícula de servidores.
  - [x] Desplegar sub-selector interactivo de mirrors en el encabezado de servidor activo cuando S17 está seleccionado.

- [x] **Tarea 4: Verificación y Pruebas**
  - [x] Probar resolución en portugués (`lang=pt`) verificando que HLS PT carga y se asigna como recomendado.
  - [x] Probar resolución en español (`lang=es`) verificando que S17 aparece como 1 solo recuadro con sus `embedOptions`.
  - [x] Verificar que `urlServerMap` se genera correctamente para `HLS (ES)` y `HLS (PT)`.
  - [x] Ejecutar `npx tsc --noEmit` y suite de pruebas.
