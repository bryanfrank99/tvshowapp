# Tasks 053: Modo Renovación Estricto en AccessGate (Ocultar Input de Código)

- [x] 1. Implementar función `getDeviceAccessStatus` en `lib/access.ts`
- [x] 2. Extender endpoint `GET /api/access` en `app/api/access/route.ts` para evaluar el estado del dispositivo y auto-iniciar sesión si está activa
- [x] 3. Añadir textos localizados para modo renovación y chequeo en `lib/dict.ts`
- [x] 4. Actualizar `components/AccessGate.tsx` para ocultar el formulario de entrada en modo renovación y activar auto-desbloqueo
- [x] 5. Crear suite de pruebas automatizadas `scripts/test-renewal-mode-gate.mjs`
- [x] 6. Ejecutar pruebas unitarias y verificar build de producción
