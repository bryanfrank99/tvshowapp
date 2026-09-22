# Plan: Apps Independientes Móvil & Android TV + UI Adaptativa (spec ./spec.md)

## Enfoque
1. **Frontend Web Adaptativo:**
   - Crear `hooks/useDeviceMode.ts` para unificar la detección de entorno (`isTV`, `isMobile`, `isDesktop`).
   - Crear `components/MobileBottomNav.tsx` con tabs para Inicio, Pelis, Series, Buscar, Mi Lista e Idioma con clases utilitarias de Tailwind (`flex md:hidden [.tv_&]:!hidden`) para evitar parpadeos de renderizado del lado del cliente.
   - Modificar `components/SideNav.tsx` para ocultarse en móviles (`hidden md:flex [.tv_&]:flex`).
   - Modificar `components/Header.tsx` para añadir el logo a la izquierda en móvil.
   - Modificar `app/layout.tsx` para incorporar `MobileBottomNav` y padding compensatorio `pb-20 md:pb-8`.
2. **Arquitectura Android con Gradle Flavors:**
   - Modificar `android/app/build.gradle` añadiendo `flavorDimensions "device"` y los flavors `mobile` y `tv`.
   - Crear los manifests de flavor:
     - `android/app/src/mobile/AndroidManifest.xml`: launcher normal y touchscreen.
     - `android/app/src/tv/AndroidManifest.xml`: leanback launcher y orientación horizontal.
   - Modificar `android/app/src/main/java/com/tvshow/app/MainActivity.java` para inyectar `BuildConfig.UA_TAG`.
3. **CI/CD y Scripts:**
   - Modificar `.github/workflows/release.yml` para compilar ambos APKs y publicarlos como `TVShow-Mobile-vX.Y.Z.apk` y `TVShow-TV-vX.Y.Z.apk`.
   - Añadir scripts `build:apk:mobile`, `build:apk:tv`, `build:apks` en `package.json`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `specs/023-mobile-app-ui/{spec.md,plan.md,tasks.md}` | Crear especificación formal, plan y tareas |
| `hooks/useDeviceMode.ts` | Crear hook de detección de dispositivo |
| `components/MobileBottomNav.tsx` | Crear barra de navegación móvil con tabs y safe area |
| `components/SideNav.tsx` | Editar visibilidad responsive (`hidden md:flex [.tv_&]:flex`) |
| `components/Header.tsx` | Añadir logo TVShow en versión móvil a la izquierda |
| `app/layout.tsx` | Integrar MobileBottomNav y padding inferior móvil |
| `android/app/build.gradle` | Añadir flavors `mobile` y `tv` con BuildConfig fields y placeholders |
| `android/app/src/main/AndroidManifest.xml` | Adaptar para placeholders de orientación y categoría |
| `android/app/src/mobile/AndroidManifest.xml` | Manifest complementario para móvil |
| `android/app/src/tv/AndroidManifest.xml` | Manifest complementario para Android TV con Leanback |
| `android/app/src/main/java/com/tvshow/app/MainActivity.java` | Inyección dinámica de UA_TAG según el flavor compilado |
| `.github/workflows/release.yml` | Compilación y publicación simultánea de ambos APKs |
| `package.json` | Añadir scripts npm para compilar APKs por flavor |

## Decisiones
- **CSS-first para visibilidad de navegación:** El uso de clases Tailwind (`hidden md:flex [.tv_&]:flex` y `flex md:hidden [.tv_&]:!hidden`) garantiza cero layout shift ni parpadeo durante la hidratación de Next.js en móvil o TV.
- **Product Flavors en Gradle:** Es el estándar oficial de Android para compilar múltiples variantes desde un mismo código nativo, manteniendo el mismo código Java de WebView y AdBlock.

## Riesgos y Mitigaciones
- **Riesgo:** Conflicto de manifest al fusionar flavors en Gradle.
  - *Mitigación:* Se usan placeholders (`${screenOrientation}`) y `tools:replace` o manifests específicos en `src/mobile/` y `src/tv/`.
- **Riesgo:** La barra inferior tapa botones en páginas móviles.
  - *Mitigación:* Se agrega padding inferior `pb-20` al contenedor `<main>` en móvil y se oculta la barra en `/watch`.

## Verificación
- `npm run build` 100% verde.
- `npm run test:sources` 100% verde.
- Pruebas visuales con emulación móvil (<768px) y TV (`?tv=1`).
