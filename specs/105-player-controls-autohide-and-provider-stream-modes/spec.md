# Spec 105: Corrección de Auto-Ocultamiento del Sistema de Navegación del Reproductor y Modo de Entrega por Proveedor (HLS, EMBED, AMBOS)

## 1. Contexto y Problema

### Problema 1: El Sistema de Navegación / Controles del Reproductor no se Oculta
En `components/player/NativeSourcePlayer.tsx`:
- Al iniciar la reproducción o tras cualquier interacción, la barra de navegación inferior (controles, línea de tiempo, botones) y el encabezado superior permanecen permanentemente visibles en pantalla sin ocultarse.
- **Causa Raíz Identificada**: En el `useEffect` que gestiona el listener de teclado `keydown` (línea 741), dicho hook incluía `showControls` en sus dependencias y en su función de limpieza ejecutaba:
  ```tsx
  return () => {
    window.removeEventListener("keydown", onKeyDown, true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };
  ```
  Cada vez que `resetHideTimer()` llamaba a `setShowControls(true)` y programaba el `setTimeout(..., 3500)`, el cambio de estado de `showControls` provocaba un re-render inmediato. React ejecutaba la función de limpieza del efecto anterior antes de re-ejecutarlo, **cancelando prematuramente `hideTimerRef.current`**. Como resultado, el temporizador de ocultamiento moría al instante y `showControls(false)` nunca llegaba a ejecutarse.
- Adicionalmente, `autoFocusFullscreen` llamaba a `setShowControls(true)` de forma directa sin reprogramar el hide timer.

### Problema 2: Eliminación de Banner de Modo Servidores y Selector de Modo por Proveedor (HLS / EMBED / AMBOS)
- En `app/admin/page.tsx`, existe un banner rígido y obsoleto que dice:
  *"Modo Servidores: 100% Streams HLS Nativos (.m3u8) MODO RECOMENDADO ACTIVO Todos los servidores embed obsoletos han sido removidos..."*
  con botones globales de modo.
- El usuario solicita **eliminar completamente este apartado** y, en su lugar, **otorgar control granular por cada proveedor** mediante una opción donde se pueda elegir entre:
  1. **HLS**: El proveedor solo entrega streams HLS directos (.m3u8).
  2. **EMBED**: El proveedor solo entrega reproductor iframe / embeds.
  3. **AMBOS**: El proveedor entrega tanto el stream HLS nativo como las opciones/tarjeta iframe de respaldo.
- Esta configuración debe reflejarse tanto en el panel de administración (en la lista de proveedores y en el modal de edición) como en `/api/resolve` para filtrar qué fuentes se sirven a los clientes.

---

## 2. Objetivos

1. **Auto-Ocultamiento Fiable de Controles del Reproductor**:
   - Eliminar `clearTimeout(hideTimerRef.current)` del cleanup del listener de `keydown`. La cancelación de temporizadores por desmontaje debe ser exclusiva del hook `useEffect(..., [])` de unmount.
   - Refactorizar el listener `keydown` para que use referencias en lugar de re-suscribirse con `showControls`, eliminando re-suscripciones innecesarias en cada toggle de controles.
   - Asegurar que `autoFocusFullscreen` invoque `resetHideTimer()` para que los controles no queden fijos al enfocar el botón de pantalla completa.
   - Garantizar que tras 3.5 segundos de inactividad de ratón o teclado con el video en reproducción (`isPlaying` y `!video.paused`), la barra de navegación inferior y el header superior se oculten con animación suave (`opacity-0 pointer-events-none`) y el cursor se oculte (`cursor-none`).

2. **Eliminación del Banner Obsoleto en Panel Admin**:
   - Remover el bloque de código del banner `"Modo Servidores: 100% Streams HLS Nativos (.m3u8)"` en `app/admin/page.tsx`.

3. **Selector de Modo de Proveedor (HLS / EMBED / AMBOS)**:
   - Configuración persistente en `config` bajo la clave `provider_stream_modes`: `{ [providerId: string]: "hls" | "embed" | "both" }`.
   - En la tabla de proveedores de `app/admin/page.tsx`:
     - Mostrar un selector directo o grupo de botones (`HLS` | `EMBED` | `AMBOS`) para cambiar el modo de cada servidor con un solo clic.
   - En el modal de edición de servidor (`openEditProv`):
     - Incluir selector interactivo para `stream_mode` ("hls", "embed", "both").
   - En `app/api/admin/providers/route.ts`:
     - Endpoint para guardar modo individual `action: "set_provider_stream_mode"`.
     - Incluir `stream_mode` al guardar/editar proveedores.
     - Cargar y devolver `provider_stream_modes` en la respuesta `GET`.
   - En `app/api/resolve/route.ts`:
     - Consultar `provider_stream_modes`.
     - Respetar rigurosamente la regla por cada proveedor:
       - Si es `"hls"`: entregar solo streams HLS del proveedor.
       - Si es `"embed"`: entregar solo tarjetas/opciones iframe del proveedor.
       - Si es `"both"`: entregar tanto fuentes HLS como iframe.

---

## 3. Criterios de Aceptación

1. En el reproductor nativo (`NativeSourcePlayer.tsx`):
   - Al reproducir un video y dejar el ratón/mando quieto, las barras y controles de navegación se ocultan automáticamente tras 3.5 segundos.
   - Al mover el ratón o pulsar una tecla, los controles reaparecen inmediatamente y vuelven a ocultarse tras 3.5 segundos.
2. En la administración de servidores (`app/admin/page.tsx`):
   - El banner *"Modo Servidores: 100% Streams HLS Nativos..."* ya no existe.
   - Cada proveedor muestra selector para elegir entre `HLS`, `EMBED` y `AMBOS`.
   - El cambio se guarda y persiste inmediatamente en Supabase/config.
3. En la entrega a clientes (`/api/resolve`):
   - Proveedores con modo `HLS` solo envían fuentes nativas HLS.
   - Proveedores con modo `EMBED` solo envían fuentes iframe/embed.
   - Proveedores con modo `AMBOS` envían ambas opciones (HLS y mirrors de embed).
4. `npm run build` compila con 0 errores y las pruebas pasan satisfactoriamente.
