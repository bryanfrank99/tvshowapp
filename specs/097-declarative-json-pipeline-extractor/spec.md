# Especificación 097: Motor de Pipeline Declarativo JSON para Extracción de Streams HLS

## 1. Resumen Ejecutivo
Actualmente, servidores como Cinecalidad o NasriPlay dependen de código TypeScript estático en el servidor (`lib/cinecalidad.ts`, `lib/nasriplay.ts`, etc.).
El objetivo de esta especificación es trasladar **toda la lógica de extracción** (peticiones HTTP secuenciales, inspección de arreglos de embeds, desencriptación de scripts ofuscados con Dean Edwards Packer `eval(p,a,c,k)`, expresiones regulares, selectores JSONPath y mapeo de subtítulos) a una **configuración declarativa de Pipeline en JSON**.
Dicho JSON residirá en la base de datos Supabase (columna `extractor_config` de `providers` y clave `provider_extractor_configs` de `config`), y será editable y testeable en tiempo real desde el panel `/admin` sin necesidad de modificar código ni desplegar nuevas versiones.

---

## 2. Requerimientos del Usuario
1. Toda la lógica del archivo (ejemplo `lib/cinecalidad.ts`) debe residir íntegramente dentro del JSON del proveedor.
2. Posibilidad de agregar, editar, borrar o cambiar cualquier paso del proceso de extracción directamente desde el panel `/admin`.
3. Ejecutar pruebas en vivo ("▶ Probar Extractor en Vivo") mostrando el resultado y la traza de pasos.
4. Soporte para acciones fundamentales:
   - `http_request`: Consultas a APIs o páginas web con cabeceras, métodos, queries y templates de URLs (`{id}`, `{s}`, `{e}`, `{type}`).
   - `find_in_array`: Búsqueda de elementos en listas (ej. encontrar el embed de "vimeos").
   - `unpack_packer`: Desempaquetado de JavaScript ofuscado estándar (`eval(function(p,a,c,k,e,d)...)`).
   - `regex_extract`: Extracción mediante expresiones regulares con grupos de captura.
   - `json_path`: Selección de propiedades anidadas en objetos o arreglos.
   - `extract_subtitles_vimeos`: Extracción automática de pistas de subtítulos.
5. Mantener retrocompatibilidad transparente con servidores directos simples (`direct_m3u8`) y fallback si no se define pipeline.

---

## 3. Arquitectura del Pipeline JSON

### 3.1 Esquema del Objeto de Configuración
```typescript
export interface PipelineStep {
  id: string;
  action: "http_request" | "find_in_array" | "unpack_packer" | "regex_extract" | "json_path" | "extract_subtitles_vimeos" | "map_array";
  url?: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: any;
  response_type?: "json" | "text";
  timeout_ms?: number;
  input?: string; // Expresión o referencia (ej. "{{api_embeds.embeds}}")
  match?: Record<string, any>; // Criterios de filtrado (ej. { "url_contains": "vimeos" })
  select?: string; // Campo a seleccionar tras filtrar
  pattern?: string; // Expresión regular
  group?: number; // Grupo de captura regex (default 0)
  path?: string; // Ruta json (dot notation)
  target_field?: string;
}

export interface PipelineExtractorConfig {
  version: 2;
  mode: "pipeline";
  steps: PipelineStep[];
  output: {
    hlsUrl: string;
    backupHlsUrls?: string | string[];
    subtitles?: string;
    embeds?: string;
  };
}
```

---

## 4. Criterios de Aceptación
1. `lib/hls-engine.ts` debe ejecutar pipelines declarativos completos sin recurrir a `lib/cinecalidad.ts`.
2. Las pruebas unitarias/scripts deben verificar que Cinecalidad extrae el stream directo HLS y sus subtítulos exclusivamente a través de la definición del pipeline JSON.
3. El panel `/admin` debe permitir visualizar y editar el JSON completo del pipeline, validarlo y probarlo en vivo.
4. `npm run build` debe compilar con 0 errores de tipado o empaquetado.
