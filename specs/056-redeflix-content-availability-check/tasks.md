# Tasks 056: Verificación de Disponibilidad de Contenido para RedeFlix

- [x] 1. Crear módulo `lib/redeflix-availability.ts`
  - [x] Implementar `isRedeflixProvider(p)`
  - [x] Implementar descarga y almacenamiento en caché en memoria de `list-movie-ids.txt` (Set O(1))
  - [x] Implementar descarga y almacenamiento en caché en memoria de `list-tv-ids.txt` (Map O(1) con desglose de episodios)
  - [x] Implementar función `isRedeflixAvailable({ type, tmdbId, season, episode })` con timeout y tolerancia a fallos
- [x] 2. Integrar verificación de disponibilidad en resolver (`app/api/resolve/route.ts`)
  - [x] Filtrar proveedor RedeFlix si el contenido no se encuentra en sus listas
  - [x] Conservar identificadores canónicos (`S{ord}`) de los demás servidores
- [x] 3. Integrar verificación de disponibilidad en endpoint de URL de embed (`app/api/embed-url/route.ts`)
  - [x] Retornar 404 si se solicita embed de RedeFlix para un título ausente
- [x] 4. Crear script de pruebas unitarias y de integración `scripts/test-redeflix-availability.mjs`
  - [x] Probar películas presentes vs ausentes
  - [x] Probar series y episodios presentes vs ausentes
  - [x] Probar filtrado en `/api/resolve`
- [x] 5. Ejecutar suite de pruebas completa y verificar `npm run build`
