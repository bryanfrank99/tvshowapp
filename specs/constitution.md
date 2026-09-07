# Constitución del proyecto TVShow

Principios no negociables. Toda spec, plan e implementación deben respetarlos.

1. **Español, inglés y portugués**: toda UI nueva sale en los 3 idiomas (`lib/dict.ts`).
2. **Sin secretos en el repo**: keys solo en `.env.local` / variables de entorno. Verificar con `git grep` antes de commitear.
3. **Build verde o no existe**: `npm run build` debe pasar antes de dar por hecho nada.
4. **Dual TMDB/free**: lo nuevo funciona con key TMDB y en modo free (Cinemeta/TVMaze), o declara su límite honestamente.
5. **Proveedores remotos**: nada hardcodeado que pueda vivir en el JSON de `NEXT_PUBLIC_PROVIDERS_URL`.
6. **Móvil primero + mando TV**: foco visible, targets táctiles ≥36px, navegable con flechas.
7. **Privacidad local**: historial y favoritos en `localStorage` del navegador, nunca en servidor.
8. **Sin hosting de video**: solo iframes de terceros + página DMCA.
