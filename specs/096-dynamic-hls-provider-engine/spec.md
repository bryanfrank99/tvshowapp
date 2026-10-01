# Especificación 096: Motor Dinámico de Servidores HLS y Configuración JSON Editable en Admin

## 1. Contexto y Objetivos
El ecosistema de proveedores de streaming sufrió numerosas modificaciones acumuladas. Actualmente existen servidores embed heredados (`embos`, `moviesapi`, `cinesrc`, etc.) que no ofrecen experiencia nativa en Android TV, y los extractores de streams HLS directos (`cinecalidad`, `nasriplay`, `playerflix`, `megaembed`, `watchplay`) están dispersos en archivos de código TypeScript en el servidor, lo que obliga a realizar cambios manuales en código y redespliegues cada vez que un dominio, header o endpoint cambia.

El objetivo de esta especificación es:
1. **Política Estricta HLS:** El reproductor priorizará exclusivamente streams directos HLS nativos (`.m3u8`), desactivando los servidores que únicamente funcionan mediante iframes embed invasivos. Se proveerá un switch global en el panel de administración para habilitar/deshabilitar un modo de emergencia con embeds si no hubiese ningún stream disponible.
2. **Motor de Extracción Dinámico (`lib/hls-engine.ts`):** Unificar y desacoplar la lógica de extracción de streams HLS en un motor flexible gobernado por configuraciones JSON declarativas por servidor (`extractor_config`).
3. **Persistencia Dual en Supabase:** Almacenar `extractor_config` en la base de datos (clave `provider_extractor_configs` en la tabla `config` y columna `extractor_config` en `providers`), permitiendo modificar cualquier parámetro al vuelo desde `/admin` sin tocar código.
4. **Editor JSON y Prueba en Vivo en `/admin`:** Integrar en el formulario de edición de proveedores un editor de configuración con plantillas predefinidas (*presets*), validación de sintaxis y un botón **"▶ Probar Extractor en Vivo"** para testear la extracción con cualquier ID TMDB de película o serie en tiempo real.

---

## 2. Requisitos y Criterios de Aceptación

### A. Depuración de Proveedores en DB
- Proveedores HLS que se mantienen activos con presets dedicados:
  - **S14:** MegaEmbed HLS (Portugués)
  - **S17:** NasriPlay HLS (Latino con multi-mirror auto-failover)
  - **S18:** WatchPlay HLS (Portugués)
  - **S19:** Cinecalidad HLS (Latino con auto-failover)
  - **S20:** PlayerFlix HLS (Portugués / Inglés)
- Proveedores que solo ofrecen embed iframe (`embos`, `moviesapi`, `cinesrc`, `streambetter`, `embedmovies`, `redeflix` embed) se marcarán como `active: false`.

### B. Configuración del Extractor JSON (`ExtractorConfig`)
Cada proveedor almacenará un objeto JSON con la siguiente estructura:
```typescript
export interface ExtractorConfig {
  preset: "vimeos_json" | "nasriplay_token" | "playerflix" | "megaembed" | "watchplay" | "direct_m3u8" | "custom_api";
  request?: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
  };
  mapping?: {
    hls_regex?: string;
    json_path?: string;
    backup_paths?: string[];
  };
  options?: {
    timeout_ms?: number;
  };
}
```

### C. Herramienta de Prueba en Vivo (Test Extractor Endpoint)
- Nuevo endpoint administrativo `POST /api/admin/providers/test-extractor`:
  - Recibe `{ providerId, movie_tpl, tv_tpl, extractor_config, tmdbId, type, season, episode }`.
  - Ejecuta la extracción mediante `lib/hls-engine.ts`.
  - Retorna `success`, `hlsUrl`, `backupUrls`, `durationMs`, y `error` detallado.

### D. Panel de Administración `/admin`
- Selector de preset de extractor en 1 click para poblar la plantilla JSON.
- Editor de JSON con verificación de formato y formateo automático.
- Botón "▶ Probar Extractor" con feedback visual de URLs obtenidas y velocidad de respuesta.
- Interruptor global: *"Solo Servidores HLS (Recomendado)"* vs *"Permitir Embeds de Respaldo"*.
- Remoción de campos confusos u obsoletos de comprobación de catálogo por TXT.

### E. Integración con el Reproductor (`app/api/resolve/route.ts`)
- Filtra servidores no HLS si el modo de emergencia está desactivado.
- Utiliza `runHlsExtractor` de `lib/hls-engine.ts` pasando la configuración dinámica del proveedor.
