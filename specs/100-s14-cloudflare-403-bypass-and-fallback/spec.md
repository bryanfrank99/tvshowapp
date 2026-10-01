# Spec 100: Solución al Error HTTP 403 por Cloudflare WAF en S14 (MegaEmbed), Bypass de Navegador y Fallback Resiliente

## 1. Contexto y Diagnóstico del Problema

El usuario reporta el siguiente error recurrente al ejecutar el extractor en vivo para **S14 (MegaEmbed)** desde el panel `/admin`:
```
Error en paso [embed_page]: HTTP 403 al consultar https://mgeb.top/embed/550
```
Sin embargo, al abrir exactamente la misma URL (`https://mgeb.top/embed/550`) desde el navegador de su equipo, el reproductor carga y funciona perfectamente.

### Causa Raíz Técnica
1. **Diferenciación de Entorno (Datacenter IP vs Residencial):**
   - El backend (Node.js / Next.js / Serverless) ejecuta peticiones `fetch()` desde direcciones IP clasificadas por Cloudflare como datacenter, scraping o proxies no interactivos. Cuando Cloudflare WAF activa el desafío JavaScript (`/cdn-cgi/challenge-platform/scripts/jsd/main.js`), un backend sin navegador real recibe de inmediato un **HTTP 403 Forbidden**.
   - En el navegador del usuario (IP residencial, negociación TLS completa, cabeceras de cliente legítimo y motor JS activo), Cloudflare aprueba la sesión o resuelve el challenge silenciosamente, entregando el HTML con `var sources = [...]`.
2. **Encabezados Incompletos en el Pipeline del Servidor:**
   - En `lib/hls-engine.ts`, el paso `http_request` utilizaba por defecto un User-Agent estático recortado (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`), sin cabeceras `Sec-Fetch-*`, `sec-ch-ua` ni `Accept-Language`, provocando bloqueos inmediatos por heurísticas de bot de Cloudflare.
3. **Falta de Manejo de Error Graceful y Fallback a Embed:**
   - Cuando el paso `embed_page` recibía HTTP 403, arrojaba una excepción fatal. El pipeline se detenía por completo sin intentar recuperar la URL embed ni generar una fuente alternativa, dejando al reproductor sin opciones de reproducción y al administrador con un error bloqueante.
4. **Capacidad CORS de `mgeb.top`:**
   - La cabecera HTTP de respuesta de `mgeb.top` incluye explícitamente `Access-Control-Allow-Origin: *`. Esto permite que el navegador del usuario pueda resolver la página y extraer las fuentes directamente del lado del cliente cuando el servidor sufra bloqueos de IP en el datacenter.

---

## 2. Objetivos de la Especificación

1. **Emulación Completa de Navegador en el Backend:**
   - Dotar a `http_request` en `lib/hls-engine.ts` y al preset de MegaEmbed de cabeceras completas de Chrome desktop (`User-Agent` moderno, `Accept`, `Accept-Language`, `sec-ch-ua`, `Sec-Fetch-*`, `Referer`), reduciendo drásticamente falsos positivos en Cloudflare.
2. **Resiliencia ante Bloqueos WAF / 403 en el Pipeline:**
   - Si `mgeb.top` responde con HTTP 403 o error Cloudflare en el servidor, el motor debe capturar este estado y generar automáticamente una fuente Embed Web (`https://mgeb.top/embed/{id}`) como fallback seguro en lugar de romper el pipeline.
3. **Resolución Asistida por Cliente en el Live Test de Admin:**
   - En `/admin`, si el test del servidor detecta un bloqueo por HTTP 403 de Cloudflare, la interfaz realiza un intento asistido desde el navegador del cliente (que no sufre el bloqueo de IP del servidor). Al completarse, reporta las fuentes reales extraídas y advierte al administrador con diagnóstico claro.
4. **Garantía de Reproducción en `/api/resolve`:**
   - Asegurar que ante cualquier bloqueo 403 en el servidor, S14 emita la tarjeta iframe del embed funcional para que el usuario pueda reproducir el contenido en la aplicación.

---

## 3. Criterios de Aceptación

- [ ] `lib/hls-engine.ts` implementa cabeceras completas de navegador y soporte de resiliencia ante 403 en `http_request`.
- [ ] Si el backend recibe HTTP 403 en `embed_page`, el motor no arroja un error fatal irrecuperable: emite la URL embed como fallback y marca el diagnóstico correspondiente.
- [ ] En `/admin`, el test en vivo no queda bloqueado con `"Error en paso [embed_page]: HTTP 403"`. Si el servidor es bloqueado, se activa el fallback asistido en el navegador o se informa la fuente embed lista.
- [ ] `/api/resolve` siempre entrega fuentes funcionales (HLS o Embed) para S14.
- [ ] `npm run build` compila con 0 errores de tipado TypeScript y validación de sintaxis.
