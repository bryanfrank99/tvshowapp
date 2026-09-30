# Tasks: Spec 087 - Player Episodes TV Remote & Remove Admin Pools

- [x] Task 1: Eliminar botones antiguos de episodios en `app/watch/page.tsx` <!-- id: 1 -->
  - Remover la sección `btn-prev-ep`, `btn-next-ep` y `btn-all-ep`.
  - Verificar que el diseño general de `app/watch/page.tsx` quede limpio y alineado.

- [x] Task 2: Rediseñar `components/player/EpisodesDrawer.tsx` (compacto y 100% control remoto TV) <!-- id: 2 -->
  - Reemplazar el `<select>` HTML por una barra horizontal de píldoras de temporadas navegable con Flecha Izquierda / Flecha Derecha.
  - Diseñar filas compactas y ligeras para episodios (número `E#`, título, duración, badge activo).
  - Implementar navegación D-Pad completa de mando de TV (Arriba/Abajo para episodios, Izquierda/Derecha para temporadas, Enter para reproducir, Escape/Back para cerrar).
  - Asegurar auto-focus del episodio activo al abrir y auto-scroll centrado.
  - Asegurar aislamiento de eventos (`stopPropagation`) para que el reproductor de fondo no reciba pulsaciones de teclado mientras el panel esté abierto.

- [x] Task 3: Eliminar todo lo relacionado con las Pools en `app/admin/page.tsx` <!-- id: 3 -->
  - Eliminar la sección "PANEL DE SUPERVISIÓN Y CONTROL: POOLS HLS UNIFICADOS POR IDIOMA".
  - En `LanguagePriorityManager`, eliminar el caso especial `provId === "hls"` y la opción de agregar pool al dropdown.
  - Actualizar etiquetas y textos en la tabla y modal de edición de proveedores: "Pool HLS" -> "Stream HLS Nativo".

- [x] Task 4: Verificación, compilación y pruebas <!-- id: 4 -->
  - Ejecutar `npx tsc --noEmit`.
  - Crear script de validación `scripts/test-spec-087.mjs` que verifique la ausencia de botones viejos, estructura del drawer y limpieza de pools en admin.
  - Ejecutar script de prueba.

- [x] Task 5: Commit y push con bump de versión <!-- id: 5 -->
