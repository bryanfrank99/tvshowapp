# Tasks: Solución de Popads y Banners In-Player en la App

- [x] 1. Diagnosticar y documentar la discrepancia técnica entre uBlock Origin y la App (Falta de listas + falta de filtrado cosmético CSS + falta de defusers VAST).
- [x] 2. Expandir masivamente `electron/adhosts.txt` y `android/app/src/main/assets/adhosts.txt` incorporando redes de apuestas (BC.Game, Betano, Monetag, ExoClick, Adsterra, HilltopAds, Tsyndicate, etc.).
- [x] 3. Implementar inyección de filtrado cosmético CSS en `electron/main.js` para destruir banners flotantes en subframes.
- [x] 4. Reforzar `AdBlockWebViewClient.java` en Android para bloquear peticiones a scripts de banners/vast y aplicar scriptlet de ocultamiento.
- [x] 5. Crear suite de pruebas de validación `scripts/test-adblock-banners.mjs`.
- [x] 6. Ejecutar compilación de verificación `npm run build`.

