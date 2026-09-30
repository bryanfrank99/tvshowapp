# Spec 079: Afinidad Idiomática Estricta en el Sistema de Servidores Recomendados

## 1. Diagnóstico del Problema (Root Cause)
Al navegar con idioma Portugués (`pt`), los servidores en español (`HLS (ES)`, `S17 NasriPlay`, `S19 Cinecalidad`) aparecían por delante de los servidores en portugués (`S11 EmbedMovies`, `S12 RedeFlix`).

### Causa Raíz en `lib/sources.ts`:
En la función `sortSourcesByPriority`:
```ts
const scoreA = a.priority !== undefined ? a.priority : scoreSourceForUser(a, userLang);
const scoreB = b.priority !== undefined ? b.priority : scoreSourceForUser(b, userLang);
```
1. Servidores en español como `S17 NasriPlay` y `S19 Cinecalidad` tienen prioridades fijadas en el resolver (`priority: 95`, `priority: 90`), y `HLS (ES)` tiene `priority: 120`.
2. Servidores en portugués adaptados desde proveedores regulares usan la escala de `scoreSourceForUser` (donde un idioma nativo da `10` puntos).
3. La condición ternaria evaluaba `a.priority !== undefined`, haciendo que los valores `95` y `90` del servidor en español anularan completamente la afinidad idiomática (`95 > 10`).
4. Si el pool `HLS (PT)` no estaba disponible para un contenido puntual, los servidores en español ocupaban las posiciones `#0`, `#1` y `#2`, desplazando a los servidores en portugués al final de la lista.

## 2. Solución Arquitectónica SDD
1. **Afinidad de Idioma como Filtro Primario**:
   - Para un usuario en `pt`, cualquier servidor con audio en `pt` (o multi-idioma compatible) SIEMPRE tiene prioridad estricta sobre servidores de otros idiomas (`es`, `en`).
   - Los servidores de otros idiomas solo deben aparecer como fallback secundario al final de la lista.
2. **Cálculo de Puntuación Integrada (`getSourceTotalScore`)**:
   - `langWeight`: `scoreSourceForUser(s, userLang) * 1000` si es compatible, `0` si es incompatible.
   - `intrinsicPriority`: `s.priority !== undefined ? s.priority : 10`.
   - `betaPenalty`: `-500` si `isBeta`.
   - Puntuación total: `langWeight + intrinsicPriority + betaPenalty`.
3. **Aislamiento de Prioridades Administrativas (`rankMap`)**:
   - Las prioridades configuradas por el admin para un idioma específico (ej. `pt: ["hls"]`) solo aplican a servidores lingüísticamente compatibles con ese idioma. Un servidor en español nunca puede usurpar una posición prioritaria en la lista de portugués.
