# Tasks: Navegación Móvil Estándar y Selector de Idioma (024-mobile-navigation-standard)

- [x] 1. Corregir el comando de compilación de Windows en `.github/workflows/release.yml` con `--publish never` y `GH_TOKEN` → verificar: sintaxis del workflow válida.
- [x] 2. Configurar `publish: null` en `package.json` para electron-builder → verificar: parseo de package.json correcto.
- [x] 3. Ajustar `MobileBottomNav.tsx` con las 5 pestañas clásicas (Inicio, Pelis, Series, En vivo, Mi lista) en `grid grid-cols-5` → verificar: estructura de 5 columnas.
- [x] 4. Integrar `LangMenu`, botón de búsqueda y acceso a Kids en el encabezado móvil `Header.tsx` → verificar: componentes exportados e importados limpiamente.
- [x] 5. Ejecutar `npm run test:sources` y `npm run build` → verificar: build 100% verde.
- [x] 6. Actualizar `walkthrough.md` documentando los cambios.

