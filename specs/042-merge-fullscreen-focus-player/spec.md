# Specification: Fusión de "Enfocar Reproductor" en "Pantalla Completa" en Reproductor de Películas y Series

## 1. Problem Statement
En la página de reproducción de películas y series (`/watch`), existían dos botones con funciones solapadas en la barra de acciones:
1. `btn-fullscreen` ("Pantalla completa"): Activaba únicamente la API `requestFullscreen()` del elemento contenedor.
2. `btn-focus-player` ("Enfocar Reproductor"): Ofrecía un sistema mucho más avanzado y completo que integraba:
   - Activación de pantalla completa nativa (`enterFullscreen`).
   - Transferencia y captura obligatoria de foco hacia el iframe para permitir el control mediante D-pad y flechas del mando a distancia.
   - Activación del modo atrapado (`__TV_PLAYER_LOCKED__ = true` y sincronización con `AndroidPlayerBridge.setPlayerLocked(true)`).
   - Visualización de la guía flotante HUD temporal de 10 segundos ("🎮 Modo Reproductor activo - Pulsa ATRÁS para salir").
   - Captura global de la tecla ATRÁS / ESC para desenfocar y salir ordenadamente restaurando el foco a la app.

Tener ambos botones causaba confusión en los usuarios. "Pantalla completa" es el término estándar y comprensible para el público general, pero la lógica de "Enfocar Reproductor" es técnica y funcionalmente superior.

## 2. Requirements & Goals
1. **Fusión Completa**:
   - Trasladar todo el flujo y capacidades del sistema de "Enfocar Reproductor" (`__enterPlayerMode()`, captura de foco, bloqueo de TV, aviso HUD de 10s y pantalla completa) a la acción del botón `btn-fullscreen` ("Pantalla completa").
2. **Eliminación del Botón Redundante**:
   - Eliminar definitivamente el botón `btn-focus-player` ("Enfocar Reproductor") de la interfaz en `app/watch/page.tsx`.
3. **Mantenimiento del Retorno de Foco**:
   - Cuando se pulsa ATRÁS / ESC o se sale de pantalla completa, el foco debe regresar ordenadamente a `btn-fullscreen`.
4. **Pruebas y Verificación**:
   - Crear `scripts/test-merge-fullscreen-focus.mjs` para verificar la fusión, la presencia de `__enterPlayerMode` dentro de `goFullscreen` y la ausencia de `btn-focus-player`.
   - Ejecutar pruebas de regresión y `npm run build` sin errores.
