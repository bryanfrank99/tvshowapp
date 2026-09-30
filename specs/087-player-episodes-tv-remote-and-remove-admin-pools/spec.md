# Spec 087: Eliminación de Botones Antiguos de Episodio, Selector Compacto para Control Remoto de TV y Eliminación Total de Pools en Admin

## Contexto y Motivación
El usuario ha solicitado tres acciones claras:
1. **Eliminar los botones antiguos de navegación de episodios:**
   - En la página de visualización (`app/watch/page.tsx`), existían botones antiguos externos debajo del reproductor: `btn-prev-ep` (← E{e-1}), `btn-next-ep` (Siguiente E{e+1} →) y `btn-all-ep` (Todos los capítulos). Estos botones resultan redundantes y desordenan la interfaz ahora que el reproductor cuenta con su propio selector de episodios estilo Netflix.
2. **Selector de episodios y temporadas más simple, pequeño y 100% manipulable por control remoto de TV:**
   - El componente `EpisodesDrawer.tsx` era demasiado grande (ocupaba casi toda la pantalla con tarjetas de video pesadas de 100px+ cada una y un tag HTML `<select>` nativo que se rompe o es tosco en Android TV).
   - Debe hacerse más compacto, simple y elegante (estilo streaming moderno de alta densidad: 6-8 episodios visibles simultáneamente).
   - Debe soportar navegación fluida con D-Pad de mando de TV (Flechas Arriba/Abajo para episodios, Flechas Izquierda/Derecha para temporadas, Enter/OK para reproducir, Escape/Atrás para cerrar y retornar el foco a los controles del reproductor). Debe aislar los eventos de teclado para no desatar acciones de reproducción secundarias de fondo (como rebobinado o pausa accidental).
3. **Eliminación de Pools en Administración / Servidores:**
   - En la vista de administración (`app/admin/page.tsx`), aún existía un panel completo dedicado a "Pools HLS Unificados con Auto-Failover" por idioma, opciones para agregar el pool virtual `hls` en la lista de prioridades y textos de "Pool HLS" en el modal de proveedores.
   - Habiendo desmantelado las pools en la Spec 085 en favor de servidores HLS individuales independientes (`HLS - S14`, `HLS - S18`, `HLS - S17`, etc.), debe eliminarse todo rastro de las pools en el panel de administración, dejando una gestión limpia y directa por servidor individual.

## Objetivos
1. **Limpieza en `app/watch/page.tsx`:**
   - Eliminar el bloque de navegación de episodios antiguo (`btn-prev-ep`, `btn-next-ep`, `btn-all-ep`).
2. **Rediseño y Optimización TV de `components/player/EpisodesDrawer.tsx`:**
   - Reducir dimensiones: Panel lateral o modal compacto (`max-w-md` a `max-w-lg`) semitransparente con desenfoque de fondo.
   - Pestañas horizontales de temporadas (botones interactivos en lugar de un tag `<select>` HTML), navegables con D-pad izquierda/derecha.
   - Lista de episodios compacta de alta legibilidad con badge de episodio `E{n}`, título, indicador de episodio actual y duración.
   - Navegación D-pad de TV completa:
     - Flechas Arriba / Abajo para moverse entre episodios con scroll automático suave.
     - Foco automático en el episodio activo al abrir.
     - Tecla Escape / Back cierra el panel y devuelve el foco al botón de episodios (`#btn-episodes`).
     - Aislamiento de eventos de teclado (`stopPropagation`) para evitar colisiones con el reproductor.
     - Indicador visual de foco de alto contraste para mando de TV (`focus:ring-2 focus:ring-white focus:bg-white/20`).
3. **Eliminación Total de Pools en `app/admin/page.tsx`:**
   - Eliminar la sección "PANEL DE SUPERVISIÓN Y CONTROL: POOLS HLS UNIFICADOS POR IDIOMA".
   - En `LanguagePriorityManager`, eliminar la entidad virtual `"hls"` (opción del dropdown, bloque especial de renderizado y filtros).
   - En el listado y modal de proveedores, renombrar y limpiar menciones a "Pool HLS" por "Stream HLS Nativo" / "Reproductor Nativo".

## Criterios de Aceptación
1. No existen botones externos `btn-prev-ep`, `btn-next-ep` ni `btn-all-ep` en la página de visualización.
2. El selector de episodios dentro del reproductor es visualmente compacto, elegante y 100% controlable con las 4 flechas de dirección + Enter + Escape de un mando de TV.
3. El panel de administración no muestra referencias a "Pool HLS", permitiendo gestionar exclusivamente servidores individuales y sus prioridades por idioma.
4. `npx tsc --noEmit` compila sin errores.
5. Los tests de regresión pasan exitosamente.
