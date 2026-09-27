# Spec: Desactivación de Clic Derecho y Herramientas de Desarrollador en Producción

## Contexto
En el despliegue web de producción de TVShow (`tvshowapp.net` y entornos web productivos), se busca proteger la interfaz y dificultar la inspección no autorizada del código, las URLs de los proveedores y el DOM mediante el menú contextual y las teclas de acceso rápido a DevTools (F12, atajos de inspección y ver código fuente). Esta restricción debe operar exclusivamente en producción (`NODE_ENV === "production"`) para preservar la comodidad de desarrollo y depuración local.

## Objetivos
- [ ] Bloquear el menú contextual de clic derecho (`contextmenu`) en entornos de producción.
- [ ] Bloquear la tecla `F12` y combinaciones de teclas típicas de apertura de DevTools / Ver código fuente (`Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Cmd+Option+I`, `Cmd+Option+J`, `Cmd+Option+C`, `Ctrl+U`, `Cmd+U`).
- [ ] Asegurar que en modo desarrollo (`NODE_ENV !== "production"`) el clic derecho y F12 permanezcan 100% operativos.
- [ ] No interferir con la navegación por teclado ordinaria, escritura en inputs, ni funciones de accesibilidad ni mando TV.

## No objetivos
- Modificar el comportamiento de la versión de escritorio Electron (que ya gestiona sus propias opciones de ventana y menús).
- Intentar detener herramientas de depuración a nivel de red proxy inversa (solo protección en el cliente web).

## Criterios de aceptación
- [ ] En producción (`process.env.NODE_ENV === "production"`), el evento `contextmenu` ejecuta `e.preventDefault()`.
- [ ] En producción, las pulsaciones de `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U` (y equivalentes en Mac con `metaKey`) ejecutan `e.preventDefault()` y `e.stopPropagation()`.
- [ ] En desarrollo (`process.env.NODE_ENV !== "production"`), no se añade ningún listener restrictivo ni se bloquea ninguna tecla ni clic.
- [ ] `npm run build` compila sin errores.
- [ ] Suite de pruebas automatizadas en `scripts/test-dev-inspect-blocker.mjs` valida todos los escenarios.

## Restricciones
- Sin dependencias externas adicionales.
- Componente cliente Next.js aislado y seguro (`components/DevInspectBlocker.tsx`), incluido en el layout raíz (`app/layout.tsx`).
