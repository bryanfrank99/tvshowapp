# Specification: Rediseño UI/UX y Dimensionamiento del Reproductor de TV en Vivo

## 1. Problem Statement
El reproductor de canales de televisión en vivo (`/live`) ocupaba el 100% del ancho del viewport sin limitación de altura máxima (`w-full aspect-video`). En pantallas de alta resolución (1080p, 2K, 4K y Android TV), esto provocaba que el iframe alcanzara tamaños desproporcionados (más de 800px-1000px de altura vertical), ocultando los controles, el título y toda la guía de canales debajo del pliegue visual de la pantalla. Además, la interfaz carecía de controles de tamaño (modo teatro / normal / compacto), botón de pantalla completa nativa, visualización de logo y metadatos EPG en la barra superior, botón de recarga de stream ante congelamientos, y un carrusel rápido de zapping para cambiar de canal sin tener que desplazarse por toda la página.

## 2. Requirements & Goals
1. **Dimensionamiento Bounded & Proporcional**:
   - Limitar el contenedor en modo estándar a un ancho y altura confortables (`max-w-4xl xl:max-w-5xl mx-auto`, `max-h-[58vh]` / `max-h-[520px]`).
   - Soportar selector de tamaño:
     - **Normal** (predeterminado): Tamaño balanceado y centrado que permite visualizar el reproductor y la guía simultáneamente.
     - **Teatro / Amplio**: `max-w-6xl` para cuando el usuario desea una visualización más amplia en pantalla grande.
     - **Compacto**: `max-w-2xl` para pantallas pequeñas o visualización secundaria mientras se navega.
2. **Barra Superior y Metadatos de Canal (Glassmorphism Header)**:
   - Indicador pulsante `● EN VIVO` con estilo glow.
   - Logo del canal (o icono fallback).
   - Nombre del canal, categoría y programa actual (EPG / `now`) en tiempo real.
3. **Barra de Herramientas y Acciones Rápidas**:
   - Botón **Anterior (◀)** y **Siguiente (▶)** con indicador de canal y soporte D-Pad / mando a distancia.
   - Botón **Recargar Stream (🔄)** para reiniciar el iframe si la transmisión se detiene.
   - Selector o Toggle de **Tamaño (Normal / Teatro)**.
   - Botón de **Pantalla Completa (⛶)** que activa `requestFullscreen` nativo en el contenedor.
   - Botón **Cerrar (✕)** claramente distinguible.
4. **Carrusel de Zapping Rápido (Quick Channel Rail)**:
   - Barra horizontal situada inmediatamente debajo del reproductor que muestra miniaturas de los canales de la misma categoría o lista general.
   - Permite zappear a cualquier canal con un solo clic o navegación con flechas sin perder de vista el reproductor.
5. **Navegación TV & Accesibilidad**:
   - Mantener accesibilidad de mando a distancia (`GoBack`, `Escape`, `Enter`).
   - Auto-scroll suave para enfocar el reproductor cuando un canal es seleccionado.
