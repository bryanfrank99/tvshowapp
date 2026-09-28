# Tasks 052 — Paridad de AdBlock Android con Electron

- [x] Reescribir `onPageFinished()` en `AdBlockWebViewClient.java` con inyección JS completa
  - [x] Defusers: `openExternalAd`, `triggerExternalAd`, `rfShouldCheckAdblock`, `armExternalClickHitbox`
  - [x] Neutralizar `window.open`, `window.alert`, `window.confirm`
  - [x] Purga DOM periódica del hitbox y banners (400ms × 25s)
  - [x] CSS cosmético completo con todos los selectores de Electron
  - [x] MutationObserver para ads inyectados dinámicamente
- [x] Agregar `betano` a patrones en `AdBlock.java`
- [x] Sincronizar hosts de streaming en `electron/adblock.js` (`watchplay.shop`, `qzz.io`, etc.)
- [x] Verificar build y tests
