# Plan 066: Navegación Optimizada para TV y Botón Único de Play/Pausa

## 1. Arquitectura de Cambios

### A. Componente `NativeSourcePlayer.tsx`
1. **Unicidad de Play/Pausa**:
   - Retirar el botón duplicado de Play/Pausa del centro de la pantalla.
   - Mantener el botón central de Play/Pausa únicamente como una animación transitoria de feedback cuando el usuario conmuta la reproducción (icono que hace fade-out automático), o retirarlo en favor de la barra inferior limpia.
   - En la barra inferior, mantener el botón de Play/Pausa con `id="btn-play-pause"` y `aria-label="Reproducir/Pausar"`.
2. **Foco Automático en Pantalla Completa**:
   - Crear `fullscreenBtnRef = useRef<HTMLButtonElement>(null)`.
   - Asignar `id="btn-fullscreen-native"`.
   - En el evento `onLoadedMetadata` y tras iniciar el video, ejecutar:
     ```ts
     setTimeout(() => {
       fullscreenBtnRef.current?.focus();
     }, 300);
     ```
   - Asegurar que el botón tenga un anillo de enfoque nítido de 10-foot UI:
     `focus:ring-2 focus:ring-white focus:outline-none focus:scale-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(255,255,255,0.7)]`
3. **Navegación Espacial D-Pad**:
   - Ajustar el orden de tabulación (`tabIndex={0}`) en:
     1. Barra de progreso / Scrubber (`#btn-scrubber`)
     2. Play / Pausa (`#btn-play-pause`)
     3. Retroceder 10s (`#btn-rewind-10`)
     4. Avanzar 10s (`#btn-forward-10`)
     5. Silenciar / Volumen (`#btn-volume`)
     6. Subtítulos (`#btn-subtitles`)
     7. Velocidad (`#btn-speed`)
     8. PiP (`#btn-pip`)
     9. Pantalla Completa (`#btn-fullscreen-native`)
   - Manejo de teclas:
     - Si los controles están ocultos y se presiona cualquier tecla D-Pad, despertar los controles y enfocar el botón de pantalla completa (o el último enfocado).
     - Si los controles están visibles, `ArrowLeft` / `ArrowRight` navega fluidamente o ajusta el tiempo si el foco está en el scrubber.

### B. Suite de Pruebas Simuladas `scripts/test-player-tv-navigation.mjs`
1. Validar que en el marcado JSX solo existe 1 botón interactivo de Play/Pausa.
2. Validar que el botón de pantalla completa tiene la referencia, id y clase de foco para TV.
3. Simular ciclo de carga y foco inicial automático.
4. Simular navegación secuencial D-Pad.
5. Validar compilación limpia con `npm run build`.
