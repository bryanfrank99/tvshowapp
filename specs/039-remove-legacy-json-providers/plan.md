# Implementation Plan: Eliminación del Sistema de Proveedores Legacy Basado en JSON

## Changes to Implement

### 1. Eliminar `public/providers.json`
- Borrar el archivo `public/providers.json`.

### 2. Limpieza en el Código Fuente
- **`lib/providers.ts`**:
  - Eliminar o limpiar la función legacy `providersUrl()`.
- **`app/api/admin/live/health-check/route.ts`**:
  - Remover la lectura y el bloque de fallback que leía `public/providers.json`. Si no hay fuentes en la base de datos, simplemente devolver array vacío de resultados.
- **`scripts/supabase.mjs`**:
  - Si se ejecuta el comando `seed`, verificar si existe `public/providers.json`. Si no existe, parsear `supabase/seed.sql` o emitir un mensaje indicando que la base de datos Supabase es la fuente oficial.
- **`scripts/test-reidoscanais-live.mjs`**:
  - Actualizar para comprobar que `public/providers.json` ya no existe y que la fuente de verdad es la base de datos / SQL.

### 3. Verification
- Crear `scripts/test-remove-json-providers.mjs`.
- Probar compilación con `npm run build`.
- Commitear y pushear.
