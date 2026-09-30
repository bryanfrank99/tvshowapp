# Spec 067: Optimización de Carga de Servidores, Caché de Streams M3U8 en BD, Ocultamiento de Servidor HLS y Limpieza de UI

## 1. Problema
1. **Latencia Excesiva al Cargar Servidores**:
   - Al abrir `/watch`, la API `/api/resolve` experimenta una demora considerable (varios segundos). Esto ocurre porque las comprobaciones de disponibilidad de catálogo de los proveedores y la extracción de streams HTML/m3u8 (e.g. MegaEmbed / Cinecalidad) se ejecutaban de manera sincrónica y secuencial en un bucle `for`, sumado a timeouts de hasta 15 segundos que bloqueaban la respuesta hacia el usuario.
2. **Duplicidad del "Servidor HLS" en la Lista de Servidores**:
   - En la lista de servidores (`SourceSelectorGrid`), además del servidor principal (ej. S14 MegaEmbed), aparecía una tarjeta redundante denominada "MegaEmbed (Nativo TV) [HLS]". El usuario solicita expresamente que **no se muestre el servidor HLS en la lista de servidores**, manteniendo una cuadrícula limpia de servidores principales.
3. **Persistencia de Streams M3U8 Extraídos en Base de Datos**:
   - Actualmente, la extracción de streams HLS (.m3u8) se calcula al vuelo y se pierde al recargar. El usuario pregunta si el sistema de extracción del archivo m3u puede guardarse en la base de datos junto al servidor. Guardar el stream extraído en BD (Supabase) con un TTL permite resolver el reproductor nativo en milisegundos sin repetir peticiones de scraping a sitios externos.
4. **Elementos Redundantes en la Pantalla de Reproducción**:
   - En la página de reproducción, debajo del reproductor de video, permanecían dos botones externos: `[ ⛶ Tela cheia ]` y `[ 🔄 Trocar servidor ]`. Dado que el reproductor nativo ya integra control de pantalla completa para TV y gestión interna, estos botones externos ya no son necesarios y deben ser eliminados.
5. **Conflicto Visual del Icono de Pausa en el Centro**:
   - Al pausar el video, el reproductor desplegaba una caja negra de OSD `[ ⏸ Pausa ]` directamente sobre el icono circular translúcido de pulso (`centerPulse`). El usuario identificó que por debajo existe otro indicador que se adapta mucho mejor al estilo de la interfaz (estilo Netflix / Smart TV) y pide retirar el botón/caja superpuesto.

## 2. Requerimientos
1. **Optimización de Velocidad en `/api/resolve`**:
   - Ejecutar comprobaciones de catálogo de proveedores en paralelo con límites de tiempo estrictos (1.5s max timeout).
   - Consultar la base de datos (caché de streams) de forma previa e inmediata.
   - No bloquear la entrega de servidores con tareas lentas de scraping en el servidor; entregar los servidores de inmediato y resolver streams nativos en segundo plano o mediante la caché de BD.
2. **Ocultamiento del Servidor HLS en la Lista de Servidores**:
   - En `SourceSelectorGrid`, filtrar y no desplegar tarjetas separadas para streams "HLS" o `-native`.
   - Cuando el usuario reproduzca el servidor S14 (MegaEmbed), debe reproducirse con el reproductor nativo HLS de forma transparente sin exponer una tarjeta separada en la lista inferior.
3. **Caché Persistente de Streams M3U8 en BD (`stream_cache` / `config`)**:
   - Implementar `lib/stream-cache.ts` para almacenar streams extraídos vinculados al proveedor, tipo de medio (película/serie) y temporada/episodio con expiración (TTL).
   - Soporte para tabla `stream_cache` en Supabase con fallback transparente a la tabla `config` (clave `stream:{key}`) para retrocompatibilidad total.
   - Endpoint de persistencia para que extracciones exitosas desde IP residencial (cliente) se guarden en la base de datos para todas las sesiones futuras.
4. **Limpieza de UI en Pantalla de Reproducción (`app/watch/page.tsx`)**:
   - Eliminar los botones externos `#btn-fullscreen` y `#btn-cycle-server` ubicados debajo del reproductor.
   - Conservar únicamente la navegación de episodios para series (`← E1`, `Siguiente E2 →`, `Todos los episodios`).
5. **Ajuste del Pulso de Pausa Central (`NativeSourcePlayer.tsx`)**:
   - Eliminar `triggerFeedback("⏸", "Pausa")` y `triggerFeedback("▶", "Reproducir")` en `togglePlay()`.
   - Dejar visible únicamente la animación circular translúcida `centerPulse`, diseñada con estética de alta gama (vidrio esmerilado, centrado exacto y desvanecimiento suave a 600 ms).

## 3. Criterios de Aceptación
- La lista de servidores en la pantalla de reproducción no muestra ningún elemento separado de "Servidor HLS" o "Nativo TV".
- Los botones externos de "Tela cheia" y "Trocar servidor" debajo del reproductor han sido eliminados de la UI.
- Al pausar el video, solo aparece el icono circular translúcido elegante de pausa sin la caja negra con texto "Pausa" por encima.
- La caché de streams en BD (`stream_cache` / `config`) guarda y recupera streams .m3u8 válidos.
- `/api/resolve` responde velozmente (< 1s) gracias a la paralelización y consulta de caché.
- `npm run build` compila sin errores.
