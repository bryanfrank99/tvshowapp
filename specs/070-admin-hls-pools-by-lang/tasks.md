# Tasks: Spec 070 - Administración de Pools HLS por Idioma y Aislamiento de Audio

- [x] **Tarea 1: Backend de Configuración HLS Dinámica (`app/api/admin/providers/route.ts`)**
  - [x] Soportar lectura y guardado de `hls_mode` / `hls_extractor` por proveedor en `config` (`provider_hls_config`) y tabla `providers`.
  - [x] Enriquecer el endpoint GET para retornar la configuración HLS de cada servidor.

- [x] **Tarea 2: Lógica de Aislamiento por Idioma en Resolver (`app/api/resolve/route.ts`)**
  - [x] Consultar configuración de compatibilidad HLS dinámica.
  - [x] Agrupar fuentes HLS en pools estrictamente segmentados por idioma de audio (`es`/`lat`, `pt`, `en`).
  - [x] Asignar `backupUrls` únicamente entre fuentes del mismo grupo de idioma.
  - [x] Asignar `providerName = "HLS"` a cada pool consolidado.

- [x] **Tarea 3: Reestructuración de la Interfaz de Administración (`app/admin/page.tsx`)**
  - [x] En el formulario de edición de servidor: añadir selector de "Tipo de Entrega" (Iframe vs HLS Nativo con selector de extractor).
  - [x] Añadir sección/panel informativo "Pools HLS por Idioma" mostrando los pools activos (`🇪🇸 Español`, `🇧🇷 Português`, `🇺🇸 Inglés`) y sus servidores miembros.
  - [x] Actualizar badges en la lista de proveedores para reflejar el tipo HLS y su idioma.

- [x] **Tarea 4: Verificación y Pruebas**
  - [x] Ejecutar prueba de no mezcla de idiomas en pools HLS (`scripts/test-hls-lang-isolation.mjs`).
  - [x] Validar compilación con `npx tsc --noEmit`.
