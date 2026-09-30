# Plan 063: Plan de Implementación de Disponibilidad de Catálogo para MegaEmbed (mgeb.top)

## Arquitectura y Flujo de Trabajo

```mermaid
flowchart TD
    AdminOrUser([Petición de Catálogo o Admin Test]) --> TargetUrl["URL de catálogo: mgeb.top/api/movie o api/series"]
    TargetUrl --> FetchCatalog["fetchWithTimeout(url, 15000)"]
    FetchCatalog --> DetectJson["Detectar Array JSON plano de IDs"]
    
    DetectJson -->|Películas: [171587, 693134...]| MovieSet["Set de Películas (Set<string>)"]
    DetectJson -->|Series: [61585, 100088...]| TvMap["Map de Series con comodín '*'"]
    
    MovieSet --> CheckMovie["set.has(tmdbId)"]
    TvMap --> CheckTv["map.has(tmdbId) -> Comodín '*' acepta cualquier S/E"]
    
    CheckMovie --> AvailResult["Resultado: true (Disponible) / false (No en catálogo)"]
    CheckTv --> AvailResult
```

## Fases de Implementación

### Fase 1: Actualizar `getRedeflixTvMap` en `lib/redeflix-availability.ts`
1. Soportar elementos que sean strings o números planos (`typeof item === "number" || typeof item === "string"`).
2. Insertar en `tvMap` con comodín `{ "*": { "*": "1" } }`.

### Fase 2: Actualizar `isRedeflixAvailable` para Comodín de Series
1. Al verificar temporada y episodio en series, si `series["*"]` existe, dar por disponible inmediatamente el episodio.

### Fase 3: Actualizar Proveedor en Base de Datos Supabase y `supabase/seed.sql`
1. Configurar `movie_list_url = 'https://mgeb.top/api/movie'` y `tv_list_url = 'https://mgeb.top/api/series'` en Supabase para `id = 'megaembed'`.
2. Actualizar `needs_tmdb = true` para que las búsquedas traduzcan identificadores IMDb a TMDB.
3. Actualizar `supabase/seed.sql` con estos mismos valores.

### Fase 4: Pruebas y Validación
1. Crear `scripts/test-mgeb-availability.mjs`.
2. Validar películas existentes (`693134` / `tt15239678`).
3. Validar series existentes (`100088` / `tt3581920`).
4. Validar IDs inexistentes (`999999999` / `tt999999999`).
5. Ejecutar `npm run build`.
