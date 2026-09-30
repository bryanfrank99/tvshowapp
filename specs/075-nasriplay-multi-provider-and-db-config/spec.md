# Spec 075: Multi-Proveedor de Servidores en NasriPlay (S17) y Configuración en Base de Datos

## 1. Contexto y Análisis Detallado
El usuario indicó:
> "configura correctamente la api ya que hay mas de un proveedor para cada contenido, revisa el json detalladamente:
> https://nsrplay.space/api/v1/embed/sources/movie/1339713?pt=1790780993399.HCIQ2rcmfpsX1u61ptnlBXzS8agqUjVdWZY9FhBSUKc
> https://nsrplay.space/api/v1/embed/sources/tv/113962/1/1?pt=1790780993399.HCIQ2rcmfpsX1u61ptnlBXzS8agqUjVdWZY9FhBSUKc
> tambien creo que es necesario que modifiquies los ajuestes en la db de los proveedores para ajustar correctamente este"

Al inspeccionar detalladamente los JSONs devueltos por `nsrplay.space`:
1. **Película 1339713 (Obsesión):**
   - Servidor 1: `Nsr Play` (`vimeos`, Latino) -> Stream directo `.m3u8` y embed `vimeus.com`.
   - Servidor 2: `streamwish` (`streamwish`, Español Latino) -> Embed directo `streamwish.to/e/...`.
   - Servidor 3: `voesx` (`voesx`, Español Latino) -> Embed directo `voe.sx/e/...`.

2. **Serie 113962 (Operativo: Lioness T1:E1):**
   - Servidor 1: `Nsr Play` (`vimeos`, Latino) -> Stream directo `.m3u8` y embed `vimeus.com`.
   - Servidor 2: `Nsr Play (LAT)` -> Embed directo `streamtape.com/e/...`.
   - Servidor 3: `streamwish` (`streamwish`, Español Latino) -> Embed directo `streamwish.to/e/...`.

Hasta ahora, TVShowApp solo extraía o asociaba una única fuente para S17. Al igual que con Cinecalidad (S19), cuando NasriPlay dispone de múltiples hosts/proveedores para una misma película o episodio, cada uno debe estar disponible para que el usuario pueda alternar libremente entre ellos si un host está saturado o caído.

---

## 2. Requerimientos y Diseño Arquitectónico

### 1. Extractor de Servidores Multi-Proveedor (`lib/nasriplay.ts`)
- Enriquecer `fetchNasriPlayStream` para retornar una lista completa de `embeds`:
  ```ts
  export interface NasriPlayEmbedOption {
    name: string;        // ej. "Nsr Play", "Streamwish", "Voe", "Streamtape"
    server: string;      // ej. "vimeos", "streamwish", "voesx", "streamtape"
    language: string;    // ej. "Latino", "Español Latino", "Subtitulado"
    url: string;         // URL directa de embed (streamwish.to, voe.sx, etc.) o embed general
    isDirectStream?: boolean;
    directUrl?: string;
  }
  ```
- Para cada servidor en `data.servers`:
  - Obtener en paralelo mediante `/api/v1/embed/server-url?token={token}` la URL directa de incrustación (`embedUrl`).
  - Si un servidor falla en resolver token, usar la URL del embed principal `https://nsrplay.space/embed/{movie|tv}/{id}...`.
- Para streams HLS:
  - Mantener la extracción y validación de `primaryHlsUrl` y `backupHlsUrls`.

### 2. Integración en el Resolutor Central (`app/api/resolve/route.ts`)
- Para el pool HLS:
  - Si hay un stream HLS directo validado, agregarlo como `type: "hls"` (con prioridad 120 para el pool español).
- Para los múltiples proveedores de NasriPlay:
  - Mapear cada servidor de la lista de `embeds`:
    - `id`: `nasriplay-iframe` (servidor primario), `nasriplay-iframe-streamwish`, `nasriplay-iframe-voe`, etc.
    - `providerName`: `S17`
    - `realName`: `NasriPlay (Streamwish)`, `NasriPlay (Voe)`, `NasriPlay (Streamtape)`, etc.
    - `ord`: 17
    - `lang`: Detectar según `language` ("lat" | "es" | "en").
    - `type`: "iframe"
    - `priority`: 95 (ligeramente detrás del pool HLS).

### 3. Actualización de Base de Datos Supabase
- **`provider_priorities_by_lang` en tabla `config`:**
  - Agregar `nasriplay` a la lista de prioridades de español:
    `{"es":["hls","cinecalidad","nasriplay"],"pt":["hls","redeflix","embedmovies"],"en":[]}`.
- **Tabla `providers`:**
  - Asegurar `id: "nasriplay"` con `tv_ok: true`, `needs_tmdb: true`, `lang: "es,lat"`, `active: true`, `ord: 17`.
- **`supabase/seed.sql`:**
  - Sincronizar la configuración definitiva.

---

## 3. Plan de Verificación
1. Probar resolución para `movie 1339713`: Verificar que devuelve `HLS (ES)` y los iframes individuales de Streamwish y Voe.sx con nombre de host.
2. Probar resolución para `tv 113962/1/1`: Verificar que devuelve `HLS (ES)` y los iframes de Streamtape y Streamwish.
3. Verificar suite automatizada en `scripts/test-nasriplay-hls.mjs`.
4. Ejecutar `npx tsc --noEmit`.
