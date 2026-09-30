# Tasks: Spec 079 - Afinidad Idiomática Estricta en el Sistema de Servidores Recomendados

- [x] **Tarea 1: Refactorizar `sortSourcesByPriority` en `lib/sources.ts`**
  - [x] Implementar función auxiliar `getSourceTotalScore(s: Source, userLang: string): number`.
  - [x] Garantizar que la compatibilidad idiomática (`scoreSourceForUser > 0`) sea el primer criterio de ordenamiento antes de la prioridad intrínseca.
  - [x] Asegurar que `rankMap` excluya servidores incompatibles con el idioma del usuario.
  - [x] Implementar desempate determinista por `ord` persistente.

- [x] **Tarea 2: Validación y Pruebas Unitarias**
  - [x] Probar ordenamiento con `userLang = "pt"` cuando no hay stream HLS PT: verificar que servidores en portugués (`S11`, `S12`) aparezcan de primeros.
  - [x] Probar ordenamiento con `userLang = "pt"` con `HLS (PT)` presente: verificar que `HLS (PT)` sea el recomendado (`#0`) seguido de los servidores PT.
  - [x] Probar ordenamiento con `userLang = "es"`: verificar que servidores en español (`HLS (ES)`, `S17`, `S19`) aparezcan de primeros.
  - [x] Ejecutar `npx tsc --noEmit`.

- [x] **Tarea 3: Commit y Despliegue**
  - [x] Actualizar tareas en `tasks.md`.
  - [x] Realizar commit y push a `origin/main`.
