# Specification: Eliminación del Sistema de Proveedores Legacy Basado en JSON

## 1. Problem Statement & Motivation
Anteriormente, el sistema de servidores y canales en vivo dependía de un archivo estático `public/providers.json`.
Este enfoque presentaba varios problemas:
1. **Seguridad y Exposición Pública**: El archivo estaba en la carpeta pública (`/providers.json`), exponiendo abiertamente todas las URLs de templates de streaming, claves de acceso de servidores de terceros y endpoints internos a cualquier usuario o bot sin autenticación.
2. **Duplicidad y Desincronización**: Todos los proveedores y canales se administran y guardan dinámicamente en Supabase (`providers` y `live_sources`) y en la caché segura de sesión en `/api/providers`. Mantener `providers.json` causaba confusión sobre la fuente de la verdad.
3. **Fallbacks Obsoletos**: Existían referencias legacy y lecturas de fallback a `public/providers.json` en el código de diagnóstico y utilidades.

## 2. Requirements & Goals
1. Eliminar completamente el archivo físico `public/providers.json`.
2. Remover cualquier función legacy o fallback que lea o exponga `/providers.json` en `lib/providers.ts` y en los endpoints API (como `app/api/admin/live/health-check/route.ts`).
3. Actualizar `scripts/supabase.mjs` para no depender de `providers.json`.
4. Asegurar que `/api/providers`, `/api/resolve`, `/admin`, y la reproducción sigan funcionando de forma 100% autónoma a través de Supabase sin ninguna dependencia de archivos JSON locales.
5. Crear y ejecutar `scripts/test-remove-json-providers.mjs` para verificar la eliminación limpia y que el sistema funciona sin `providers.json`.
