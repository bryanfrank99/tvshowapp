# Spec 071: Configuración de Pools HLS como Servidores Prioritarios por Idioma

## 1. Problema y Contexto
- Previamente, el sistema de prioridades de servidores por idioma (`LanguagePriorityManager`) solo permitía seleccionar servidores individuales (ej. S1, S2, S3 iframe).
- Los Pools HLS unificados (con failover transparente) no podían ser seleccionados directamente como el servidor principal (#1) o dentro del ranking de prioridades por idioma.
- Los administradores necesitan poder configurar el **Pool HLS** como prioridad máxima (#1) para que los usuarios reproduzcan en el stream nativo de alta velocidad por defecto en su idioma, pasando a los servidores iframe tradicionales solo si el pool HLS completo fallara.

## 2. Requerimientos Funcionales
1. **Opción 'hls' en la Matriz de Prioridades por Idioma:**
   - En cada pestaña de idioma (`es`, `pt`, `en`), el Pool HLS (`value="hls"`) debe estar disponible para añadir a la lista de servidores priorizados.
   - En la lista de prioridades, el Pool HLS se renderiza con un diseño distintivo (`⚡ POOL HLS NATIVO - Multi-Stream`).
   - Se puede ordenar hacia arriba/abajo (▲ / ▼) para definir si va en la posición #1 o detrás de otros servidores.
2. **Acción Rápida de Priorización en Panel HLS:**
   - En las tarjetas del panel "Pools HLS Unificados por Idioma", incluir un botón de acceso directo para fijar el pool como **Prioridad #1** de ese idioma con un solo clic.
3. **Mapeo y Ordenamiento en el Resolver (`lib/sources.ts` y `app/api/resolve/route.ts`):**
   - El algoritmo `sortSourcesByPriority` debe reconocer el identificador `"hls"` y emparejarlo con las fuentes unificadas `type === "hls"` o `providerName === "HLS"`.
   - Si `"hls"` está en la posición #1 para el idioma del usuario, el stream consolidado HLS de ese idioma se seleccionará automáticamente como el servidor activo recomendado (`recommendedSourceId`).
