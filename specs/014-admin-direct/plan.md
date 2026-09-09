# Plan: admin y Supabase directo (spec ./spec.md)

## Enfoque
1. `lib/access.ts`: si `admin_users` vacía, adminLoginOk acepta `ADMIN_PASSWORD` y lo siembra (hash).
2. Nuevo `app/api/admin/health` para diagnóstico + `scripts/supabase.mjs` para CLI.
3. Mensajes de error explícitos (NO_SUPABASE) en login y health.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `lib/access.ts` | seed inicial admin |
| `app/api/admin/health/route.ts` | crear |
| `scripts/supabase.mjs` | crear (ping + seed) |
| `app/admin/page.tsx` | mostrar error de env si aplica |

## Riesgos
- Service key expuesta → solo servidor, nunca al cliente (ya es así).

## Verificación
- `npm run build`, curl health, login real
