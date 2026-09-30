# Spec 074: Corrección de Extracción, Validación y Disponibilidad de Servidor S17 (NasriPlay)

## 1. Contexto y Causa Raíz del Problema
El usuario reportó:
> "nsrplay.space no esta funcionando correctamente acabo de probar 'https://nsrplay.space/embed/movie/1084244' y carga correctamente pero nisiquiera aparece en los servidores, usa sdd"

### Diagnóstico Exhaustivo:
1. **URL Muerta (HTTP 404) cacheada en base de datos**:
   - Para la película 1084244, la API de `nsrplay.space` devolvió una lista de servidores donde el token secundario correspondía a `https://jzddkefw9oeu0.futurespacetravel.space/.../index-v1-a1.txt`.
   - `lib/nasriplay.ts` priorizó esta URL porque no requería `Referer`, sin verificar si el endpoint estaba vivo.
   - Dicha URL responde con **HTTP 404 Not Found**.
   - Esta URL 404 fue guardada en `stream_cache` de Supabase con TTL de 12 horas.

2. **Desaparición del Servidor en la Interfaz**:
   - Al recibir la URL 404, el reproductor de video dispara un error fatal inmediato de red.
   - El hook `useSourceFallback` detecta el fallo y añade la fuente a `failedIds`.
   - La lista de fuentes activas (`availableSources = sources.filter(s => !failedIds.includes(s.id))`) elimina la fuente de la cuadrícula.
   - En `app/api/resolve/route.ts`, al haber detectado un stream HLS (el 404 cacheado), se ejecutó `continue;`, omitiendo por completo la creación de la fuente iframe de S17 (`nasriplay-iframe`).
   - Resultado: **El servidor S17 / NasriPlay desapareció completamente de la pantalla del usuario**.

3. **Restricción de CDN en Vimeos**:
   - El stream directo de `vimeos.net` devuelve `403 Forbidden` a navegadores estándar porque exige cabecera `Referer: https://vimeos.net/` o proxy inverso.
   - Solo los streams de Uqload (`*.uqload.vc`) o CDN propio (`*.zilla-networks.com`) tienen `CORS: *` y funcionan sin Referer restringido.

---

## 2. Requerimientos y Solución Arquitectónica

### 1. Validación Previa Estricta de Streams HLS (`lib/nasriplay.ts`)
- Antes de considerar una URL `.m3u8` o stream como válida, realizar una verificación HTTP rápida (`fetch(url, { method: "HEAD", signal })` o `GET` con rango):
  - Debe responder con **HTTP 200** (o 206).
  - Si responde 404, 403 o da timeout, se descarta inmediatamente.
- Descartar URLs con extensiones sospechosas (`.txt`) a menos que provengan de un CDN verificado con status 200 y `CORS: *`.
- Si ningún stream HLS directo pasa la validación de integridad HTTP 200, la función `fetchNasriPlayStream` debe retornar `{ success: false }` limpiamente.

### 2. Preservación Garantizada de S17 como Servidor en `app/api/resolve/route.ts`
- **Fallback a Iframe Siempre Disponible**:
  - Si no hay un stream HLS validado y funcional, S17 **NUNCA debe desaparecer**: debe presentarse como servidor iframe (`providerName: "S17"`, `realName: "NasriPlay"`, `ord: 17`, `url: "https://nsrplay.space/embed/movie/{id}"` o `/tv/{id}/{s}/{e}`).
  - De este modo, si `nsrplay.space` reproduce en su propio iframe web (como comprobó el usuario), el usuario siempre tiene acceso garantizado al servidor S17.
- **Doble presencia no conflictiva**:
  - Si hay un stream HLS funcional de NasriPlay, se añade al pool HLS, pero el iframe de S17 también queda disponible en la lista de opciones para que el usuario siempre pueda elegir el reproductor original de NasriPlay si lo desea.

### 3. Purgado de Caché Envenenada en Supabase
- Limpiar inmediatamente cualquier registro en `stream_cache` para `nasriplay` que apunte a URLs 404 o `futurespacetravel.space`.

### 4. Soporte Client-Side Dinámico en `app/watch/page.tsx`
- Si S17 está cargado como iframe y el usuario hace clic en él, o en segundo plano, intentar validar extracción HLS sin bloquear la interfaz.

---

## 3. Plan de Verificación
- Prueba unitaria/e2e con `1084244`:
  - Validar que `/api/resolve` devuelve S17 funcional.
  - Verificar que la URL HLS no es 404.
  - Verificar que si el stream directo no está disponible, el iframe de S17 está presente con `id: "nasriplay-iframe"`, `providerName: "S17"`, `ord: 17`.
- Pruebas automatizadas con `scripts/test-nasriplay-hls.mjs`.
- Typecheck con `npx tsc --noEmit`.
