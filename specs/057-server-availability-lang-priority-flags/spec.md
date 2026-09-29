# Spec 057: Administración de Enlaces de Disponibilidad, Servidor Prioritario por Idioma y Corrección de Banderas

## 1. Contexto y Problema
1. **Persistencia y Gestión de Listas de Disponibilidad**:
   - Actualmente, los enlaces para verificar la disponibilidad de catálogo en RedeFlix (`https://redeflixapi.store/list-movie-ids.txt`, etc.) están definidos en código.
   - El administrador debe poder configurar, visualizar y modificar estos enlaces directamente desde el panel de administración (`/admin`) para cualquier servidor, guardándose de manera persistente en la base de datos.
2. **Control del Primer Servidor por Idioma**:
   - El algoritmo de resolución ordena actualmente las fuentes por afinidad de idioma general, pero el administrador no tiene una forma explícita de elegir cuál de los servidores debe aparecer en primer lugar para cada idioma (`es`, `pt`, `en`).
   - El administrador requiere una interfaz en `/admin` donde pueda elegir qué servidor será el primero para cada idioma específico.
3. **Fallo de Renderizado de Banderas en Pantalla de Idiomas**:
   - En el modal de selección de idioma (`LanguageModal.tsx`), las banderas de los idiomas se definieron con emojis Unicode (`🇧🇷`, `🇪🇸`, `🇺🇸`).
   - En Windows (con la fuente `Segoe UI Emoji`) y en diversas versiones de WebView/Android, los emojis de banderas nacionales no son soportados y se muestran como letras planas ("BR", "ES", "US") o símbolos desconocidos.

## 2. Requerimientos del Negocio
> *"¿Esos enlaces imagino que se guardan en la db? Además quiero que ajustes el sistema de administración de servidores para poder agregar ese tipo de enlaces y además poder definir por idioma cuál será el servidor que aparezca primero. También hay un error en la pantalla de selección de idiomas que no muestra las banderas de dichos idiomas. Usa SDD."*

## 3. Especificación Funcional

### A. Persistencia y Administración de Enlaces de Disponibilidad
1. **Base de Datos**:
   - Migración `supabase/migration_provider_availability_urls.sql` para añadir columnas:
     - `movie_list_url` (text)
     - `tv_list_url` (text)
     - `anime_list_url` (text)
     - `dorama_list_url` (text)
   - Fallback resiliente en backend: si las columnas aún no existen en la tabla `providers`, persistir el mapeo en `config` bajo la clave `provider_availability_urls`.
2. **Panel de Administración (`app/admin/page.tsx`)**:
   - En el formulario de edición de servidores, agregar campos de entrada para las URLs de disponibilidad:
     - *Lista de Películas (TXT)*
     - *Lista de Series (JSON)*
     - *Lista de Animes (JSON)*
     - *Lista de Doramas (JSON)*
   - Visualizar en la tabla de servidores si el servidor tiene verificación de disponibilidad activa.
3. **Consumo Dinámico**:
   - `lib/redeflix-availability.ts` y `/api/resolve` utilizarán las URLs configuradas en el servidor, con fallback a los valores predeterminados de RedeFlix si están vacías.

### B. Definición de Servidor Prioritario por Idioma
1. **Persistencia**:
   - En la tabla `config`, almacenar la clave `primary_providers_by_lang`:
     ```json
     {
       "es": "vimeus",
       "pt": "redeflix",
       "en": "vidcore"
     }
     ```
2. **Panel de Administración (`app/admin/page.tsx`)**:
   - Nueva tarjeta de configuración en la sección de Servidores:
     - Para cada idioma soportado (`es`, `pt`, `en`): un selector desplegable con la opción "Predeterminado (Automático)" y las opciones de los servidores registrados (mostrando nombre real y `S{ord}`).
     - Botón de guardado que actualiza la configuración vía API.
3. **Ordenamiento de Fuentes (`lib/sources.ts` y `/api/resolve`)**:
   - Durante la resolución, si el usuario tiene idioma `X` y el administrador definió un servidor primario para `X`:
     - Dicho servidor se posiciona primero (`sources[0]`) siempre que esté activo y contenga el título solicitado.
     - Si no contiene el título (por ejemplo, omitido por la lista de disponibilidad), se aplica el orden habitual de afinidad.

### C. Corrección Visual de Banderas de Idioma
1. **Componentes SVG de Banderas ([`components/icons/FlagIcon.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/icons/FlagIcon.tsx))**:
   - Crear componentes SVG nítidos para:
     - Bandera de Brasil (`pt`)
     - Bandera de España (`es`)
     - Bandera de Estados Unidos (`en`)
2. **Integración en UI**:
   - Reemplazar los emojis de texto en `components/LanguageModal.tsx` por el componente SVG renderizado con dimensiones fijas (`w-8 h-5.5 rounded overflow-hidden shadow-sm`).
   - Aplicar el mismo componente o SVG donde se requiera soporte multiplataforma garantizado.

## 4. Criterios de Aceptación
1. El administrador puede ingresar y editar URLs de listas en el formulario de edición de servidores.
2. Las URLs se guardan en la base de datos / config y se reflejan al recargar la página.
3. El administrador puede seleccionar el servidor que aparecerá primero para `es`, `pt` y `en`.
4. Al resolver un título en `/api/resolve` para un usuario con idioma `pt`, si el administrador definió un servidor primario (ej. RedeFlix) y este tiene el título, dicho servidor aparece en la primera posición (`S{ord}`).
5. Las banderas en la pantalla de selección de idiomas se visualizan perfectamente como imágenes vectoriales SVG en Windows y cualquier dispositivo, sin depender de fuentes de emojis del sistema.
6. La suite de pruebas y compilación `npm run build` pasan al 100%.
