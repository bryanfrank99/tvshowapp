# Tareas de Implementación: Spec 035

- [x] 1. Crear migración SQL `supabase/migration_device_bindings.sql`.
- [x] 2. Crear módulo de identificación de dispositivo en cliente `lib/device-id.ts`.
- [x] 3. Actualizar `lib/access.ts` con `checkDeviceEligibility` y `bindDeviceToCode` (con resiliencia y fallback).
- [x] 4. Actualizar `POST /api/access` para recibir `deviceId`, validar elegibilidad y vincular el equipo.
- [x] 5. Actualizar `resetSessionsForCode` y `app/api/admin/codes/route.ts` para desvincular dispositivos.
- [x] 6. Agregar textos trilingües (ES, PT, EN) en `lib/dict.ts` y `lib/admin-dict.ts`.
- [x] 7. Actualizar `components/AccessGate.tsx`, `components/AutoAccessHandler.tsx` y `hooks/useSession.ts` para enviar `deviceId` y manejar el error `device_blocked_inactive`.
- [x] 8. Crear y ejecutar script de prueba automatizado `scripts/test-device-binding.mjs`.
- [x] 9. Ejecutar `npm run build` para asegurar compilación limpia.
- [x] 10. Actualizar `walkthrough.md`, realizar commit y push a GitHub.
