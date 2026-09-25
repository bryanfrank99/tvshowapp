# Plan: App de Escritorio Windows con Electron (spec ./spec.md)

## Enfoque
Implementar un shell nativo en `electron/` que cargue la URL de producción (`https://tvshowapp.net`), aplicando políticas estrictas de seguridad (aislamiento de contexto, sin Node en el renderer) y filtrado a nivel de sesión en Chromium para replicar exactamente el comportamiento de Android:
1. `setWindowOpenHandler`: deniega la apertura de ventanas no deseadas de los reproductores y delega enlaces externos legítimos a `shell.openExternal`.
2. `webRequest.onBeforeRequest`: filtra URLs entrantes contra la base de datos de hosts de anuncios (`adhosts.txt`).
3. Empaquetado con `electron-builder` configurado para generar instalador `.exe` (NSIS) y ejecutable portable para Windows con el ícono oficial de la aplicación.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `specs/022-windows-electron/spec.md` | Crear especificación formal |
| `specs/022-windows-electron/plan.md` | Crear plan de arquitectura |
| `specs/022-windows-electron/tasks.md` | Crear tareas ejecutables paso a paso |
| `electron/main.js` | Crear proceso principal (BrowserWindow, popups, webRequest, F11, menu) |
| `electron/preload.js` | Crear preload con contextIsolation y seguridad |
| `electron/adblock.js` | Crear parser y matcher de dominios y subdominios |
| `electron/adhosts.txt` | Sincronizar lista de dominios bloqueados desde Android |
| `package.json` | Instalar `electron` y `electron-builder` en devDependencies + añadir scripts `electron:dev`, `electron:pack`, `electron:dist` + config `build` |
| `.gitignore` | Agregar `dist/` para ignorar artefactos compilados de Electron |

## Decisiones
- **Shell remoto en lugar de empaquetar Next.js localmente:** Mantiene cero deuda técnica, cero divergencia de código con la web y Android, y permite que las correcciones en el servidor o catálogo impacten a la app de Windows al instante sin reinstalación.
- **Filtro de URLs embebido (`adhosts.txt`):** Idéntico a Android, funciona localmente sin dependencias externas complejas.
- **Ubicación en `electron/`:** Mantiene la raíz y los fuentes de Next.js limpios e independientes.
- **Dependencias en `devDependencies`:** Evita que Vercel intente instalar o usar binarios de Electron durante el despliegue web.

## Riesgos
- **Riesgo 1: Vercel build afectado por paquetes de Electron.**
  - *Mitigación:* Se colocan estrictamente en `devDependencies` y Next.js no importa nada de `electron/`. `npm run build` ejecuta únicamente `next build`.
- **Riesgo 2: Enlaces legítimos rotos dentro de la app.**
  - *Mitigación:* Se define una lista blanca (`isAllowedHost`) para navegación interna y se envían URLs externas legítimas al navegador predeterminado de Windows.

## Verificación
- `npm run build` verde (Next.js sin errores).
- `npx electron electron/main.js` abre la ventana, carga la app web y bloquea popups.
- `npm run test:sources` sigue 100% pasando.
