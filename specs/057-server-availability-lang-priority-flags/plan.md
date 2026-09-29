# Plan 057: Administración de Enlaces de Disponibilidad, Servidor Prioritario por Idioma y Corrección de Banderas

## 1. Arquitectura y Flujo

```
+----------------------------------------------------------------------------------+
|                              PANEL DE ADMINISTRACIÓN                             |
|                             (app/admin/page.tsx)                                 |
|                                                                                  |
|  1. Formulario Servidores:                                                       |
|     - movie_list_url, tv_list_url, anime_list_url, dorama_list_url               |
|                                                                                  |
|  2. Servidor Prioritario por Idioma:                                             |
|     - [ES] -> Servidor primero (ej. S1 - Vimeus)                                 |
|     - [PT] -> Servidor primero (ej. S12 - RedeFlix)                              |
|     - [EN] -> Servidor primero (ej. S2 - VidCore)                                |
+----------------------------------------+-----------------------------------------+
                                         |
                                         v
+----------------------------------------------------------------------------------+
|                            API DE ADMINISTRACIÓN                                 |
|                     (app/api/admin/providers/route.ts)                           |
|  - PUT/GET providers con columnas de availability URLs                           |
|  - GET/POST primary_providers_by_lang en config                                  |
|  - Fallback resiliente a config si faltan columnas en providers                  |
+----------------------------------------+-----------------------------------------+
                                         |
                                         v
+----------------------------------------------------------------------------------+
|                          RESOLUCIÓN Y REPRODUCTOR                                |
|                         (app/api/resolve/route.ts)                               |
|  - Consulta primary_providers_by_lang para el idioma actual                      |
|  - Usa URLs dinámicas de disponibilidad por proveedor                            |
|  - Ordena fuentes poniendo el servidor primario en la posición 1                 |
+----------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------+
|                          INTERFAZ DE USUARIO (FLAGS)                             |
|            components/icons/FlagIcon.tsx + components/LanguageModal.tsx          |
|  - Renderiza vectores SVG de banderas (BR, ES, US) sin depender de fuentes emoji |
+----------------------------------------------------------------------------------+
```

## 2. Archivos Afectados

1. **[`components/icons/FlagIcon.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/icons/FlagIcon.tsx)**:
   - Crear componentes SVG limpios `FlagBR`, `FlagES`, `FlagUS`, `FlagIcon`.
2. **[`components/LanguageModal.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/LanguageModal.tsx)**:
   - Renderizar `FlagIcon` en lugar de emojis de texto.
3. **[`supabase/migration_provider_availability_urls.sql`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/supabase/migration_provider_availability_urls.sql)**:
   - Migración para añadir `movie_list_url`, `tv_list_url`, `anime_list_url`, `dorama_list_url`.
4. **[`app/api/admin/providers/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/admin/providers/route.ts)**:
   - Soporte en GET y PUT para los campos de availability URLs y configuración de servidor prioritario por idioma.
5. **[`app/admin/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/admin/page.tsx)**:
   - Agregar campos de availability URLs en el modal de edición de servidor.
   - Agregar panel de selección de "Servidor prioritario por idioma" con guardado dinámico.
6. **[`lib/sources.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/sources.ts)** y **[`app/api/resolve/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/resolve/route.ts)**:
   - Integrar servidor preferido por idioma y URLs de catálogo configurables.
7. **[`scripts/test-admin-availability-and-lang-priority.mjs`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/scripts/test-admin-availability-and-lang-priority.mjs)**:
   - Suite de pruebas automatizadas.
