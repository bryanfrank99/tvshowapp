# Plan 052 — Paridad de AdBlock Android con Electron

## Archivos a modificar

### 1. `AdBlockWebViewClient.java` — Inyección JS completa
- Reescribir `onPageFinished()` con inyección JS robusta que incluya:
  - Defusers: `window.open=null`, `openExternalAd`, `triggerExternalAd`, etc.
  - Purga DOM periódica del hitbox y banners
  - CSS cosmético completo (paridad con Electron)
  - MutationObserver para detectar elementos de anuncios inyectados dinámicamente

### 2. `AdBlock.java` — Patrones sincronizados
- Agregar `betano` a patrones hardcoded
- Verificar paridad con `electron/adblock.js`

### 3. `AdBlockWebChromeClient.java` — Sin cambios mayores
- Ya funciona correctamente con el fix de spec 051

## Verificación
- `npm run build` pasa
- `node scripts/test-adblock-banners.mjs` pasa
- Compilar APK y verificar que los ads se bloquean en providers con anuncios agresivos (S11, S12)
