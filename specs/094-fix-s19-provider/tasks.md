# Tareas: Spec 094 - Corrección Integral de S19 (Cinecalidad)

- [x] **Tarea 1: Base de Datos y Configuración**
  - [x] Vaciar `movie_list_url` y `tv_list_url` en Supabase para el proveedor `cinecalidad`.
  - [x] Actualizar `supabase/seed.sql`.

- [x] **Tarea 2: Actualizar `lib/cinecalidad.ts`**
  - [x] Migrar endpoint base a `https://tmdb.allcalidad.re`.
  - [x] Mapear servidores para `embedOptions` con nombres de host amigables (Vimeos, Goodstream, Filelions, Streamtape).
  - [x] Extraer stream HLS directo con headers adecuados.

- [x] **Tarea 3: Resolver Unificado en `app/api/resolve/route.ts`**
  - [x] Generar fuente `HLS - S19` si el stream HLS directo está disponible.
  - [x] Generar fuente unificada `S19` (`type: "iframe"`) con `embedOptions`.

- [x] **Tarea 4: Verificación y Certificación**
  - [x] Ejecutar `scripts/test-s19-provider.mjs` en películas y series.
  - [x] Ejecutar `npm run build` y certificar 0 errores.
