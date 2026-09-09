# Spec: acceso admin y conexión directa a Supabase

## Contexto
No se puede entrar a `/admin`. Además se quiere operación directa sobre
Supabase sin pasar por la UI.

## Objetivos
- [ ] Login admin funciona con Supabase (y fallback env para bootstrap)
- [ ] Script/endpoint para crear el primer admin si la tabla está vacía
- [ ] Conexión directa verificable: `GET /api/admin/health` con estado Supabase
- [ ] Manejo de errores claro cuando faltan env vars

## No objetivos
- Roles/permisos múltiples

## Criterios de aceptación
- [ ] Con `SUPABASE_*` bien puestas, login con clave inicial entra a `/admin`
- [ ] `curl /api/admin/health` devuelve `{supabase:true, table:true}`
- [ ] `npm run build` verde

## Restricciones
- Constitución: 2 (sin secretos en repo), 3
