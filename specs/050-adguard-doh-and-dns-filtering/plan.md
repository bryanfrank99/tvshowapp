# Plan: Implementación de AdGuard DoH con Fallback Automático

## 1. Configuración de DoH en Electron
- Archivo: `electron/main.js`
- Agregar al inicio (antes de `app.whenReady()`):
  ```javascript
  app.commandLine.appendSwitch('enable-features', 'DnsOverHttps,ExtensionManifestV3,ExtensionServiceWorker');
  app.commandLine.appendSwitch('dns-over-https-mode', 'automatic');
  app.commandLine.appendSwitch('dns-over-https-templates', 'https://dns.adguard-dns.com/dns-query{?dns}');
  ```
- El modo `'automatic'` garantiza que si AdGuard DoH no está disponible, Chromium recurre inmediatamente al DNS del sistema.

## 2. Robustecer Lista de Bloqueo de Red con Filtros AdGuard
- Sincronizar en `electron/adhosts.txt` y `android/app/src/main/assets/adhosts.txt` los dominios de trackers y popads más activos identificados por AdGuard.

## 3. Pruebas y Validación
- Actualizar `scripts/test-adblock-banners.mjs` para verificar la presencia de los switches DoH de AdGuard en `electron/main.js`.
- Ejecutar `npm run test:sources` y `npm run build`.
