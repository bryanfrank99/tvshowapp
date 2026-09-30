# Tasks: Spec 075 - Multi-Proveedor en NasriPlay (S17) y Configuración de DB

- [x] **Tarea 1: Actualización de Base de Datos Supabase**
  - [x] Actualizar `provider_priorities_by_lang` en tabla `config` para incluir `nasriplay` en `es`: `{"es":["hls","cinecalidad","nasriplay"],"pt":["hls","redeflix","embedmovies"],"en":[]}`.
  - [x] Verificar y asegurar que `providers` tiene `id: "nasriplay"` con `tv_ok: true`, `needs_tmdb: true`, `lang: "es,lat"`.
  - [x] Actualizar `supabase/seed.sql` con las prioridades y la fila actualizada.

- [x] **Tarea 2: Soporte Multi-Proveedor en `lib/nasriplay.ts`**
  - [x] Extender `NasriPlayStreamResult` con `embeds?: NasriPlayEmbedOption[]`.
  - [x] En `fetchNasriPlayStream`, resolver en paralelo `server-url` para cada servidor presente en `data.servers`.
  - [x] Retornar la lista completa de embeds enriquecidos con nombre, servidor, host detectado, idioma y URL directa.

- [x] **Tarea 3: Mapeo de Sub-Proveedores en `app/api/resolve/route.ts` y Caché DB**
  - [x] Extraer stream HLS validado y agregarlo al Pool HLS (`HLS (ES)`).
  - [x] Persistir y leer sub-proveedores (`embeds`) en Supabase `stream_cache` para respuesta instantánea (<20ms).
  - [x] Mapear cada sub-proveedor como fuente individual con su nombre de host limpio (ej. `NasriPlay (Streamwish)`, `NasriPlay (Voe)`, `NasriPlay (Streamtape)`).
  - [x] Si no hay lista de embeds, mantener el iframe de embed general de NasriPlay como respaldo.

- [x] **Tarea 4: Verificación y Pruebas Automatizadas**
  - [x] Verificar que película `1339713` expone tanto HLS como las opciones de Streamwish y Voe.
  - [x] Verificar que serie `113962` expone HLS y las opciones de Streamtape y Streamwish.
  - [x] Ejecutar `scripts/test-nasriplay-hls.mjs` (10/10 PASS).
  - [x] Ejecutar `npx tsc --noEmit` (0 errores).
