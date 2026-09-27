# Plan: Implementación de Bloqueo Integral en Web, Electron y Android

## 1. Modificación en Capa Web (Next.js)
- Archivo: `components/player/IframeSourcePlayer.tsx`
- Establecer valor predeterminado del atributo `sandbox` en la etiqueta `<iframe>`:
  `sandbox={source.sandbox || "allow-scripts allow-same-origin allow-forms allow-presentation"}`
- Verificar que previene `window.open` y redirecciones sin romper la carga de video.

## 2. Modificación en Capa Electron
- Archivo: `electron/adhosts.txt`
  - Agregar `lactamclaes.com`, `waust.at`, `eb.lactamclaes.com`.
- Archivo: `electron/adblock.js`
  - Agregar reglas de coincidencia rápida para `lactamclaes` y `waust.at`.
- Archivo: `electron/main.js`
  - Enriquecer la inyección en frames (`did-frame-finish-load`) para remover `#player-external-click-hitbox`, neutralizar `openExternalAd`, `triggerExternalAd`, `rfShouldCheckAdblock` y `window.open`.
- Archivo: `electron/extensions/ubol/manifest.json`
  - Activar `annoyances-overlays`, `annoyances-others`, `annoyances-cookies` y `bra-0` con `"enabled": true`.

## 3. Modificación en Capa Android
- Archivo: `android/app/src/main/assets/adhosts.txt`
  - Agregar `lactamclaes.com` y `waust.at`.

## 4. Pruebas y Validación
- Probar con `scripts/test-adblock-banners.mjs`.
- Ejecutar `npm run build` para asegurar compilación limpia sin errores.
