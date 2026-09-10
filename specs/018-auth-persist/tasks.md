# Tasks: Sesión persiste tras reinicio

- [x] 1. Diagnóstico H1-H3 (MainActivity + DevTools cookies + chrome://inspect)
- [x] 2. `lib/access.ts` `sessionCookieOpts()` con `secure` en prod
- [x] 3. `app/api/access/route.ts` `GET /api/access` verify + `POST` con opts seguras
- [x] 4. `hooks/useSession.ts` `ensureSession()` re-auth silencioso desde `tvshow_code`
- [x] 5. `components/AccessGate.tsx` guardar `tvshow_code` junto a `tvshow_ref_code`
- [x] 6. `app/watch/page.tsx` integrar `ensureSession` antes de `fetchProviders` (+ retry embed-url)
- [x] 7. `android/.../MainActivity.java` `CookieManager` accept+flush onCreate/onPause/onResume
- [x] 8. `npm run build` verde (Compiled successfully, 31 rutas, /watch 10.7kB)
- [ ] 9. Caso revocado/expirado muestra `gate_revoked/expired` sin loop (pendiente push + E2E kill)
