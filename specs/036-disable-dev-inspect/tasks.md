# Tasks: Desactivación de Clic Derecho y Herramientas de Desarrollador en Producción

- [x] 1. Crear `components/DevInspectBlocker.tsx` con soporte para bloqueo de `contextmenu` y atajos DevTools (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U) solo en `NODE_ENV === "production"`.
- [x] 2. Integrar `<DevInspectBlocker />` en `app/layout.tsx`.
- [x] 3. Crear script de pruebas `scripts/test-dev-inspect-blocker.mjs` y verificar que los bloqueos funcionen en producción y se ignoren en desarrollo.
- [x] 4. Ejecutar `npm run build` para asegurar compilación sin errores.
- [x] 5. Ejecutar la suite completa de pruebas.
