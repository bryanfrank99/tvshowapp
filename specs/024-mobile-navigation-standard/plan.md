# Plan: Navegación Móvil Estándar y Selector de Idioma (spec ./spec.md)

## Enfoque
1. **Barra de Navegación Inferior (`MobileBottomNav.tsx`):**
   - Configurar exactamente las 5 pestañas clásicas en una cuadrícula proporcional `grid grid-cols-5`: Inicio, Pelis, Series, En vivo, Mi lista.
   - Mantener efecto backdrop-blur, safe area insets y auto-ocultado en `/watch`.
2. **Encabezado Móvil Superior (`Header.tsx`):**
   - Incorporar `LangMenu` (dropdown con ES/EN/PT) junto al botón de Búsqueda (`IconSearch`) y botón Kids (`KIDS`) a la derecha del header, solo visibles en móvil (`md:hidden [.tv_&]:!hidden`).
3. **Corrección de Build de Windows en GitHub Actions (`.github/workflows/release.yml`):**
   - Pasar el flag `--publish never` y variable `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` para evitar que electron-builder intente publicar por su cuenta al detectar un tag de git.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `components/MobileBottomNav.tsx` | Ajustar a 5 pestañas clásicas de contenido |
| `components/Header.tsx` | Añadir `LangMenu`, búsqueda y Kids en móvil |
| `package.json` | Añadir `publish: null` y `--publish never` en `electron:dist` |
| `.github/workflows/release.yml` | Añadir `--publish never` y `GH_TOKEN` en paso de Windows |
| `specs/024-mobile-navigation-standard/*` | Especificación, plan y tareas SDD |

## Verificación
- `npm run test:sources` 100% verde.
- `npm run build` 100% verde.
