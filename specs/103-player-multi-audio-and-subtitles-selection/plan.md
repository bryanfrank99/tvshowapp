# Plan de Implementación - Spec 103

## Fase 1: Arquitectura de Pistas de Audio y Subtítulos en `NativeSourcePlayer.tsx`
1. Declarar `hlsRef = useRef<Hls | null>(null)`.
2. Modelar estado de audio:
   - `audioTracks: { id: number; name: string; lang: string; default?: boolean }[]`
   - `selectedAudioTrack: number | null`
   - `showAudioMenu: boolean`
   - `audioBtnRef = useRef<HTMLButtonElement>(null)`
3. Modelar estado de subtítulos:
   - `embeddedSubtitleTracks: { id: number; name: string; lang: string }[]`
   - `showSubtitlesMenu: boolean`
   - `selectedSubtitle: string` (e.g. `"off"`, `"hls-0"`, `"hls-1"`, etc.)
4. Suscribirse a los eventos del ciclo de vida de Hls.js:
   - `Hls.Events.AUDIO_TRACKS_UPDATED`
   - `Hls.Events.AUDIO_TRACK_SWITCHED`
   - `Hls.Events.SUBTITLE_TRACKS_UPDATED`
   - `Hls.Events.SUBTITLE_TRACK_SWITCH`
5. Añadir métodos `selectAudioTrack(id)` y actualizar `selectSubtitleTrack(id)` con control de `hls.audioTrack` y `hls.subtitleTrack`.

## Fase 2: Componentes UI y Navegación TV D-Pad
1. Crear el botón de Audio (`btn-audio`) con icono en la barra de controles inferior, visible si `audioTracks.length > 0`.
2. Crear el menú desplegable flotante de Audio con las pistas formateadas (ej. "Português", "English", "Español Latino") y marca de verificación `✓`.
3. Actualizar la visibilidad del botón de Subtítulos (`btn-subtitles`): visible si hay subtítulos embebidos o externos.
4. Crear el menú desplegable flotante unificado de Subtítulos (Desactivados + Pistas HLS + Pistas externas).
5. Conectar la navegación D-Pad (flechas Left/Right/Up/Down) para recorrer secuencialmente: Scrubber ↔ Play/Pausa ↔ Volumen ↔ Episodios ↔ Audio ↔ Subtítulos ↔ Velocidad ↔ Pantalla completa.
6. Añadir atajos de teclado rápidos: tecla `a` para alternar audio, tecla `c` para alternar subtítulos.

## Fase 3: Resiliencia de Red y Serialización en API
1. En `lib/hls-engine.ts` (`playerflix_resolve_options`): si `rawHls` proviene de un host sin CORS (ej. `embedplayer2.xyz`), añadir como backup automático la URL del proxy local `/api/playerflix/proxy?url=...`.
2. En `app/api/resolve/route.ts`: sanitizar el array `subtitles` para asegurar que solo incluya objetos válidos con `url` (evitando arrays de strings que rompan `<track>`).

## Fase 4: Pruebas y Certificación
1. Validar con script automatizado la reproducción y extracción de pistas de audio y subtítulos en `master.m3u8` de PlayerFlix.
2. Comprobar que `npm run build` pase con 0 errores de TypeScript y empaquetado.
