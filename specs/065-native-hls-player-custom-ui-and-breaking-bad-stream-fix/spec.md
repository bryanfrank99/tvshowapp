# Spec 065: Reproductor Nativo HLS con UI Personalizada y Fallback de Streams para MegaEmbed (Breaking Bad)

## 1. Contexto y Problemas Reportados por el Usuario

El usuario solicita dos mejoras críticas:
1. **Diseño de la Interfaz del Reproductor Web Nativo (HLS):**
   - El usuario compartió una imagen de referencia (`media_1790736976980.jpg`) con un diseño moderno, minimalista y oscuro:
     - Botón central grande de Play translúcido.
     - Barra de controles inferior flotante con:
       - Botón Play/Pausa a la izquierda.
       - Contador de tiempo exacto tabular (`25:37 / 52:00`).
       - Barra de progreso azul (`#008CFF`) con buffer gris y scrubbing interactivo (click y arrastre).
       - Iconos a la derecha: Ajustes (engranaje), Picture-in-Picture (PiP), Pantalla completa (expandir), y Control de volumen con altavoz.
2. **Error de Reproducción en Breaking Bad T1 E1:**
   - Al intentar reproducir Breaking Bad Temporada 1, Episodio 1, el extractor de MegaEmbed seleccionaba automáticamente la primera opción (`Opção 1`), la cual devuelve un error **HTTP 520** desde su CDN de origen (`cdn1.playercdn.xyz`).
   - Sin embargo, MegaEmbed incluye múltiples opciones en su código fuente (`Opção 1`, `Opção 2`, `Opção 3`, `Opção 4`). La opción 4 funciona al 100% con **HTTP 200 OK** y manifiesto HLS válido.
   - El sistema actual carecía de validación previa de streams y de conmutación automática por error (failover) a fuentes HLS secundarias en el reproductor nativo.

---

## 2. Requerimientos del Sistema

### R1. Detección Inteligente y Conmutación de Streams en `lib/megaembed.ts`
- Al extraer las fuentes desde el HTML de MegaEmbed:
  - Extraer todos los streams HLS disponibles (`type === "hls"` o terminados en `.m3u8`).
  - Probar de forma asíncrona rápida (HEAD con timeout de 1.5s) las fuentes candidatas si hay múltiples opciones.
  - Seleccionar como `hlsUrl` principal la primera fuente que responda con código 200/éxito.
  - Retornar todas las URLs HLS adicionales en `backupHlsUrls: string[]` dentro de `MegaEmbedStreamResult`.

### R2. Resiliencia y Failover en `NativeSourcePlayer`
- En [`components/player/NativeSourcePlayer.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/player/NativeSourcePlayer.tsx):
  - Recibir lista de fuentes alternativas (`backupUrls?: string[]`).
  - Si `Hls.Events.ERROR` reporta un error de red fatal (`data.details === "manifestLoadError"` o similar) o el elemento `<video>` falla:
    - Antes de rendirse y mostrar pantalla de error, intentar reproducir automáticamente la siguiente URL de respaldo disponible.
    - Notificar mediante un aviso sutil flotante (OSD): `"Cambiando a stream alternativo..."`.

### R3. Interfaz de Usuario Personalizada Fiel a la Imagen de Referencia
- Implementar en [`components/player/NativeSourcePlayer.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/player/NativeSourcePlayer.tsx):
  1. **Botón Central de Play/Pausa:**
     - Círculo translúcido (`w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 transform active:scale-95`).
     - Triángulo de play blanco nítido centrado. Se oculta cuando el video se está reproduciendo y el ratón no está activo.
  2. **Barra de Controles Inferior:**
     - Botón Play/Pausa con iconos SVG nítidos.
     - Indicador de tiempo actual y duración total con fuente monospace/tabular (`00:00 / 00:00`).
     - Barra de progreso scrubbable interactiva:
       - Pista de fondo gris oscura (`bg-white/20`).
       - Barra de buffer gris intermedia (`bg-white/40`).
       - Barra de reproducción azul TVShow (`bg-[#008CFF]`).
       - Puntero / cabezal blanco circular al hacer hover o arrastrar.
       - Click en cualquier punto para saltar de inmediato.
  3. **Controles del Extremo Derecho:**
     - **Ajustes (Engranaje):** Menú desplegable para velocidad de reproducción (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x).
     - **Picture-in-Picture (PiP):** Activa `video.requestPictureInPicture()`.
     - **Pantalla Completa:** Alterna pantalla completa en el contenedor del reproductor.
     - **Volumen / Silenciar:** Altavoz con indicador de nivel y barra deslizadora horizontal de volumen en hover/foco.
  4. **Comportamiento OSD Auto-Hide:**
     - Ocultación automática tras 3.5 segundos de inactividad mientras se reproduce.
     - Ocultación del cursor del ratón (`cursor-none`) durante la reproducción cuando los controles no están visibles.

### R4. Compatibilidad con Mando de TV y Atajos de Teclado
- Mantener navegación por mando de Android TV (D-Pad Center/Enter, Izquierda/Derecha para seek, Arriba/Abajo para volumen).
- Tecla `Espacio` / `K` para Play/Pausa, `F` para pantalla completa, `M` para silenciar, `P` para PiP.

### R5. Verificación y Validación
- Probar la extracción y reproducción de Breaking Bad S1E1 (`id: 1396`, `season: 1`, `episode: 1`), verificando que se selecciona el stream HLS funcional (Opción 4) y responde con HTTP 200.
- Validar `npm run build` sin errores.
