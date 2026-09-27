# Plan: Proveedor Rei dos Canais y Rediseño de Administración de Canales (spec ./spec.md)

## Enfoque
1. **Proveedor Rei dos Canais:**
   - Registrar la fuente en `public/providers.json` y `supabase/seed.sql`.
   - Extender el tipo `LiveSource` en `lib/providers.ts` para aceptar `"reidoscanais"`.
   - Permitir dominios en `/api/live/list/route.ts` (`reidoscanais.st`, `api.reidoscanais.st`, `rdcanais.net`).
   - Agregar parser en `app/live/page.tsx` para extraer `data: [{ id, name, category, logo_url, embeds: [{ embed_url }], epg: { current: { title } } }]`.
   - Agregar dominios a `capacitor.config.ts`, `android/.../capacitor.config.json` y `AdBlockWebViewClient.java`.

2. **Diagnóstico de Salud de Canales (Health Check):**
   - Crear endpoint `/api/admin/live/health-check/route.ts` que mide la latencia y disponibilidad HTTP (HEAD/GET) de cada fuente en paralelo, devolviendo `healthy`, `slow`, `degraded` o `down` con `latencyMs`.

3. **Rediseño de Admin Canales en `app/admin/page.tsx`:**
   - Estructurar la interfaz exactamente como la pestaña de Servidores (`tab === "prov"`):
     - Barra superior con botón `+ Nueva Fuente Live` y botón `⚡ Diagnosticar Canales`.
     - Lista de fuentes con `#ord`, nombre, formato estilizado con pill/tag, estado de salud con indicador animado y latencia en ms, badges de inactivo.
     - Botones de acción: `Activar / Desactivar`, `Editar`, `Eliminar`.
     - Panel de edición/creación con inputs uniformes, selector de formato visual con botones interactivos y presets automáticos.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `lib/providers.ts` | Extender `LiveSource` format a `"streambetter" \| "tvf90" \| "reidoscanais"` |
| `public/providers.json` | Añadir `reidoscanais` a la lista `live` |
| `supabase/seed.sql` | Añadir `insert into live_sources` para `reidoscanais` |
| `app/api/live/list/route.ts` | Añadir dominios de Rei dos Canais a `ALLOWED` |
| `app/live/page.tsx` | Añadir soporte de extracción de canales y EPG de Rei dos Canais |
| `app/api/admin/live/route.ts` | Soportar `list_url` y `list` de forma transparente |
| `app/api/admin/live/health-check/route.ts` | Crear endpoint de diagnóstico de salud y latencia de canales en vivo |
| `app/admin/page.tsx` | Rediseñar pestaña de canales en vivo idéntica a la de servidores con diagnóstico de salud y nuevo formulario |
| `capacitor.config.ts` | Añadir `reidoscanais.st` y `rdcanais.net` a `allowNavigation` |
| `android/app/src/main/assets/capacitor.config.json` | Añadir dominios a `allowNavigation` |
| `android/app/src/main/java/com/tvshow/app/AdBlockWebViewClient.java` | Añadir dominios a `isAllowedHost` |
| `scripts/test-reidoscanais-live.mjs` | Test de integración y validación |

## Verificación
- `node scripts/test-reidoscanais-live.mjs`
- `npm run build`
