# Tasks 055: Reproducción de Tráilers Dentro de la Aplicación

- [x] 1. Configurar Electron para reproducción in-app de tráilers
  - [x] Añadir `youtube.com`, `youtube-nocookie.com`, `googlevideo.com`, `ytimg.com` a `ALLOWED_STREAM_HOSTS` en `electron/adblock.js`
  - [x] Actualizar `will-frame-navigate` en `electron/main.js` para permitir carga de sub-frames si `isAllowedHost(host)`
  - [x] Excluir dominios de YouTube de la inyección de defusers en `electron/main.js`
- [x] 2. Configurar Android para reproducción in-app de tráilers
  - [x] Añadir wildcards de YouTube a `allowNavigation` en `capacitor.config.ts`
  - [x] Añadir dominios de YouTube a `isAllowedHost()` en `AdBlockWebViewClient.java`
  - [x] Añadir dominios de YouTube a `isAllowedHost()` en `AdBlockWebChromeClient.java`
- [x] 3. Mejorar componentes de tráiler en frontend
  - [x] Actualizar `components/TrailerButton.tsx` con `playsinline=1` y permisos completos de iframe
  - [x] Priorizar trailers oficiales (`type === "Trailer"`) en `app/title/page.tsx`
- [x] 4. Crear suite de pruebas automatizadas `scripts/test-trailer-in-app.mjs`
- [x] 5. Ejecutar suite de pruebas y verificar `npm run build`
