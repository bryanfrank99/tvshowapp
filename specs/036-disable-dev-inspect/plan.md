# Plan: Desactivación de Clic Derecho y Herramientas de Desarrollador en Producción (spec ./spec.md)

## Enfoque
Implementar un componente de cliente ligero (`components/DevInspectBlocker.tsx`) montado en `app/layout.tsx`. El componente verifica que `process.env.NODE_ENV === "production"`. Si no es producción, retorna `null` y no registra listeners. Si es producción, registra listeners globales pasivos y de captura para `contextmenu` y `keydown` (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U) cancelando el evento mediante `preventDefault()`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `components/DevInspectBlocker.tsx` | Crear — listener de `contextmenu` y atajos DevTools condicionado a `NODE_ENV === "production"` |
| `app/layout.tsx` | Editar — montar `<DevInspectBlocker />` dentro del `RootLayout` |
| `scripts/test-dev-inspect-blocker.mjs` | Crear — pruebas unitarias simuladas de prevención de eventos en producción vs desarrollo |

## Decisiones
- **Componente cliente independiente vs inyectar script inline:** Crear un componente cliente React limpio con hook `useEffect` garantiza un ciclo de vida correcto, remoción de listeners al desmontar y compatibilidad SSR con Next.js App Router sin violar directivas de CSP (`unsafe-inline`).
- **Verificación condicional por `process.env.NODE_ENV`:** En Next.js, `process.env.NODE_ENV` es reemplazado estáticamente en tiempo de build por `"production"` en producción, eliminando código superfluo en los bundles o permitiendo depurar en local.

## Riesgos
- **Riesgo:** Bloqueo accidental de combinaciones de teclas legítimas (como Ctrl+C para copiar texto o teclas de navegación).
  - *Mitigación:* Se verifica explícitamente `(ctrl || meta) && shift && (key === 'I' || key === 'J' || key === 'C')` o `(ctrl || meta) && (key === 'U')` o `key === 'F12'`. El copiado normal `Ctrl+C` (sin shift) permanece intacto.
- **Riesgo:** Conflicto con controles de TV o inputs de búsqueda.
  - *Mitigación:* Ninguna de las combinaciones restringidas colisiona con el control remoto ni con la escritura de texto ordinaria.

## Verificación
- `node scripts/test-dev-inspect-blocker.mjs`
- `npm run build`
