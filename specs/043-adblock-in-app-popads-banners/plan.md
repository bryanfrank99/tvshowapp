# Plan de Implementación: Resolución de Popads y Banners In-Player en la App

## 1. Estrategia por Capas

### A. Capa de Listas de Bloqueo (Network Level)
1. Analizar e incorporar las redes publicitarias de video y banners comunes de proveedores de streaming (especialmente redes brasileñas y latinas que sirven campañas de casas de apuestas y casinos como BC.Game, Betano, etc.).
2. Sincronizar la lista tanto en `electron/adhosts.txt` como en `android/app/src/main/assets/adhosts.txt`.
3. Mejorar los métodos de detección en `electron/adblock.js` y `android/.../AdBlock.java` para interceptar no solo nombres de dominio exactos, sino patrones clave de banners y VAST.

### B. Capa de Filtrado Cosmético (DOM / CSS Injection)
1. En Electron (`electron/main.js`):
   - Al emitir `did-frame-finish-load` para cada iframe de video, inyectar reglas CSS cosméticas agresivas:
     - Ocultar selectores de banners sobre el video (`div[class*="banner"]`, `div[id*="banner"]`, `div[class*="overlay-ad"]`, `div[id*="ad-"]`, `a[href*="bc.game"]`, `[class*="fluid_ad"]`, `[class*="vast"]`).
     - Neutralizar iframes de publicidad anidados de dimensiones fijas (728x90, 300x250, 468x60) o que contengan scripts de ads.
2. En Android WebView (`AdBlockWebViewClient.java`):
   - Inyectar JavaScript cosmético similar en `onPageFinished` sobre el WebView para eliminar banners y contenedores publicitarios que floten sobre la capa de reproducción.

### C. Capa de Scripts y Aislamiento en el Frontend Web (Next.js)
1. En `components/player/IframeSourcePlayer.tsx`:
   - Configurar `sandbox` defensivo que permita reproducir (`allow-scripts allow-same-origin allow-forms`) pero limite `allow-popups` sin interacción o impida que clics en banners redirijan la aplicación entera.

---

## 2. Fases de Ejecución

1. **Fase 1: Diagnóstico detallado y presentación SDD al usuario.**
   - Explicar la causa raíz exacta (DNS plano vs Filtrado Cosmético y Scriptlets de uBlock).
2. **Fase 2: Expansión y Fortalecimiento de Listas de Bloqueo (Redes de apuestas, VAST, Banners).**
   - Actualizar `adhosts.txt` en Electron y Android.
3. **Fase 3: Filtrado Cosmético en Electron y Android WebView.**
   - Inyectar CSS y reglas de defusing en sub-frames.
4. **Fase 4: Verificación con pruebas automatizadas.**
   - Script de prueba que valide la intercepción de dominios de apuestas y patrones de banners.
5. **Fase 5: Build final y despliegue.**
   - `npm run build` y actualización de versión.
