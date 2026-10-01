# Tareas de Implementación - Spec 103

- [x] 1. Soporte de Audio y Subtítulos en `NativeSourcePlayer.tsx`
  - [x] 1.1 Persistir `hlsRef` y añadir estado para `audioTracks`, `selectedAudioTrack` y `embeddedSubtitleTracks`.
  - [x] 1.2 Suscribirse a eventos de audio y subtítulos en Hls.js y auto-selección según idioma del usuario.
  - [x] 1.3 Implementar lógica de alternancia de audio (`hls.audioTrack`) y subtítulos (`hls.subtitleTrack`).
- [x] 2. Interfaz de Usuario y Navegación TV
  - [x] 2.1 Añadir botón y menú flotante de selección de Audio en la barra de controles.
  - [x] 2.2 Unificar menú de Subtítulos y mostrar botón si existen pistas embebidas o externas.
  - [x] 2.3 Actualizar flujo de navegación D-Pad en mando a distancia y atajos de teclado.
- [x] 3. Resiliencia de Red y API Resolver
  - [x] 3.1 Añadir proxy CORS en `backupHlsUrls` para streams de PlayerFlix en `lib/hls-engine.ts`.
  - [x] 3.2 Asegurar tipado limpio de `subtitles` en `/api/resolve/route.ts`.
- [x] 4. Verificación y Certificación
  - [x] 4.1 Script de pruebas de detección de pistas de audio y subtítulos.
  - [x] 4.2 Compilación `npm run build` sin errores.
