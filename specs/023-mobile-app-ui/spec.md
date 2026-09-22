# Spec: Apps Independientes Móvil & Android TV + UI Adaptativa

## Contexto
En la spec 010 se eliminó temporalmente la barra inferior móvil para forzar una única vista con sidebar en todas las pantallas. Sin embargo, en teléfonos móviles verticales (360px a 430px de ancho), el sidebar lateral consume 64px valiosos dejando el contenido comprimido e incómodo para navegación táctil con el pulgar. Asimismo, en Android TV se requiere una app en horizontal fija con navegación D-Pad y banner Leanback.

Para resolver este desafío de manera limpia y definitiva, se separará la compilación de Android en **dos aplicaciones independientes** (`TVShow Mobile` y `TVShow TV`) utilizando Gradle Flavors, y se adaptará la interfaz web de manera receptiva y elegante para ofrecer una **Barra de Navegación Inferior (BottomNav)** en móviles sin alterar ni romper la experiencia actual de TV ni de escritorio.

## Objetivos
- [ ] Implementar dos *Product Flavors* en Gradle (`mobile` y `tv`) generando APKs con identidades independientes:
  - `TVShow Mobile`: `com.tvshow.mobile`, orientación libre/vertical (`user`), launcher estándar para smartphones/tablets, User-Agent `TVShowMobile`.
  - `TVShow TV`: `com.tvshow.tv`, orientación horizontal forzada (`sensorLandscape`), launcher Leanback para Android TV/Google TV, User-Agent `TVShowTV`.
- [ ] Crear el componente `MobileBottomNav.tsx`:
  - Barra de navegación fija inferior en móviles con efecto translúcido blur y respeto a la zona segura (`safe-area-inset-bottom`).
  - Pestañas táctiles principales: Inicio, Películas, Series, Buscar, Mi Lista e Idioma/Kids con soporte multilingüe (ES, EN, PT).
  - Oculta estrictamente en Android TV (`[.tv_&]:!hidden`) y en pantallas medianas/grandes de escritorio (`md:hidden`).
- [ ] Adaptar `SideNav.tsx`:
  - Ocultar en móviles (`hidden md:flex [.tv_&]:flex`), liberando el 100% del ancho de pantalla para tarjetas y contenidos.
  - Mantener visible en escritorio y siempre visible en Android TV.
- [ ] Adaptar `Header.tsx`:
  - Mostrar logotipo de TVShow a la izquierda en pantallas móviles (`md:hidden`) para mantener la identidad visual ya que el sidebar no está presente.
- [ ] Ajustar `app/layout.tsx`:
  - Añadir padding inferior compensatorio en móviles (`pb-20 md:pb-8`) para que la barra fija no tape los últimos elementos de listas.
- [ ] Actualizar el workflow `.github/workflows/release.yml` para compilar y publicar ambos binarios (`TVShow-Mobile-vX.Y.Z.apk` y `TVShow-TV-vX.Y.Z.apk`) en cada release de GitHub.

## No objetivos
- No crear dos repositorios distintos ni duplicar código de rutas en Next.js.
- No alterar el comportamiento del reproductor de video en TV o escritorio.

## Criterios de aceptación
- [ ] En pantallas móviles (<768px): el sidebar lateral no se muestra, el contenido ocupa el 100% del ancho y la barra inferior `MobileBottomNav` está visible y operativa.
- [ ] En pantallas de escritorio (≥768px): el sidebar se muestra y la barra inferior está completamente oculta.
- [ ] En modo TV (UserAgent `TVShowTV` o query `?tv=1` o `?mode=tv`): el sidebar se muestra, el control D-pad (`TvNav`) funciona y la barra inferior está oculta.
- [ ] Todos los textos de navegación están en ES, EN y PT.
- [ ] `npm run build` y `npm run test:sources` se mantienen 100% verdes.
- [ ] Gradle compila correctamente las tareas `assembleMobileDebug` y `assembleTvDebug`.

## Restricciones
- Constitución: 1 (Español, inglés y portugués en toda UI), 3 (Build verde o no existe), 6 (Móvil primero + mando TV con targets táctiles ≥48px).
