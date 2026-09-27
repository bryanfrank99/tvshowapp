# Spec: Proveedor Rei dos Canais y Rediseño de Administración de Canales

## Contexto
TVShow cuenta con una sección de TV en vivo (`/live`) que actualmente consume proveedores como StreamBetter y TVF90. El usuario solicita agregar el proveedor de canales brasileño **Rei dos Canais** (`https://api.reidoscanais.st/channels`) y modernizar la interfaz de administración de canales (`/admin` tab Live TV) para que tenga la misma estética, estructura de tarjetas, diagnóstico de salud/latencia y experiencia de usuario que la pestaña de Servidores (`tab === "prov"`).

## Objetivos
- [ ] Integrar el proveedor **Rei dos Canais** (`id: "reidoscanais"`, `format: "reidoscanais"`, `list: "https://api.reidoscanais.st/channels"`).
- [ ] Parsear correctamente los canales, categorías, logos y enlaces embed (`https://rdcanais.net/{id}`) en `app/live/page.tsx`.
- [ ] Habilitar el proxy `/api/live/list` para los dominios de Rei dos Canais (`reidoscanais.st`, `api.reidoscanais.st`, `rdcanais.net`).
- [ ] Añadir los dominios a las listas de navegación permitidas para Android TV (`capacitor.config.ts`, `capacitor.config.json` y `AdBlockWebViewClient.java`).
- [ ] Rediseñar completamente la pestaña de administración de canales en `app/admin/page.tsx` para replicar el diseño de la pestaña de servidores:
  - Header con botón de añadir fuente y botón de diagnóstico/health check de latencia.
  - Tarjetas de canales con badges de orden (#ord), nombre, formato visual, latencia/estado de salud en tiempo real, e indicador de activo/inactivo.
  - Botones de acción consistentes: Activar/Desactivar, Editar y Eliminar.
  - Formulario modal/desplegable de edición estilizado con selector visual de formato (presets de Rei dos Canais, StreamBetter y TVF90).
- [ ] Endpoint de diagnóstico de salud de canales (`GET /api/admin/live/health-check`).

## No objetivos
- Modificar el reproductor HLS interno de películas/series.
- Descifrar canales protegidos por DRM externo que requieran addons de terceros.

## Criterios de aceptación
- [ ] En `/live`, los canales de Rei dos Canais cargan y muestran su categoría, logo y abren el reproductor embed.
- [ ] En `/admin` (pestaña Live TV), la vista tiene el mismo estilo que la pestaña de servidores: tarjetas con orden, formato, diagnóstico de salud (⚡ Diagnosticar), y botones de activación rápida.
- [ ] El modal de edición de canal permite elegir formato visualmente y reordenar fuentes.
- [ ] `npm run build` compila limpiamente sin errores.
- [ ] Suite de pruebas automatizadas en `scripts/test-reidoscanais-live.mjs` valida el parsing de Rei dos Canais, el health check y las configuraciones de catálogo.
