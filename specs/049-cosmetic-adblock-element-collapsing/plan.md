# Plan: Filtrado Cosmético y Colapso de Anuncios In-Player

## 1. Actualización de Listas y Detectores de Anuncios
- Modificar `android/app/src/main/assets/adhosts.txt` y `electron/adhosts.txt`:
  - Agregar `a-ads.com` y `acceptable.a-ads.com`.
- Modificar `android/app/src/main/java/com/tvshow/app/AdBlock.java`:
  - Agregar patrón `a-ads` y `acceptable.a-ads.com`.
- Modificar `electron/adblock.js`:
  - Agregar patrón `a-ads.com` y `a-ads`.

## 2. Mejora de Android WebViewClient
- Modificar `android/app/src/main/java/com/tvshow/app/AdBlockWebViewClient.java`:
  - En `shouldInterceptRequest`: Devolver respuesta HTML transparente (`<!DOCTYPE html><html><head><style>html,body{background:transparent!important;overflow:hidden;display:none!important;margin:0;padding:0;}</style></head><body></body></html>`).
  - Agregar sobrescritura de `onReceivedError` para suprimir la pantalla de error nativa en subrecursos y frames de anuncios.

## 3. Mejora de Electron Main
- Modificar `electron/main.js`:
  - En `did-frame-finish-load`: Agregar reglas CSS de colapso explícito para `iframe[src*="a-ads.com"]`, `iframe[src*="acceptable.a-ads.com"]`, etc.

## 4. Pruebas y Validación
- Actualizar `scripts/test-adblock-banners.mjs` con `acceptable.a-ads.com`.
- Ejecutar `npm run build` y suites de pruebas.
