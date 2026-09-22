# Tasks: Apps Independientes Móvil & Android TV + UI Adaptativa (023-mobile-app-ui)

- [x] 1. Crear `hooks/useDeviceMode.ts` para unificar detección de TV, móvil y desktop → verificar: pruebas de detección con UA simulada.
- [x] 2. Crear `components/MobileBottomNav.tsx` con tabs para Inicio, Pelis, Series, Buscar, Mi Lista, Idioma y respeto a safe-area-inset → verificar: componente exportado y estilos válidos.
- [x] 3. Modificar `components/SideNav.tsx` para ocultarse en móvil (`hidden md:flex [.tv_&]:flex`) → verificar: clases de visibilidad correctas.
- [x] 4. Modificar `components/Header.tsx` para mostrar logo en móvil (`md:hidden`) → verificar: logo y breadcrumbs alineados.
- [x] 5. Modificar `app/layout.tsx` para integrar `MobileBottomNav` y añadir padding inferior `pb-20 md:pb-8` → verificar: layout renderiza adecuadamente.
- [x] 6. Modificar `android/app/build.gradle` para configurar flavors `mobile` y `tv` con sus respectivos `applicationId`, `UA_TAG` y orientación → verificar: sintaxis de Gradle válida.
- [x] 7. Configurar manifests para flavors `src/mobile/AndroidManifest.xml` y `src/tv/AndroidManifest.xml`, y actualizar `MainActivity.java` para inyectar `BuildConfig.UA_TAG` → verificar: compatibilidad de manifests.
- [x] 8. Actualizar `.github/workflows/release.yml` y scripts de `package.json` para compilar ambos APKs → verificar: scripts listados en package.json.
- [x] 9. Ejecutar `npm run build` y `npm run test:sources` asegurando build 100% verde.
- [x] 10. Actualizar `walkthrough.md` documentando la nueva arquitectura móvil y de TV.

