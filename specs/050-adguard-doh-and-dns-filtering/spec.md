# Spec 050: Integración de AdGuard DoH (DNS-over-HTTPS) con Fallback Automático y Filtrado a Nivel de DNS

## 1. Contexto y Propuesta del Usuario

El usuario propone:
> *"podemos hacer que la aplicacion use este dns por defecto 'dns.adguard-dns.com' en caso de que no consiga conectarce a la web que tome los dns por defecto del sistema, de esa forma consegimos blokear bastantes de esos popads? que te parece la ide, usa SDD"*

### Evaluación y Viabilidad Técnica

1. **En Windows (Electron):**
   - **Totalmente viable de forma nativa:** Chromium cuenta con soporte integrado de **DNS-over-HTTPS (DoH)** configurable mediante switches de línea de comandos antes de que la aplicación cargue la interfaz.
   - El modo `dns-over-https-mode=automatic` ejecuta exactamente el comportamiento solicitado por el usuario:
     - Utiliza `https://dns.adguard-dns.com/dns-query{?dns}` como resolvedor primario para todas las peticiones (web principal, sub-recursos, iframes de reproductores).
     - Si los servidores de AdGuard no responden, están caídos o el ISP bloquea DoH, el motor de Chromium conmuta automáticamente al DNS predeterminado del sistema operativo (fallback transparente sin caídas).

2. **En Android (Capacitor / Android WebView):**
   - Android no expone una API para que un `WebView` cambie de forma aislada su resolvedor DNS sin una conexión VPN a nivel de sistema.
   - Sin embargo, podemos lograr el **mismo efecto de protección de AdGuard DNS** mediante dos vías complementarias:
     a. **Importación de Reglas de AdGuard DNS:** Sincronizar en `adhosts.txt` y `AdBlock.java` las redes de anuncios que AdGuard DNS filtra en su lista base.
     b. **Compatibilidad con DNS Privado de Android:** Para los usuarios que activen `dns.adguard-dns.com` en los ajustes de su teléfono o TV ("DNS Privado"), el nuevo manejador de `AdBlockWebViewClient.java` (Spec 049) intercepta y suprime la pantalla de error nativa `Webpage not available`, colapsando el anuncio silenciosamente.

---

## 2. Objetivos de la Solución

1. **Configurar DoH AdGuard en Electron (`electron/main.js`):**
   - Habilitar `DnsOverHttps` con plantilla `https://dns.adguard-dns.com/dns-query{?dns}`.
   - Configurar el modo `'automatic'` para asegurar el fallback incondicional al DNS del sistema si falla la conexión a AdGuard.
2. **Actualización de dominios AdGuard en listas de bloqueo:**
   - Incorporar en `adhosts.txt` las redes y servidores publicitarios populares catalogados por el filtro oficial de AdGuard DNS.
3. **Resiliencia de Conectividad:**
   - Garantizar que los servidores permitidos (`tvshowapp.net`, proveedores de streaming, CDN de TMDB) resuelvan sin interferencias ni ralentizaciones.
4. **Verificación Automatizada:**
   - Comprobar que los switches de DoH se aplican correctamente en Electron.
   - Ejecutar la suite completa de pruebas unitarias y de compilación.

---

## 3. Criterios de Aceptación
- Electron arranca con los switches de Chromium `DnsOverHttps`, `dns-over-https-mode=automatic` y `dns-over-https-templates` apuntando a AdGuard DoH.
- En caso de indisponibilidad de DoH, la aplicación continúa navegando con normalidad gracias al modo `automatic`.
- Todas las pruebas de `npm run test:sources`, `scripts/test-adblock-banners.mjs` y `npm run build` pasan limpiamente.
