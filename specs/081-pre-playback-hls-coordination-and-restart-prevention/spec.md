# Spec 081: Coordinación Pre-Reproducción de Servidores HLS y Prevención de Reinicio de Streaming

## 1. Problema y Diagnóstico
Al entrar a una película o episodio (especialmente en portugués `pt`), ocurría lo siguiente:
1. `/api/resolve` responde rápidamente con la lista de servidores base (iframes como S11, S12 y candidatos a extracción client-side como S14 MegaEmbed y S18 WatchPlay).
2. La interfaz llamaba inmediatamente a `setLoading(false)`.
3. El reproductor montaba el servidor disponible en ese momento (ej: un iframe S11 o stream preliminar) y **comenzaba a reproducir el contenido**.
4. En segundo plano, las extracciones client-side de MegaEmbed y WatchPlay tardaban entre 1 y 2.5 segundos en resolver sus streams HLS nativos y servidores enlazados.
5. Al terminar estas extracciones secundarias, se actualizaba `sources` y `recommendedSourceId`, lo cual cambiaba la fuente activa (`activeSource`) en pleno streaming y **desmontaba el reproductor, reiniciando la reproducción desde el segundo 0**.

## 2. Objetivos y Criterios de Aceptación
1. **Fase de Coordinación Pre-Reproducción (Grace Period):**
   - Durante la carga inicial (`loadSources`), si existen servidores candidatos a extracción HLS relevantes para el idioma del usuario (ej: MegaEmbed S14 y WatchPlay S18 para `pt`; NasriPlay S17 para `es`):
   - El sistema debe coordinar dichas extracciones en paralelo con un tiempo máximo de espera prudente (2.5 segundos).
   - Consolidar todos los servidores y enlaces extraídos en la Pool HLS correspondiente (con sus `backupUrls` y mapeo `urlServerMap`) **ANTES** de concluir el estado `loading`.
2. **Posición 0 Garantizada desde el Primer Frame:**
   - La lista de servidores se entrega ordenada con la Pool HLS ya unificada en la posición 0 (`sources[0]`), de modo que el reproductor comience directamente en el stream HLS definitivo sin alternar entre servidores.
3. **Bloqueo de Reinicio de Reproducción (Playback Lock):**
   - Si por cualquier motivo un servidor o mirror secundario responde de forma tardía mientras el usuario ya está reproduciendo activamente el contenido:
   - Está terminantemente prohibido interrumpir o reiniciar el streaming activo.
   - La información del nuevo servidor solo actualizará la lista de respaldos o el selector visual sin forzar un cambio de `activeSource`.
4. **Respeto al Idioma del Usuario:**
   - Si no se encuentra ningún stream HLS para el idioma del usuario (o expira el tiempo límite), se procede a reproducir el primer servidor compatible (ej: S11 en portugués) sin bloqueos indefinidos.
