# Spec 102: Modo Híbrido para S20 (PlayerFlix): Extracción de HLS Nativo (.m3u8) y Opciones de Embed Originales

## 1. Contexto y Diagnóstico del Problema

En la especificación anterior (Spec 101), **S20 (PlayerFlix)** fue configurado para consultar directamente el endpoint original `https://playerflix.ink/inc/Ajax.php` y emitir las opciones de reproducción originales (`Embed Play`, `VIP Player`, `Premium`).

Si bien esto eliminó el proxy interno roto (`/api/playerflix/proxy`) y garantizó que los embeds funcionen al 100%, el proveedor pasó a emitir exclusivamente fuentes tipo `iframe`, perdiendo la capacidad de reproducción nativa **HLS (.m3u8)** en el reproductor de Android TV con soporte de mando y ExoPlayer.

### Oportunidad Técnica Descubierta
Al inspeccionar las opciones devueltas por `playerflix.ink/inc/Ajax.php`:
1. **Series (WatchPlay):**
   - La opción `watchplay.shop` expone un stream HLS directo (`playlist.m3u8`) con cabecera `Access-Control-Allow-Origin: *`, 100% reproducible nativamente tanto en web (`Hls.js`) como en Android TV.
2. **Películas (VIP Player / EmbedPlayer):**
   - La opción `embedplayer2.xyz` genera a través de su endpoint interno un stream `master.m3u8` directo.
3. **Embeds Originales:**
   - Todas las opciones (`Embed Play`, `VIP Player`, `Premium`, `WatchPlay`) deben seguir disponibles como espejos de respaldo.

---

## 2. Objetivos de la Especificación

1. **Resolución Híbrida en `playerflix_resolve_options` (`lib/hls-engine.ts`):**
   - El paso del pipeline declarativo continuará parseando todas las opciones de embed originales en `embeds`.
   - Paralelamente, inspeccionará de forma rápida y no bloqueante (timeout corto de 3.5s) si alguna opción contiene o genera un stream `.m3u8` directo (WatchPlay o VIP Player).
   - Si se detecta un stream HLS válido, lo asignará a `hlsUrl` y cualquier stream adicional a `backupHlsUrls`.
2. **Doble Emisión en `/api/resolve`:**
   - Si S20 produce tanto `hlsUrl` como `embeds`:
     - Emite la fuente nativa **`HLS - S20`** (`type: "hls"`, prioridad 120) para reproducción directa de alta velocidad con mando de TV.
     - Emite la fuente **`S20`** (`type: "iframe"`, prioridad 95) con todos los mirrors externos en `embedOptions` y `options`.
3. **Actualización de Presets y Base de Datos:**
   - Actualizar `EXTRACTOR_PRESETS.playerflix` en `lib/hls-engine.ts`, `supabase/seed.sql` y sincronizar la base de datos viva de Supabase.

---

## 3. Criterios de Aceptación

- [ ] `playerflix_resolve_options` en `lib/hls-engine.ts` extrae streams HLS nativos (`.m3u8`) de WatchPlay y VIP Player cuando están disponibles.
- [ ] Todas las opciones de embed originales (`Embed Play`, `VIP Player`, `Premium`, etc.) se preservan intactas en `embeds`.
- [ ] `/api/resolve` emite la fuente `HLS - S20` cuando hay stream directo, y la fuente iframe con todos los servidores de respaldo.
- [ ] La prueba en `/admin` para series (ej. `1399`) y películas (ej. `687163`) muestra tanto el stream HLS directo como los embeds de respaldo.
- [ ] `npm run build` compila con 0 errores de tipado TypeScript y validación de sintaxis.
