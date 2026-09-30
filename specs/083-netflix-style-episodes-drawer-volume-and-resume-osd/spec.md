# Spec 083: Interfaz OSD de Reanudación en Esquina, Corrección de Barra de Volumen y Selector de Episodios Estilo Netflix

## 1. Problema y Diagnóstico
1. **Cartel de Reanudación Tosco:**
   - Al cargar un video con progreso guardado, aparecía un recuadro grande en el centro de la pantalla (`absolute inset-0 flex items-center justify-center`).
   - El usuario solicita que sea una notificación translúcida en una esquina que desaparezca rápidamente.
2. **Bola del Deslizador de Volumen Visible cuando está Oculto:**
   - En [`NativeSourcePlayer.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/player/NativeSourcePlayer.tsx#L1048), el input de volumen usa `w-0 group-hover/vol:w-16`. En varios navegadores el "thumb" o bola deslizadora nativa del input `range` sobresale visualmente por falta de contenedor con `overflow-hidden` y control de opacidad estricto.
3. **Selector Rápido de Episodios Estilo Netflix dentro del Reproductor:**
   - Al ver una serie (`type === "tv"`), el usuario debe poder cambiar de temporada y episodio sin salir del reproductor.
   - Se requiere un botón en los controles del reproductor (estilo Netflix: icono de lista + "Episodios") que despliegue un panel translúcido con pestañas/selector de temporadas y cuadrícula/lista de episodios con número, miniatura, título y sinopsis.

---

## 2. Criterios de Aceptación

### A. Notificación Translúcida de Reanudación
- Reemplazar el cartel central por un badge translúcido flotante en la esquina superior izquierda (`top-5 left-5`) o superior derecha.
- Estilo: fondo `bg-black/60 backdrop-blur-md border border-white/10`, texto blanco translúcido `text-white/90`, icono `⏱️`.
- Desvanecimiento rápido: temporizador de 2.2 segundos para desaparecer limpiamente con animación `animate-fade-in`.

### B. Corrección de la Barra de Volumen
- Contenedor con `overflow-hidden transition-all duration-200 w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 focus-within:w-20 flex items-center`.
- El input range debe tener `opacity-0 pointer-events-none group-hover/vol:opacity-100 group-hover/vol:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto`.
- Cuando no se hace hover o foco, la bola del volumen no se dibuja ni sobresale bajo ninguna circunstancia.

### C. Selector de Episodios Estilo Netflix dentro del Reproductor
- Botón en la barra de controles de series (`type === "tv"`): Icono de capas/lista + texto "Episodios" (o "Episódios" en PT).
- Panel / Drawer overlay in-player (`absolute inset-0 bg-black/90 backdrop-blur-xl z-50`):
  - Encabezado con título de la serie y selector de temporadas (píldoras/selector de temporadas: Temporada 1, 2, 3...).
  - Botón de cierre (✕) o tecla `Escape`.
  - Cuadrícula con scroll suave de episodios:
    - Número de episodio (1, 2...).
    - Miniatura de TMDB o Cinemeta (si está disponible) con indicador de duración.
    - Título del episodio.
    - Sinopsis corta.
    - Indicador visual distintivo en el episodio actual que se está reproduciendo ("▶ Reproduciendo").
  - Al pulsar un episodio, conmuta inmediatamente a ese capítulo (`/watch?type=tv&id=...&s=...&e=...`).
- Soporte para navegación TV con control remoto y teclado (teclas de flechas y Enter).
