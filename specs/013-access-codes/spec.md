# Spec: acceso por código con expiración (Supabase)

## Idea
Sin código válido no hay proveedores. Códigos únicos en DB con expiración.

## Diseño propuesto
- **Supabase Postgres** (free, sin anti-bot, RLS). Tablas:
  - `access_codes(id, code_hash, label, expires_at, revoked, created_at)`
  - `sessions(token_hash, code_id, created_at)` (token aleatorio en cookie HttpOnly)
  - `providers(id, name, movie_tpl, tv_tpl, needs_tmdb, tvok, active, ord)`
  - `live_sources(id, name, format, list)` + `config(version)` (bump manual al editar)
- **Flujo**: watch → `/api/embed-url` sin sesión → 401 → modal pide código →
  `POST /api/access {code}` valida hash + `expires_at > now()` + no revocado →
  crea sesión → reintenta. Sesión válida mientras el código lo sea.
- **Seguridad**: códigos guardados en hash SHA-256 (no plaintext); rate-limit
  en memoria por IP (5 intentos/min); service_role SOLO en servidor.
- **Admin v1**: crear/revocar códigos con SQL en el dashboard Supabase
  (documentado). Sin panel propio todavía.
- **Migración**: providers/live salen del JSON público de GitHub (si queda
  público, el muro es teatro) → solo Supabase. El JSON local queda de referencia.

## Preguntas al dueño
- [ ] ¿Expiración típica del código? (ej. 30 días, 1 año, sin expiración)
- [ ] ¿Mismo catálogo para todos los códigos válidos?
- [ ] ¿Panel admin propio ahora o SQL basta?

## Criterios de aceptación
- [ ] Sin código: player muestra "acceso requerido", cero URLs filtradas.
- [ ] Código expirado/revocado → denegado.
- [ ] `npm run build` verde + claves solo en servidor.
