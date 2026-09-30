# Plan de Implementación: Spec 065 - UI del Reproductor Nativo HLS y Fix de Streams Breaking Bad

## Arquitectura de Componentes

```
+----------------------------------------------------------------------------+
|                          NativeSourcePlayer.tsx                            |
|                                                                            |
|  [Capas de renderizado]:                                                   |
|  1. <video> con Hls.js o reproducción nativa HLS                           |
|  2. Botón central Play translúcido (Circle w-20 h-20)                      |
|  3. Barra inferior interactiva:                                            |
|     [ ▶ ] [ 25:37 / 52:00 ] ===[ Barra Progreso Azul ]=== [ ⚙ ] [ ⧉ ] [ ⛶ ] [ 🔊 ] |
|  4. Failover de streams: si stream 1 falla con 520, conmuta a stream 2/3/4 |
+-------------------------------------+--------------------------------------+
                                      ^
                                      | Entrega streamResult.hlsUrl y backupUrls
+-------------------------------------+--------------------------------------+
|                           lib/megaembed.ts                                 |
|  - Extrae todas las opciones (sources: allSources)                         |
|  - Procesa candidatos HLS                                                  |
|  - Retorna el primer stream funcional verificado (evitando HTTP 520)       |
+----------------------------------------------------------------------------+
```

## Fases de Implementación

### Fase 1: Actualización de `lib/megaembed.ts`
- Modificar `fetchMegaEmbedStream`:
  - Recopilar todos los URLs HLS (`sources.filter(s => s.type === "hls" || s.file.includes(".m3u8"))`).
  - Si hay más de un stream HLS, validar rápidamente mediante `fetch(url, { method: "HEAD", signal: AbortSignal.timeout(1500) })`.
  - Escoger el primer stream que responda con HTTP 200 (como la Opção 4 en Breaking Bad S1E1).
  - Incluir `backupHlsUrls: string[]` en el objeto devuelto.

### Fase 2: Pasaje de Backup URLs en `app/watch/page.tsx`
- En `app/watch/page.tsx`, al construir `nativeSource`:
  - Pasar `backupUrls: streamResult.backupHlsUrls || []`.

### Fase 3: Rediseño Completo de `NativeSourcePlayer.tsx`
- Implementar la UI idéntica a la imagen de referencia:
  - Botón central translúcido con triángulo blanco.
  - Barra de controles inferior con:
    - Botón de Play/Pausa SVG.
    - Contador de tiempo `formatTime(currentTime) / formatTime(duration)`.
    - Barra de progreso scrubbable con arrastre y tooltip de tiempo.
    - Botón Ajustes (selector de velocidad).
    - Botón Picture-in-Picture.
    - Botón Pantalla Completa.
    - Botón Volumen con slider deslizante.
  - Lógica de failover automático a `backupUrls`.
  - Preservar compatibilidad con teclado y control remoto de TV.

### Fase 4: Pruebas y Validación SDD
- Script de prueba `scripts/test-breaking-bad-stream.mjs`.
- Comprobación de compilación `npm run build`.
