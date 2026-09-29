# Spec 058: Sistema Multicapa de Prioridades de Servidores por Idioma

## 1. Contexto y Problema
En la versión actual, el panel de administración permite definir únicamente **un solo** servidor prioritario (primer servidor) por cada idioma (`es`, `pt`, `en`).

Sin embargo, en entornos reales de streaming:
- Si el servidor #1 no dispone de un título en particular (por ejemplo, omitido porque no está en sus listas de disponibilidad) o se encuentra saturado/inactivo, el sistema debe saber con precisión cuál es el servidor #2 (prioridad 2), cuál es el servidor #3 (prioridad 3), y así sucesivamente.
- El administrador necesita una interfaz interactiva donde pueda configurar el orden completo de prioridades por idioma (ejemplo para PT: 1º S11 EmbedMovies, 2º S12 RedeFlix, 3º S10 StreamBetter, 4º S13 PipocaCine).

### Decisión de Arquitectura de Base de Datos
- **Pregunta del usuario**: ¿Es mejor agregar una nueva tabla a la base de datos o usar una que ya tengamos?
- **Decisión**: **Usar la tabla existente `config`** de Supabase con la clave `provider_priorities_by_lang`.
  - **Ventajas**:
    1. **Cero migraciones DDL**: No requiere `CREATE TABLE`, eliminando riesgos de fallas por permisos o desincronización de esquemas.
    2. **Lectura y escritura atómica**: Guarda y recupera en una sola operación ultrarrápida el array ordenado de IDs por idioma.
    3. **Integridad garantizada**: Evita filas huérfanas y simplifica el reordenamiento.
    4. **Retrocompatibilidad**: Compatible con la clave anterior `primary_providers_by_lang`.

## 2. Requerimiento del Negocio
> *"Quiero modificar Servidor Prioritario por Idioma, y en vez de tener uno es mejor hacer un sistema de prioridades, y así en vez de tener uno configuro por prioridad ejemplo S11 prioridad 1, S2 prioridad 2, etc. Para ello no sé si es mejor agregar una tabla a la db o usar alguna otra que ya tenemos. Usa SDD."*

## 3. Especificación Funcional

### A. Estructura de Datos en `config` (`provider_priorities_by_lang`)
```json
{
  "es": ["vimeus", "vidcore", "cinesrc"],
  "pt": ["embedmovies", "redeflix", "streambetter", "pipocacine"],
  "en": ["vidcore", "vimeus", "embos"]
}
```
- La posición en el array representa el nivel de prioridad:
  - Índice `0` = **Prioridad 1**
  - Índice `1` = **Prioridad 2**
  - Índice `2` = **Prioridad 3**, etc.
- Los servidores activos no incluidos explícitamente en la lista de prioridades se ordenan a continuación según la afinidad lingüística estándar.

### B. Algoritmo de Ordenamiento ([`lib/sources.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/sources.ts))
1. En `sortSourcesByPriority(sources, userLang, prioritiesByLang)`:
   - Se obtiene el array ordenado correspondiente a `userLang`.
   - Se crea un mapa de rangos: `Map<providerId, rank>`.
   - Si dos fuentes están en el mapa de prioridades, se ordenan según su índice ascendente (`rankA - rankB`).
   - Si solo una está en el mapa, esa fuente tiene precedencia sobre la que no está.
   - Si ninguna está en el mapa de prioridades, se aplica la regla de estabilidad: servidores estables sobre beta, y puntuación por afinidad de idioma.
2. **Resiliencia ante Fallas o Falta de Contenido**:
   - Si el servidor con Prioridad 1 no tiene el contenido solicitado (ej. RedeFlix filtrado por Spec 056) o está inactivo, el resolver asigna automáticamente el primer puesto al servidor con Prioridad 2, luego Prioridad 3, etc.

### C. Panel de Administración ([`app/admin/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/admin/page.tsx))
1. En la pestaña de Servidores, se presenta el panel:
   **"Sistema de Prioridades de Servidores por Idioma"**:
   - Pestañas o selector rápido para cada idioma: 🇪🇸 **Español (ES)**, 🇧🇷 **Português (PT)**, 🇺🇸 **English (EN)**.
   - Lista visual de servidores priorizados con:
     - Badge numérico destacado: **#1 Prioridad 1**, **#2 Prioridad 2**, **#3 Prioridad 3**...
     - Nombre del servidor y distintivo `S{ord}`.
     - Botones de reordenamiento intuitivo: **Subir (▲)** y **Bajar (▼)**.
     - Botón para remover de la lista de prioridades (✕).
   - Menú para **"Añadir Servidor a la lista de prioridades"** para agregar cualquier servidor activo restante.
   - Botón general **"Guardar Prioridades"** que persiste los cambios mediante la API.

### D. API de Administración ([`app/api/admin/providers/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/admin/providers/route.ts))
1. `GET`:
   - Retorna `provider_priorities_by_lang` normalizado `{ es: string[], pt: string[], en: string[] }`.
2. `PUT`:
   - Soporta `{ action: "save_priorities_by_lang", provider_priorities_by_lang: { ... } }`, validando y guardando en `config`, e incrementando `providers_version`.

## 4. Criterios de Aceptación
1. Para un idioma dado (ej. `pt`), el administrador puede asignar una secuencia de prioridades: Prioridad 1 (S11), Prioridad 2 (S12), Prioridad 3 (S10), etc.
2. Al resolver fuentes para un usuario en `pt`:
   - Si todos los servidores disponen del título, el orden es exactamente S11, S12, S10...
   - Si S11 no está disponible para ese título, S12 asciende automáticamente a la primera posición (`sources[0]`).
3. El administrador puede cambiar el orden fácilmente con botones (▲ / ▼), agregar servidores a la lista o quitarlos.
4. La configuración se guarda en la tabla `config` sin requerir nuevas tablas en la base de datos.
5. Toda la suite de pruebas unitarias, de integración y `npm run build` pasan al 100%.
