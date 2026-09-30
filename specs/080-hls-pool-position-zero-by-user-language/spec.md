# Spec 080: Prioridad Absoluta en Posición 0 para Pool HLS respetando el Idioma del Usuario

## Contexto y Motivación
El usuario especificó la siguiente regla arquitectónica estricta:
> "si tenemos una pool hls esa es la que tiene que aparecer en la pocicion 0, respetando siempre el lenguaje definido por el usuario, usa sdd"

En el reproductor y en la API del resolver, cuando existe una fuente unificada tipo Pool HLS (`type: "hls"`, `providerName: "HLS"`, con streams directos y backups de servidores nativos como NasriPlay, MegaEmbed, WatchPlay o Cinecalidad):
1. **Posición 0 Garantizada:** Dicha pool HLS debe posicionarse inequívocamente en el índice 0 del listado de servidores (`sources[0]`) y ser la recomendada por defecto (`recommendedSourceId = sources[0].id`).
2. **Respeto Estricto al Idioma del Usuario:**
   - Si el usuario tiene seleccionado Portugués (`pt`) y existe una pool `HLS (PT)`, esta pool HLS ocupa la posición 0.
   - Si el usuario tiene seleccionado Español (`es`) y existe una pool `HLS (ES)`, esta pool HLS ocupa la posición 0.
   - Si el usuario está en Portugués (`pt`) pero NO existe una pool HLS en portugués (únicamente existe pool en español `HLS (ES)`), **se respeta prioritariamente el idioma del usuario**: los servidores en portugués (`S11`, `S12`) se mantienen en las primeras posiciones y la pool HLS en español actúa como fallback secundario, sin usurpar la posición 0.
3. **Actualización Dinámica en Cliente:** Cuando un extractor client-side (ej: MegaEmbed o WatchPlay en `app/watch/page.tsx`) obtiene exitosamente un stream HLS en vivo y genera o actualiza la pool HLS compatible con el idioma activo, la lista debe reordenarse inmediatamente con `sortSourcesByPriority`, situando la pool HLS en la posición 0 y actualizando `recommendedSourceId` si el usuario no ha forzado un servidor manual.

---

## Criterios de Aceptación
1. **Definición de Pool HLS:** Una fuente se clasifica como pool HLS si cumple `type === "hls"` o `providerName === "HLS"` o su ID/nombre real denota stream HLS unificado (`urlServerMap`).
2. **Jerarquía en `sortSourcesByPriority`:**
   - **Nivel 1 (Afinidad Idiomática Absoluta):** Las fuentes compatibles con el idioma del usuario (`scoreSourceForUser > 0`) se ordenan invariablemente antes que fuentes en idiomas ajenos.
   - **Nivel 2 (Pool HLS en Posición 0 para Idioma Compatible):** Entre las fuentes compatibles con el idioma del usuario, cualquier fuente que sea un Pool HLS tiene prioridad absoluta y se sitúa en la posición 0, por delante de cualquier reproductor iframe o servidor individual.
   - **Nivel 3 (Prioridades Administrativas):** Para fuentes del mismo tipo o no-HLS, se respeta la configuración administrativa `rankMap` (`primaryByLang`).
   - **Nivel 4 (Puntuación e Intrínsicos):** Servidores estables (no-beta) superan a beta, seguidos por `getSourceTotalScore`.
   - **Nivel 5 (Desempate `ord`):** Las fuentes con `ord === 0` (como la pool HLS) se preservan con valor `0` (corrigiendo el fallo donde `ord > 0 ? ord : 999` convertía el `0` en `999`).
3. **Consistencia en Extracción Client-Side (`app/watch/page.tsx`):**
   - Al resolverse streams HLS de MegaEmbed o WatchPlay en el navegador, la lista actualizada se reordena con `sortSourcesByPriority(updatedList, lang)`.
   - Si no hay selección manual del usuario (`!userSourceId`), `recommendedSourceId` se sincroniza con `sorted[0].id`.
4. **Verificación y Pruebas:**
   - Pruebas automatizadas validando posición 0 con pool HLS para `pt` y `es`.
   - Pruebas validando que una pool HLS de idioma ajeno nunca usurpa la posición 0 frente a servidores compatibles.
   - `npx tsc --noEmit` sin errores.
