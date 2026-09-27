# Spec 049: Filtrado Cosmético y Colapso de Anuncios In-Player (Eliminación de "Webpage not available")

## 1. Contexto y Problema Detectado

El usuario probó configurar `dns.adguard-dns.com` como DNS privado en su dispositivo Android.
El resultado (mostrado en la captura `media_1790551742768.png`):
- El anuncio de apuestas de BC.Game ya no carga la imagen publicitaria porque el DNS bloqueó el dominio de la red publicitaria:
  `https://acceptable.a-ads.com/2446762/?size=Adaptive`
- **Sin embargo**, en su lugar queda un recuadro gris invasivo con el logotipo de Android caído y el texto:
  > *"Webpage not available"*
  > *"The webpage at https://acceptable.a-ads.com/2446762/?size=Adaptive could not be loaded because: net::ERR_NAME_NOT_RESOLVED"*
  > Con un botón de cierre "X" a la derecha, tapando los subtítulos y la barra de reproducción del reproductor.

El usuario pregunta:
> *"como mejorar mas ese sistema, ten en cunta que en la web nativa usando ublock como blokeador de anuncios no me aparece nada de eso"*

### ¿Por qué ocurre esto con AdGuard DNS y por qué uBlock Origin no muestra ese error?

1. **Bloqueo a nivel de DNS (AdGuard DNS) vs Bloqueo a nivel de Navegador (uBlock Origin):**
   - **AdGuard DNS** solo actúa en la capa de red resolviendo nombres de dominio. Cuando el reproductor crea un `<iframe src="https://acceptable.a-ads.com/...">`, el navegador intenta resolver la IP, AdGuard DNS responde `0.0.0.0` o `NXDOMAIN` (fallo de conexión).
   - Como Chromium/Android WebView detecta un fallo de conexión en ese iframe, genera automáticamente su **pantalla de error nativa** (`Webpage not available`). El recuadro del iframe sigue ocupando espacio sobre el video.
   - **uBlock Origin en el navegador** combina dos técnicas superiores:
     a. **Filtrado Cosmético (Cosmetic Filtering):** Inyecta reglas de estilo globales (`##iframe[src*="a-ads.com"] { display: none !important; }`).
     b. **Colapso de Elementos Bloqueados (Element Collapsing):** Cuando uBO bloquea una petición web de un marco, fuerza que el elemento HTML colapse a `0px × 0px` o sustituye la respuesta por un documento HTML en blanco transparente (`noop.html` / 204 No Content), impidiendo que el motor del navegador pinte el recuadro de error.

---

## 2. Solución a Implementar

### A. Android WebView (`AdBlockWebViewClient.java` y `AdBlock.java`)
1. **Mocking de Respuesta Transparente en `shouldInterceptRequest`:**
   - En lugar de devolver un stream vacío que puede provocar que el WebView muestre el error de página no disponible, interceptar las peticiones a `a-ads.com` y redes publicitarias y devolver un documento HTML válido pero 100% transparente y colapsado:
     ```html
     <!DOCTYPE html><html><head><style>html,body{background:transparent!important;overflow:hidden;display:none!important;margin:0;padding:0;}</style></head><body></body></html>
     ```
   - Esto evita que Chromium lance el error `ERR_NAME_NOT_RESOLVED` o `Webpage not available`.
2. **Supresión de Pantalla de Error en `onReceivedError`:**
   - Sobrescribir `onReceivedError` en `AdBlockWebViewClient` para que si un iframe de publicidad falla (por ejemplo por estar bloqueado por AdGuard DNS), NO pinte la página de error nativa de Android.
3. **Inclusión de `a-ads.com` y `acceptable.a-ads.com` en `adhosts.txt` y `AdBlock.java`:**
   - Garantizar coincidencia estricta en Android y Electron.

### B. Capa Electron (`electron/main.js` y `electron/adblock.js`)
1. En el script inyectado en subframes, añadir selectores CSS de colapso inmediato:
   ```css
   iframe[src*="a-ads.com"], iframe[src*="acceptable.a-ads.com"], [id*="a-ads"], [class*="a-ads"] {
     display: none !important;
     visibility: hidden !important;
     height: 0 !important;
     width: 0 !important;
     pointer-events: none !important;
   }
   ```
2. Registrar `a-ads.com` en `electron/adblock.js` y `electron/adhosts.txt`.

### C. Verificación
- Suite de pruebas que verifique la detección de `acceptable.a-ads.com`, la respuesta transparente y la ausencia de pantallas de error.

---

## 3. Criterios de Aceptación
- Las URLs de `a-ads.com` (incluyendo `acceptable.a-ads.com`) son interceptadas y bloqueadas.
- `AdBlockWebViewClient` devuelve un documento HTML transparente/colapsado para peticiones bloqueadas, suprimiendo "Webpage not available".
- `onReceivedError` suprime páginas de error para URLs de publicidad.
- `electron/main.js` colapsa con CSS selectores `iframe[src*="a-ads.com"]`.
- Todas las pruebas pasan y la compilación es exitosa.
