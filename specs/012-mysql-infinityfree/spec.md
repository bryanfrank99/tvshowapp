# Spec: migrar a MySQL (InfinityFree) + providers tras login

## Hallazgos (verificados)
1. **MySQL de InfinityFree solo acepta conexiones desde su propio hosting**
   (`localhost`). Vercel/local NO pueden conectar directo: haría falta un
   PHP intermedio en su host (`api.php` → JSON).
2. **El anti-bot de InfinityFree (`aes.js`) responde desafío JS a clientes sin
   cookie**, incluidos `fetch` servidor-a-servidor. Ya lo comprobamos con
   `providers.json`: devuelve challenge, no JSON. Un PHP en su host sufriría
   lo mismo al llamarlo desde fuera.
3. **Muro de login** implica sistema de usuarios completo: registro/login,
   sesiones, middleware en `/api/embed-url` y UI. Alcance grande.

## Opciones
- **A. Todo en InfinityFree (PHP+MySQL)**: bloqueado por 1+2. No viable en plan free.
- **B. MySQL con acceso remoto** (TiDB/Aiven/Railway free) + login NextAuth:
  viable, metadata y providers en SQL, `embed-url` exige sesión. Coste: ~2-3 días.
- **C. Híbrido**: metadata en MySQL remoto (B) y providers igual; InfinityFree
  queda fuera por sus límites.

## Recomendación
**B** si el login es prioritario; si no, mantener SQLite (cero costo) y posponer.

## Decisión pendiente del dueño
- [ ] ¿B con qué host MySQL? ¿Login con email+password o Google/GitHub?
- [ ] ¿Providers filtrados por usuario/plan o mismo catálogo para logueados?
