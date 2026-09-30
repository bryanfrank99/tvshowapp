# Spec 066: Navegación Optimizada para TV (Foco en Pantalla Completa) y Botón Único de Play/Pausa

## 1. Problema
1. **Foco inicial en TV deficiente**: En dispositivos Smart TV / Android TV / PC con mando, cuando carga una película o serie, el usuario espera entrar a pantalla completa de inmediato con una sola pulsación del botón `OK` / `Enter` del mando a distancia. Actualmente, el foco no se posiciona automáticamente en el botón de pantalla completa.
2. **Duplicidad de controles Play/Pausa**: En la interfaz del reproductor nativo se muestran simultáneamente dos botones de Play/Pausa (uno en el centro de la pantalla y otro en la barra inferior de controles), lo cual genera confusión visual, sobrecarga la UI y no se apega a la experiencia limpia de Netflix en TV.
3. **Navegación espacial D-Pad inconsistente**: Al navegar con las flechas del control remoto dentro del reproductor, el selector visual necesita una secuencia de navegación espacial intuitiva (Scrubber ↔ Botones de Acción ↔ Pantalla Completa), con anillos de enfoque (`focus:ring`) de alto contraste y retroalimentación inmediata.

## 2. Requerimientos
1. **Foco Automático en Pantalla Completa por Defecto**:
   - Una vez cargada la metadata del video o al iniciar la reproducción, el foco del navegador/mando debe situarse automáticamente sobre el botón de **Pantalla Completa** (`fullscreenBtnRef.current?.focus()`).
   - El usuario podrá presionar `OK` / `Enter` en su mando para maximizar la pantalla al instante.
2. **Eliminación del Botón Duplicado de Play/Pausa**:
   - Eliminar el botón redundante de Play/Pausa en el centro de la pantalla mientras la barra de controles está visible.
   - Mantener un **único botón de Play/Pausa interactivo** en la barra inferior de controles, alineado con los botones de retroceso/avance de 10s y volumen.
   - En el centro de la pantalla, solo mostrar una pulsación animada no interactiva (icono de Play/Pausa sutil que se desvanece) cuando cambie el estado de reproducción, sin superponer un botón estático que compita con la barra inferior.
3. **Navegación D-Pad Fluida y Completa**:
   - Secuencia ordenada de tabulación con D-Pad:
     `[Scrubber / Barra de Progreso] ↕ [Play/Pausa] ↔ [Retroceder 10s] ↔ [Avanzar 10s] ↔ [Volumen] ↔ [Subtítulos] ↔ [Velocidad] ↔ [PiP] ↔ [Pantalla Completa]`.
   - Si los controles están ocultos y el usuario presiona cualquier tecla direccional (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`), los controles deben reaparecer de inmediato.
   - `ArrowLeft` / `ArrowRight` cuando los controles están ocultos realiza salto de -10s / +10s con feedback visual.
   - Indicador de foco de alto contraste para TV: `focus:ring-2 focus:ring-white focus:scale-110 shadow-lg`.
4. **Simulación de Interacciones**:
   - Validar programáticamente mediante suite de pruebas simuladas todas las interacciones del reproductor:
     - Foco automático en botón de pantalla completa tras carga.
     - Pulsación de Enter sobre botón de pantalla completa.
     - Navegación bidireccional D-Pad entre todos los controles.
     - Unicidad del botón Play/Pausa (solo 1 elemento interactivo con título/rol de play/pausa).

## 3. Criterios de Aceptación
- Existe un único botón interactivo de Play/Pausa en el DOM.
- Al cargar el video, el foco del DOM (`document.activeElement`) se posiciona en el botón de Pantalla Completa.
- El usuario puede alternar pantalla completa presionando `Enter` sin tocar el mouse.
- El proyecto compila sin errores de TypeScript (`npm run build`).
- Todas las interacciones pasan la suite de pruebas simuladas.
