# Spec 069: Pool HLS Unificado, Corrección WatchPlay S18 y Persistencia de Posición en Local DB

## 1. Problema y Contexto
1. **WatchPlay (S18) fallaba en directo:**
   - La URL extraída incluye firmas de seguridad (`md5` y `expires`) con validez real de ~10 a 15 minutos.
   - La API de resolución la persistía con `ttlHours: 24`, causando que después de 15 minutos cualquier usuario recibiera un stream vencido (HTTP 403 Forbidden).
   - Los segmentos fMP4 están camuflados con extensión `.js` y MIME type `text/javascript`. Si el navegador intentaba reproducirlos por el motor nativo del sistema en lugar de `hls.js`, se abortaba la reproducción.
   - El timeout de extracción en servidor de 1500 ms resultaba insuficiente ante latencias normales de red.
2. **Servidores HLS fragmentados:**
   - Si existían varios servidores directos (S14, S18), aparecían como opciones dispersas sin enlace de respaldo, requiriendo que el usuario hiciera clic manual al fallar uno.
3. **Caché en Base de Datos y acumulación de basura:**
   - Se requería una política de auto-purga estricta para eliminar enlaces vencidos y evitar inflar la base de datos Supabase.
4. **Pérdida del punto de reproducción:**
   - El usuario no podía retomar el contenido exactamente en el segundo donde lo dejó.

## 2. Requerimientos Implementados
- [x] **WatchPlay S18:**
  - Timeout de extracción ampliado a 2800 ms.
  - Priorización de `hls.js` sobre motor nativo para soportar fMP4 con extensión `.js`.
- [x] **Caché Inteligente con Auto-Purga (`lib/stream-cache.ts`):**
  - Detección automática del parámetro `expires` de la URL para ajustar el TTL al tiempo de vida restante exacto con margen de seguridad.
  - Auto-purga asíncrona de streams caducados (`DELETE WHERE expires_at < NOW()`).
- [x] **Pool HLS Unificado (`app/api/resolve/route.ts`):**
  - Agrupación automática de fuentes `type: "hls"`.
  - El servidor HLS de mayor prioridad adopta las URLs de los demás como `backupUrls`.
  - La fuente agrupada se nombra limpiamente como **`HLS`** (sin prefijo S14 ni número `#ord`) tanto en el selector de la pantalla de watch como en el reproductor nativo.
  - Conmutación automática transparente e inmediata en caso de interrupción.
- [x] **Persistencia en Local DB y Reanudación Exacta (`lib/playback-progress.ts`):**
  - Clave canónica por contenido (`tvshow_playback_pos_v1_...`).
  - Guardado periódico (throttled a 4s) en `onTimeUpdate` y al pausar/cerrar pestaña.
  - Reanudación automática al cargar metadatos con feedback OSD: `▶️ Reanudando en MM:SS`.
  - Auto-limpieza al superar el 92% de la reproducción (créditos).
