# Specification: Reordenamiento del Reproductor de TV en Vivo (Barra de Control Abajo)

## 1. Problem Statement & Motivation
En la versión anterior del reproductor de TV en vivo (`/live`), la barra de controles e información del canal (nombre, logo, badge de en vivo, programa actual y botones de zapping/pantalla completa) se ubicaba por encima del video, mientras que por debajo se renderizaba un carrusel horizontal de zapping con todos los canales.
El usuario solicitó explícitamente mediante captura visual:
1. Mover la barra de información y controles (recuadro verde) para que se posicione **debajo** del reproductor de video.
2. Eliminar completamente el riel de botones horizontales de canales inferiores con barra de scroll (recuadro rojo).

## 2. Requirements & Goals
1. **Posición del Video**: El marco del reproductor (iframe) debe ser el primer elemento dentro del contenedor del reproductor, ocupando la parte superior.
2. **Barra de Control e Información Abajo**:
   - Trasladar el bloque con:
     - Logo del canal, nombre, badge `● EN VIVO`, categoría y programa actual (EPG).
     - Botones de acción: **◀ Anterior**, **Siguiente ▶**, **🔄 Recargar**, **🗖/🗗 Modo de Tamaño**, **⛶ Pantalla Completa** y **✕ Cerrar**.
   - Ajustar el estilo visual para que funcione como barra inferior (`border-t border-white/10`, gradiente adecuado).
3. **Eliminación del Riel Inferior**:
   - Remover completamente el elemento `div#live-zapping-rail` y los botones de zapping horizontal redundantes.
4. **Verificación y Pruebas**:
   - Actualizar y ejecutar las pruebas automatizadas en `scripts/test-live-player-ui.mjs` para verificar la nueva disposición DOM (video arriba, controles abajo, ausencia de `live-zapping-rail`).
   - Ejecutar `npm run build` y asegurar cero errores de compilación o linting.
