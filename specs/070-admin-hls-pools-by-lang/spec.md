# Spec 070: Administración de Pools HLS por Idioma, Detección de Compatibilidad y Aislamiento de Audio

## 1. Problema y Objetivos
1. **Detección de Compatibilidad HLS Dinámica:**
   - Actualmente, el soporte HLS de servidores estaba hardcodeado por IDs (`megaembed`, `watchplay`).
   - El panel de administración debe permitir configurar explícitamente si un proveedor es compatible con HLS, qué extractor utiliza o si es un stream directo `.m3u8`.
2. **Aislamiento Estricto de Idiomas en Failover HLS:**
   - **Regla crítica:** No se pueden mezclar streams HLS de diferentes idiomas de audio en el mismo pool de conmutación (por ejemplo, nunca conmutar de un stream en Español a uno en Portugués).
   - Cada idioma de audio debe tener su propio **Pool HLS independiente** con su lista de respaldos (`backupUrls`) del mismo idioma.
3. **Reestructuración de la Interfaz de Administración (`app/admin/page.tsx`):**
   - Configuración de tipo de entrega por servidor: `Iframe` vs `HLS Nativo (Extractor / Directo)`.
   - Panel visual de Pools HLS segmentados por idioma (Español, Portugués, Inglés).
   - Badges informativos en la lista de proveedores (`⚡ HLS · ES`, `⚡ HLS · PT`).

## 2. Especificación de Datos
### A. Configuración de Proveedor
Campo `hls_mode` o en `config.key = "provider_hls_config"`:
```ts
interface ProviderHlsConfig {
  enabled: boolean;
  extractor: "megaembed" | "watchplay" | "direct" | "none";
}
```
### B. Segmentación de Pools HLS en Resolver (`app/api/resolve/route.ts`)
```ts
// Para cada idioma de audio presente en fuentes HLS:
// Se agrupan exclusivamente fuentes con afinidad del mismo idioma principal.
// Ejemplo:
// Pool 'es': [S14 MegaEmbed ES (primario), Backup ES]
// Pool 'pt': [S18 WatchPlay PT (primario), Backup PT]
```

## 3. Criterios de Aceptación
1. Si un usuario reproduce en español, el failover HLS solo conmuta a streams en español.
2. Si un usuario reproduce en portugués, el failover HLS solo conmuta a streams en portugués.
3. En la administración se puede activar/desactivar HLS por proveedor y seleccionar el extractor correspondiente.
4. La administración muestra los servidores ordenados por pool de idioma con advertencias claras de no mezcla.
