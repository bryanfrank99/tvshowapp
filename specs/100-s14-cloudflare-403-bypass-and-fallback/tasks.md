# Tareas de Implementación - Spec 100

- [x] 1. Modificaciones en el Motor Declarativo `lib/hls-engine.ts`
  - [x] 1.1 Robustecer cabeceras base de emulación de navegador en `executeStep` para `http_request`.
  - [x] 1.2 Agregar soporte para `allow_embed_fallback` y captura de HTTP 403 / Cloudflare Challenge.
  - [x] 1.3 Ensamblar fuentes `embeds` de respaldo en `runHlsExtractor` cuando el servidor es bloqueado por WAF.
  - [x] 1.4 Actualizar el preset declarativo `EXTRACTOR_PRESETS.megaembed`.
- [x] 2. Ajustes en `app/api/resolve/route.ts`
  - [x] 2.1 Garantizar que el embed generado por WAF fallback sea emitido como fuente reproducible para S14.
- [x] 3. Resolución Asistida en `app/admin/page.tsx`
  - [x] 3.1 Detectar errores 403 en `runExtractorTest` y lanzar prueba asistida en cliente con CORS abierto.
  - [x] 3.2 Mostrar feedback visual claro del estado WAF y fuentes resueltas por el navegador.
- [x] 4. Verificación y Compilación
  - [x] 4.1 Validar extracción en vivo mediante pruebas automatizadas.
  - [x] 4.2 Ejecutar `npm run build` y asegurar 0 errores.
