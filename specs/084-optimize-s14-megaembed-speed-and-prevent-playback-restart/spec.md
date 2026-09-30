# Spec 084: Optimización de Velocidad de S14 (MegaEmbed), Carga Prioritaria HLS y Prevención de Reinicio de Reproducción

## 1. Problema y Diagnóstico

### Problema Reportado
1. **S14 (MegaEmbed) tarda mucho en responder:**
   - La extracción tardaba casi 6 segundos (~5870ms).
   - Causa raíz: `lib/megaembed.ts` realizaba llamadas secuenciales con timeouts excesivos (15s) y ejecutaba una validación de red bloqueante (`Promise.allSettled` con `timeout(3500)`) sobre cada URL `.m3u8` extraída antes de devolver el resultado.
2. **HLS no carga de primero en portugués:**
   - Dado que S14 tardaba ~5.8s y el timeout de espera en el cliente (`app/watch/page.tsx`) era de solo 2.8s, la fase de resolución inicial expiraba antes de que S14 estuviera listo.
   - En consecuencia, la lista inicial de fuentes se publicaba sin S14 HLS, seleccionando un servidor iframe (ej: S11) o dejando HLS incompleto.
3. **Se reinicia la reproducción:**
   - Cuando S14 terminaba tarde de extraerse en background (a los 5-6 segundos), se llamaba a `setSources` con `mergeExtractedStreams`.
   - Si aún no existía la pool HLS, se creaba e insertaba al inicio (`unshift(newPool)`), cambiando `activeSource` mientras el usuario ya estaba reproduciendo otro servidor.
   - Si ya existía HLS, el `key={source.url}` o la modificación del objeto provocaba que React desmontara el reproductor y reiniciara la reproducción desde 0:00.

---

## 2. Solución Propuesta

### A. Optimización de Alta Velocidad para S14 (`lib/megaembed.ts`)
1. **Carrera paralela de hosts (`Promise.any`):**
   - Consultar en paralelo `mgeb.top` y `megaembed.com` con `AbortSignal.timeout(4000)`. El primer host que responda con HTTP 200 y fuentes válidas gana inmediatamente.
2. **Eliminar validación de red bloqueante de manifiestos:**
   - No hacer `fetch` previo de cada archivo `.m3u8` con espera de 3.5 segundos.
   - Asignar la primera opción HLS como `primaryHls` y las restantes como `backupHlsUrls`.
   - El reproductor nativo (`NativeSourcePlayer.tsx`) ya cuenta con failover automático ultrarrápido entre `backupUrls` mediante Hls.js sin penalizar el tiempo de carga inicial.
3. **Aumentar el tiempo límite en el Resolver del Servidor (`app/api/resolve/route.ts`):**
   - Elevar la ventana de extracción en el servidor para S14 de modo que `/api/resolve` devuelva la pool HLS con S14 ya resuelta desde el primer request.

### B. Ventana de Carga Prioritaria para Servidores HLS (`app/watch/page.tsx`)
1. **Tiempo de espera adecuado:**
   - Permitir hasta 4.2s (en lugar de 2.8s) para que los servidores HLS preferentes (S14, S18, S17) completen su extracción antes de pasar a reproducir iframes de respaldo.
   - Con la extracción optimizada a 1.5s - 2.5s, S14 siempre completará dentro de la ventana de carga.

### C. Prevención Total de Reinicio de Reproducción
1. **Preservar la fuente activa una vez iniciada la reproducción:**
   - Si `hasStartedPlaybackRef.current` es verdadero o el usuario seleccionó un servidor manualmente, la llegada tardía de un stream NUNCA debe alterar la fuente en reproducción ni cambiar `activeSource`.
   - Únicamente debe incorporar URLs de backup de forma silenciosa al array de `backupUrls` sin cambiar la propiedad `url` principal del stream en curso.
2. **Estabilidad de keys en `PlayerContainer.tsx`:**
   - Usar `key={source.id}` (o un identificador persistente de proveedor/pool) en lugar de `key={source.url}` para evitar desmontar el reproductor nativo ante actualizaciones de backups o metadatos de stream.

---

## 3. Plan de Verificación
1. **Benchmark de velocidad de S14:** Medir tiempo de extracción de `fetchMegaEmbedStream` verificando que responda en <2.5s.
2. **Resolución de API:** Verificar que `/api/resolve` entregue HLS con S14 como fuente primaria o enlazada en la posición 0.
3. **Estabilidad de reproducción:** Verificar que al completarse una extracción en segundo plano no se desmonte el reproductor ni se reinicie el video.
4. **TypeScript & Build:** `npx tsc --noEmit` completado con 0 errores.
