# Spec 052 — Paridad de AdBlock Android con Electron

## Problema
Android WebView no soporta DNS-over-HTTPS a nivel de app ni extensiones (uBlock Origin).
Esto deja brechas de bloqueo que Electron cubre con AdGuard DoH + uBOL + defusers JS en sub-frames.

## Estrategia: Compensación sin DNS
`shouldInterceptRequest` intercepta CADA request de red antes de enviarse — esto es **igual o más potente** que DNS blocking (DNS solo devuelve NXDOMAIN, nuestro interceptor retorna HTML transparente). La brecha real está en:

1. **Defusers JS** — Electron inyecta en sub-frames; Android solo inyecta en el main frame
2. **CSS cosmético** — Android tiene selectores básicos; Electron tiene cobertura completa
3. **Patrones de bloqueo** — Android le faltan algunos patrones que Electron sí tiene
4. **Purga DOM periódica** — Electron purga hitboxes cada 400ms; Android no lo hace

## Solución

### 1. `AdBlockWebViewClient.java` → `onPageFinished()` mejorado
- Inyectar defusers idénticos a Electron: `openExternalAd`, `triggerExternalAd`, `rfShouldCheckAdblock`, `armExternalClickHitbox`, `externalAdUrl`
- Inyectar CSS cosmético completo con TODOS los selectores de Electron
- Inyectar purga DOM periódica: `purgeHitbox()` con `setInterval` cada 400ms por 25s
- Neutralizar `window.open`, `window.alert`, `window.confirm` dentro de iframes de providers

### 2. `AdBlock.java` → Patrones adicionales
- Agregar patrones faltantes: `betano`, `casino`
- Sincronizar con los patrones exactos de `electron/adblock.js`

### 3. `AdBlockWebChromeClient.java` → Popup blocker mejorado
- Log de URLs bloqueadas para debugging
