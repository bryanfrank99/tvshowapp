# Spec 103: Soporte Integral de Audio Dual / Multi-Idioma y Subtítulos Embebidos HLS en el Reproductor

## 1. Contexto y Problema
En proveedores como **PlayerFlix (S20)** y servidores HLS (`master.m3u8` de `embedplayer2.xyz`, `watchplay`, etc.), las respuestas de la API indican soporte para múltiples idiomas y subtítulos:
```json
{
  "id": "playerflix-hls",
  "providerId": "playerflix",
  "providerName": "HLS - S20",
  "url": "https://embedplayer2.xyz/cdn/hls/.../master.m3u8?md5=...",
  "languages": ["pt", "en"],
  "subtitles": ["pt", "es", "en"]
}
```
Al inspeccionar el manifiesto original `master.m3u8`, este contiene directivas activas de audio y subtítulos:
```m3u8
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subtitles",LANGUAGE="eng",NAME="English",URI="..."
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subtitles",LANGUAGE="por",NAME="Portuguese",URI="..."
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="eng",NAME="English",URI="..."
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="por",NAME="Portuguese",URI="..."
```
Sin embargo, en el reproductor (`NativeSourcePlayer.tsx`):
1. **No existe selector de pistas de audio**: No se escuchan eventos `AUDIO_TRACKS_UPDATED` de Hls.js, no existe botón de audio en la barra de controles, ni menú para cambiar de pista (`hls.audioTrack`).
2. **Los subtítulos embebidos de HLS son ignorados**: Solo se consultaba `source.subtitles` (pistas externas VTT), ignorando por completo `hls.subtitleTracks` del manifiesto.
3. **Incompatibilidad de tipos en `subtitles`**: En `/api/resolve`, si el proveedor define subtítulos como códigos lingüísticos (`["pt", "es", "en"]`), se transmitían como objetos rotos sin URL en lugar de formatearse adecuadamente.
4. **Resiliencia de Red / CORS**: Para streams donde el CDN no envía cabeceras CORS permisivas en navegadores web, debe garantizarse el auto-failover con el proxy de streaming (`/api/playerflix/proxy`).

## 2. Objetivos
- [ ] Implementar soporte completo de pistas de audio (Dual Audio / Multi-idioma) en `NativeSourcePlayer.tsx` vía eventos `AUDIO_TRACKS_UPDATED` y `AUDIO_TRACK_SWITCHED` de Hls.js (y fallback nativo HTML5 `video.audioTracks`).
- [ ] Añadir botón y menú flotante de selección de pistas de Audio en la barra de controles inferior, con soporte para D-Pad / mando a distancia TV.
- [ ] Implementar soporte unificado de subtítulos en `NativeSourcePlayer.tsx` que integre tanto subtítulos embebidos en el manifiesto HLS (`hls.subtitleTracks`) como subtítulos externos.
- [ ] Auto-seleccionar inteligentemente la pista de audio acorde al idioma preferido del usuario (ej. Portugués para usuarios en PT, Español para usuarios en ES/LAT).
- [ ] Enriquecer `backupHlsUrls` en `lib/hls-engine.ts` para PlayerFlix con la URL del proxy CORS como respaldo inmediato si el stream directo experimenta errores de origen cruzado en navegadores web.
- [ ] Corregir la serialización de `subtitles` en `/api/resolve` para garantizar coherencia estructural.

## 3. Criterios de Aceptación
1. Al cargar un stream HLS con múltiples pistas de audio (ej. Portugués e Inglés en TMDB 687163):
   - Aparece el botón de Audio en la barra de controles.
   - El menú de Audio lista todas las pistas disponibles con sus nombres legibles.
   - Al pulsar una pista, el reproductor cambia de audio en caliente sin interrumpir la reproducción.
2. Al cargar un stream HLS con subtítulos embebidos:
   - Aparece el botón de Subtítulos en la barra de controles.
   - El menú de Subtítulos lista "Desactivados" y las pistas disponibles (ej. "English", "Português").
   - Al seleccionar una pista, los subtítulos WebVTT se muestran en pantalla sincronizados.
3. Navegación fluida con mando a distancia (flechas D-Pad) entre Scrubber, Play/Pausa, Volumen, Audio, Subtítulos, Velocidad y Pantalla completa.
4. `npm run build` compila con 0 errores y suite de pruebas automatizadas pasa al 100%.
