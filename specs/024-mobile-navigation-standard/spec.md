# Spec: Navegación Móvil Estándar y Selector de Idioma en Encabezado

## Contexto
El usuario solicitó que la interfaz de la aplicación móvil use el estándar tradicional de navegación de aplicaciones de streaming:
1. Una barra de navegación inferior fija (`BottomNav`) con las 5 pestañas principales de contenido (Inicio, Películas, Series, TV en vivo y Mi lista), tal como se tenía anteriormente en el proyecto.
2. Adaptar las opciones secundarias (búsqueda rápida, sección Kids y selector de idioma `LangMenu`) en la parte superior del encabezado (`Header`) para que el usuario pueda cambiar de idioma y buscar sin saturar la barra de pestañas inferior.

## Objetivos
- [ ] Restaurar la cuadrícula clásica de 5 pestañas en `MobileBottomNav.tsx`:
  - Inicio (`/`), Pelis (`/movies`), Series (`/series`), En vivo (`/live`), Mi lista (`/list`).
- [ ] Integrar el selector de idioma `LangMenu` en la barra superior móvil (`Header.tsx`) junto a los accesos directos de búsqueda y Kids.
- [ ] Desactivar el auto-publish implícito de `electron-builder` en GitHub Actions (`--publish never`) y configurar `GH_TOKEN` para corregir el fallo de compilación del instalador de Windows.
- [ ] Asegurar que la barra de navegación inferior y los controles móviles permanezcan estrictamente ocultos en Android TV (`[.tv_&]:!hidden`) y en escritorio (`md:hidden`).

## No objetivos
- No modificar el comportamiento de navegación en TV (control remoto / D-pad) ni en escritorio.
- No alterar rutas ni APIs del backend.

## Criterios de aceptación
- [ ] En pantallas móviles (<768px): la barra inferior muestra 5 botones con iconos y textos en el idioma activo (`tabs_home`, `tabs_movies`, etc.).
- [ ] En el encabezado móvil se visualiza el logo TVShow, el botón de búsqueda, el botón de Kids y el selector de idioma desplegable (`LangMenu`).
- [ ] Al cambiar el idioma en `LangMenu`, la interfaz completa se actualiza inmediatamente.
- [ ] La compilación de Windows con `electron-builder` no falla por falta de token de GitHub.
- [ ] `npm run build` y `npm run test:sources` se ejecutan 100% limpios.

## Restricciones
- Constitución: 1 (Español, inglés y portugués), 3 (Build verde o no existe), 6 (Móvil primero con targets táctiles ≥48px).
