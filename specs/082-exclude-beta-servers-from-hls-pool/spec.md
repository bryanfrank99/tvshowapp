# Spec 082: Exclusión de Servidores Beta de la Pool HLS Unificada

## Contexto y Motivación
El usuario ha definido la siguiente regla técnica y operativa:
> "cuando un servidor hls esta en modo beta no lo coloques dentro de la pool, es la fomra que tendremos para poder testear el server, usa sdd"

Cuando un servidor de streaming HLS está configurado o marcado en modo beta (`isBeta === true` o `is_beta = true` en la base de datos):
1. **Aislamiento Estricto de la Pool de Producción:**
   - Dicho servidor NO debe agruparse, fusionarse ni enlazarse como stream primario ni como backup dentro de la Pool HLS unificada de producción (`HLS (PT)` o `HLS (ES)`).
   - La Pool HLS debe conformarse exclusivamente con servidores estables probados (`isBeta: false`).
2. **Preservación como Servidor Individual de Pruebas:**
   - El servidor HLS beta debe preservarse como una tarjeta independiente en el selector de servidores (`sources`), conservando su número de orden (`ord`, ej: `#14 S14`), su insignia `HLS` y su etiqueta `BETA`.
   - Esto permite que los administradores y testers puedan seleccionarlo manualmente en la cuadrícula de servidores y comprobar su funcionamiento, estabilidad y compatibilidad sin alterar el stream de producción ni afectar a los usuarios generales.
3. **Ordenamiento y Prioridad:**
   - Al estar en modo beta, el algoritmo `sortSourcesByPriority` garantiza que los servidores estables (y la Pool HLS oficial) siempre tengan prioridad sobre el servidor beta, evitando que un servidor experimental se seleccione como predeterminado en posición `#0`.

---

## Criterios de Aceptación
1. **`lib/sources.ts`:**
   - La función `isHlsPoolSource(s: Source): boolean` debe excluir explícitamente fuentes con `isBeta: true`. Una fuente beta nunca califica como Pool HLS.
2. **`app/api/resolve/route.ts`:**
   - En la unificación de fuentes HLS, filtrar únicamente aquellas con `type === "hls" && !s.isBeta` para la creación de las pools HLS por idioma.
   - Las fuentes HLS con `isBeta: true` se mantienen intactas en la lista general de fuentes como servidores individuales de pruebas.
3. **`app/watch/page.tsx`:**
   - En la extracción paralela client-side (`mergeExtractedStreams`), si un stream extraído proviene de un proveedor en modo beta (`isBeta === true`):
     - No debe agregarse como stream principal ni como backup a la Pool HLS unificada.
     - Debe insertarse como una fuente independiente con `type: "hls"` e `isBeta: true`.
4. **Verificación y Pruebas Automatizadas:**
   - Probar que un servidor HLS beta no se agrega a la Pool HLS.
   - Probar que la Pool HLS conserva únicamente servidores estables.
   - Probar que el servidor HLS beta aparece como opción seleccionable individual con su etiqueta beta.
   - Pasar `npx tsc --noEmit` sin errores.
