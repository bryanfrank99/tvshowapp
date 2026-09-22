# Tasks: App de Escritorio Windows con Electron (022-windows-electron)

- [x] 1. Instalar `electron` y `electron-builder` en `devDependencies` → verificar: `npm ls electron electron-builder`.
- [x] 2. Crear `electron/adhosts.txt` y `electron/adblock.js` con el motor de coincidencia de dominios → verificar: test unitario con hosts de prueba.
- [x] 3. Crear `electron/preload.js` y `electron/main.js` con ventana principal, interceptor de popups (`setWindowOpenHandler`), interceptor de red (`onBeforeRequest`), atajos de teclado y menú → verificar: sintaxis e importaciones limpias.
- [x] 4. Actualizar `package.json` con scripts (`electron:dev`, `electron:pack`, `electron:dist`) y bloque de configuración `build` para Windows (NSIS, portable, icono) → verificar: `npm run` muestra los nuevos comandos.
- [x] 5. Actualizar `.gitignore` con `/dist` de Electron → verificar: `git status` no lista temporales.
- [x] 6. Verificar que `npm run build` y `npm run test:sources` se mantengan 100% verdes.
- [x] 7. Probar ejecución y validación de la app en Windows (`dist/win-unpacked/TVShow.exe` generado exitosamente).

