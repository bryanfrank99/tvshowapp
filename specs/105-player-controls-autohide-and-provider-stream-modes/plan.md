# Plan de Implementación - Spec 105

## 1. Reproductor Nativo (`components/player/NativeSourcePlayer.tsx`)
- Eliminar la llamada a `clearTimeout(hideTimerRef.current)` dentro del cleanup del listener de `keydown`.
- Utilizar `showControlsRef` para leer el estado de visibilidad en `onKeyDown` sin tener que suscribir/desuscribir el listener en cada cambio de `showControls`.
- En `autoFocusFullscreen`, sustituir `setShowControls(true)` por `resetHideTimer()` para que no deje los controles fijos en pantalla sin temporizador de apagado.
- Validar que al reproducir (`onPlay`), tras 3.5 segundos de inactividad, `showControls` pase a `false` ocultando los controles y el cursor.

## 2. API de Proveedores (`app/api/admin/providers/route.ts`)
- En `GET`:
  - Consultar `provider_stream_modes` de la tabla `config`.
  - Inyectar en cada proveedor su `stream_mode` ("hls", "embed" o "both"). Por defecto: proveedores con `hls_enabled` o preset asignan `"hls"`, proveedores tradicionales asignan `"embed"`, `playerflix` asigna `"both"`.
  - Retornar `provider_stream_modes` en la respuesta JSON.
- En `PUT`:
  - Añadir soporte para `action: "set_provider_stream_mode"` con `providerId` y `stream_mode`. Actualiza la clave `provider_stream_modes` en `config` e incrementa la versión de proveedores.
  - Al guardar/editar un proveedor en `saveProv`, incluir `stream_mode` en el mapa de `config`.

## 3. Panel de Administración (`app/admin/page.tsx`)
- Eliminar por completo el banner de Modo Servidores (líneas 2416-2473).
- Añadir estado `providerStreamModes: Record<string, "hls" | "embed" | "both">`.
- Añadir función `setProviderStreamMode(providerId: string, mode: "hls" | "embed" | "both")` que llama a la API y actualiza el estado local de inmediato.
- En cada fila de proveedor de la lista:
  - Mostrar un selector de 3 opciones (píldoras conmutables):
    - `⚡ HLS`
    - `🌐 EMBED`
    - `⚡🌐 AMBOS`
- En el modal de edición de proveedor (`openEditProv`):
  - Añadir campo interactivo para seleccionar el modo de entrega ("hls" | "embed" | "both").

## 4. Endpoint de Resolución para Clientes (`app/api/resolve/route.ts`)
- Consultar `provider_stream_modes` de la tabla `config`.
- Durante el mapeo y filtrado de fuentes para cada proveedor:
  - Si `mode === "hls"`: no emitir fuentes de tipo `iframe` para este proveedor; solo emitir `hls`.
  - Si `mode === "embed"`: no emitir fuentes de tipo `hls` para este proveedor; solo emitir `iframe` / `embedOptions`.
  - Si `mode === "both"`: emitir ambas fuentes.
- Si no está definido en el mapa, aplicar la lógica por defecto coherente.

## 5. Verificación
- Ejecutar `npm run build` para asegurar 0 errores de compilación y tipos.
- Probar la persistencia y filtrado con llamadas y verificación de estado.
