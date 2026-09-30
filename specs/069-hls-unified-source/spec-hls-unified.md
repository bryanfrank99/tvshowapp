# Spec 069‑HLS‑Unified‑Source

## Contexto
- Los proveedores que entregan streams HLS (ej. **S18 – WatchPlay**, **S14**, etc.) se listan como fuentes independientes en la API y aparecen en el **panel de administración** y en la **pantalla de watch**.
- Cuando una fuente falla (404, CORS, red no disponible) el reproductor muestra el mensaje *“no se puede reproducir este stream en directo”* y el usuario debe cambiar manualmente a otra opción.

## Objetivo
Tratar todos los servidores HLS compatibles como **una única fuente lógica** que:
1. **Priorice** automáticamente la primera URL válida.
2. **Cambie** a la siguiente URL disponible en caso de error sin intervención del usuario.
3. **Muestre** en el panel de administración una única entrada con la lista de URLs alternativas.
4. **Actualice** la UI de *watch* para reflejar el estado de la fuente (activo / fallback).

## Requisitos funcionales
| # | Requisito | Descripción |
|---|-----------|-------------|
| 1 | Unificación de fuentes | En el resolver (`app/api/resolve/route.ts`) agrupar todas las fuentes con `type: "hls"` bajo un mismo `sourceId` y añadir un array `fallbackUrls` ordenado por prioridad. |
| 2 | Auto‑fallback en el reproductor | En `components/player/NativeSourcePlayer.tsx` detectar errores (`error` o `onstalled`) y cambiar `activeUrl` al siguiente elemento de `fallbackUrls`. Mantener un contador `fallbackIndex`. |
| 3 | UI admin – tabla de proveedores | Modificar la tabla de proveedores (p.ej., `components/admin/ProvidersTable.tsx`) para que la columna **URL** muestre la lista de URLs concatenadas, y añada una columna **Estado** que indique si la fuente está operativa (ping) y cuál es la URL activa. |
| 4 | UI watch – badge de fallback | En `components/player/SourceSelectorGrid.tsx` añadir un badge que indique *“Primary / Fallback #n”* según el índice actual. |
| 5 | Persistencia de estado | Opcional: guardar el último índice exitoso en **localStorage** para evitar volver a intentar URLs fallidas en la misma sesión. |
| 6 | Tests | - Unitario para `resolveSources` que verifica que se genera un solo `sourceId` con `fallbackUrls`.
- E2E para el reproductor que simula un error 404 y comprueba que se carga la segunda URL. |

## Cambios de código sugeridos
### Backend (`app/api/resolve/route.ts`)
```ts
// Agrupar HLS sources
const hlsSources = rawSources.filter(s => s.type === "hls");
if (hlsSources.length) {
  const primary = hlsSources[0];
  const fallbackUrls = hlsSources.slice(1).map(s => s.url);
  sources.push({
    id: primary.id,
    type: "hls",
    url: primary.url,
    fallbackUrls,
    priority: 120,
    provider: "watchplay",
  });
}
```
### Reproductor (`NativeSourcePlayer.tsx`)
```tsx
const [fallbackIndex, setFallbackIndex] = useState(0);
const activeUrl = source.fallbackUrls?.[fallbackIndex] ?? source.url;

const handleError = () => {
  if (fallbackIndex < (source.fallbackUrls?.length ?? 0)) {
    setFallbackIndex(prev => prev + 1);
  } else {
    setError(true);
  }
};

<video
  ref={videoRef}
  onError={handleError}
  onStalled={handleError}
  ...
/>
```
### Admin panel (`ProvidersTable.tsx`)
```tsx
<td>{source.fallbackUrls?.join(' | ') || source.url}</td>
<td>{source.isOnline ? '✅' : '❌'} ({fallbackIndex + 1}/{(source.fallbackUrls?.length ?? 0) + 1})</td>
```
### Watch UI (`SourceSelectorGrid.tsx`)
```tsx
<span>{fallbackIndex === 0 ? 'Primary' : `Fallback #${fallbackIndex}`}</span>
```

## Plan de implementación (SDD)
1. **Especificación** – crear este archivo `spec-hls-unified.md` bajo `specs/069-hls-unified-source/`.
2. **Desarrollo backend** – agrupar fuentes HLS.
3. **Desarrollo frontend** – implementar fallback y UI.
4. **Pruebas unitarias** – cubrir la lógica de agrupación.
5. **Pruebas E2E** – simular fallo de la URL primaria.
6. **Revisión de código** – SDD exige que cada commit incluya una referencia al número de spec.
7. **Despliegue** – actualizar CI para ejecutar los nuevos tests.

## Impacto
- **UX**: el usuario nunca verá el mensaje de error; el reproductor cambiará automáticamente.
- **Operaciones**: menos intervención manual del staff de soporte.
- **Mantenimiento**: los administradores gestionan una sola fila por proveedor, con todas sus URLs listadas.

---
*Este documento sigue la metodología **Spec‑Driven Development (SDD)**: todas las decisiones de diseño se describen aquí antes de codificar.*
