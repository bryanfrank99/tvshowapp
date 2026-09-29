# Plan 058: Sistema Multicapa de Prioridades de Servidores por Idioma

## 1. Arquitectura y Modelo de Datos

```
+-----------------------------------------------------------------------------------------+
|                                    Supabase DB                                          |
|                                                                                         |
|  Tabla: config                                                                          |
|    key: "provider_priorities_by_lang"                                                   |
|    value: '{"pt":["s11_id","s12_id","s10_id"],"es":["s1_id","s2_id"],"en":["s2_id"]}' |
+--------------------------------------------+--------------------------------------------+
                                             |
                     +-----------------------+-----------------------+
                     |                                               |
                     v                                               v
+------------------------------------------+    +------------------------------------------+
|          Panel de Administración         |    |            Resolver de Fuentes           |
|            (app/admin/page.tsx)          |    |         (app/api/resolve/route.ts)       |
|                                          |    |                                          |
|  - Selector de idioma (ES / PT / EN)     |    |  1. Lee prioridades para userLang        |
|  - Lista ordenada de prioridades:        |    |  2. Filtra servidores sin disponibilidad |
|      #1: S11 EmbedMovies    [▼] [✕]      |    |  3. Aplica sortSourcesByPriority:        |
|      #2: S12 RedeFlix    [▲][▼] [✕]      |    |       P1 -> P2 -> P3 -> resto            |
|      #3: S10 StreamBetter[▲]    [✕]      |    |  4. Si P1 no está disponible, P2 sube al |
|  - [+ Añadir Servidor a la lista]        |    |     TOP 1 de forma transparente.         |
|  - Botón: Guardar Prioridades            |    |                                          |
+------------------------------------------+    +------------------------------------------+
```

## 2. Componentes e Implementación

### 1. `lib/sources.ts`
- Actualizar `sortSourcesByPriority(sources, userLang, prioritiesByLang)`:
  - Soporta `Record<string, string[] | string>`.
  - Construye `priorityRank = new Map<string, number>()`.
  - Si una fuente está en la lista de prioridades, su orden es `priorityRank.get(id)`.
  - Si una fuente no está en la lista, se clasifica después de las priorizadas, manteniendo el desempate por estabilidad y afinidad lingüística.

### 2. `app/api/admin/providers/route.ts`
- En `GET`:
  - Lee `provider_priorities_by_lang` de `config` (con fallback de migración a `primary_providers_by_lang` si aún no existe).
  - Retorna `provider_priorities_by_lang: { es: string[], pt: string[], en: string[] }`.
- En `PUT`:
  - Maneja `action === "save_priorities_by_lang"`.
  - Guarda en `config` bajo la clave `provider_priorities_by_lang`.
  - También guarda `primary_providers_by_lang` (primer elemento de cada array) para compatibilidad hacia atrás.
  - Incrementa `providers_version`.

### 3. `app/api/resolve/route.ts`
- Consulta `provider_priorities_by_lang` de `config`.
- Pasa el mapa de prioridades a `sortSourcesByPriority(rawSources, userLang, prioritiesByLang)`.

### 4. `app/admin/page.tsx`
- Reemplazar la tarjeta de 3 selects únicos por un panel interactivo de prioridades:
  - Pestañas para alternar entre idiomas: 🇪🇸 Español (ES), 🇧🇷 Português (PT), 🇺🇸 English (EN).
  - Componente de lista de prioridades:
    - Muestra cada servidor priorizado con su número: `#1`, `#2`, `#3`...
    - Botones de reordenamiento inmediato: flecha arriba (▲) y flecha abajo (▼).
    - Botón de eliminación (✕) para quitarlo de las prioridades.
    - Menú desplegable para añadir servidores activos a la lista de prioridades del idioma actual.
    - Notificación visual de guardado exitoso.

### 5. `scripts/test-multi-priority-by-language.mjs`
- Test 1: Ordenamiento multicapa `[S11, S12, S10, S13]` para `pt` -> el orden exacto en `sources` es S11, S12, S10, S13.
- Test 2: Fallback automático cuando el servidor #1 no tiene el título -> el servidor #2 asciende a `sources[0]`.
- Test 3: Reordenamiento y estructura de datos en API de administración.

## 3. Verificación
- Ejecución de la nueva suite y suites anteriores.
- Compilación con `npm run build`.
