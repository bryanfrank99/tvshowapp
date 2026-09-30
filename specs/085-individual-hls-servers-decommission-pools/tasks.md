# Tasks - Spec 085: Desmantelamiento de Pool HLS y Adopción de Servidores Individuales

- [x] 1. Adaptación de API Resolver (`app/api/resolve/route.ts`)
  - [x] 1.1 Nombrar fuentes HLS extraídas con el prefijo unificado `HLS - S{ord}` (ej. `HLS - S14`, `HLS - S18`, `HLS - S17`, `HLS - S19`).
  - [x] 1.2 Asignar IDs claros como `${prov.id}-hls` (o `${prov.id}`) y conservar su número `ord` original (14, 18, 17, 19).
  - [x] 1.3 Eliminar el bloque de consolidación de pools virtuales (`hlsPoolSources`, `consolidatedHls`, `ord = 0`, `providerName = "HLS"`).
  - [x] 1.4 Mantener los `backupUrls` estrictamente limitados a los mirrors internos del propio proveedor.

- [x] 2. Adaptación de Extracción y Fusión Asíncrona en Cliente (`app/watch/page.tsx`)
  - [x] 2.1 Reemplazar `mergeExtractedStreams` para actualizar directamente cada proveedor por su propia fuente `HLS - S{ord}`, sin buscar ni crear pools agrupadas.
  - [x] 2.2 Eliminar la lógica residual de `existingPtPool` en `onSelectSource`, permitiendo que el selector manual actualice únicamente la fuente seleccionada.
  - [x] 2.3 Asegurar que la llegada tardía de un stream HLS actualice su tarjeta en `sources` sin causar parpadeo ni reinicio de otra fuente activa.

- [x] 3. Refinamiento de UI en Selector y Reproductor
  - [x] 3.1 En `SourceSelectorGrid.tsx`, asegurar que cada servidor muestre su `#${x.ord}` y su `providerName` completo (`HLS - S14`, `HLS - S18`, etc.).
  - [x] 3.2 En `NativeSourcePlayer.tsx`, mostrar directamente el `source.providerName` en el encabezado.

- [x] 4. Verificación y Pruebas Automatizadas
  - [x] 4.1 Crear script de verificación `scripts/test-spec-085.mjs` que valide:
    - Retorno de fuentes individuales `HLS - S14` y `HLS - S18` con sus respectivos `ord`.
    - Ausencia de tarjeta virtual con `ord: 0` o `providerName: "HLS"`.
    - Ordenamiento prioritario por afinidad de idioma y orden numérico natural.
    - Simulación de conmutación limpia de fallback de `HLS - S14` a `HLS - S18`.
  - [x] 4.2 Ejecutar `npx tsc --noEmit` para verificar tipado.
  - [x] 4.3 Ejecutar el script y comprobar que todas las aserciones pasan.

- [x] 5. Commit y Push a Git
  - [x] 5.1 Realizar commit estructurado y push a la rama principal.
