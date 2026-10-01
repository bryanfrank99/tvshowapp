# Plan de Implementación: Spec 094 - Corrección Integral de S19 (Cinecalidad)

## Fase 1: Base de Datos y Configuración
- [ ] Vaciar `movie_list_url` y `tv_list_url` en el registro `cinecalidad` de Supabase para evitar falsos positivos de indisponibilidad.
- [ ] Asegurar configuración de `cinecalidad`: `ord: 19`, `enabled: true`, `lang: "es"`, `languages: ["es", "lat"]`.
- [ ] Actualizar `supabase/seed.sql`.

## Fase 2: Actualización de Extractor (`lib/cinecalidad.ts`)
- [ ] Cambiar endpoint base a `https://tmdb.allcalidad.re/v1/playback/...`.
- [ ] Manejar embeds devueltos por la API (Vimeos, Goodstream, Filelions, Streamtape) y mapear sus hosts y nombres para el selector unificado.
- [ ] Desempaquetar y validar stream directo HLS desde Vimeos.

## Fase 3: Integración en Resolutor (`app/api/resolve/route.ts`)
- [ ] Emitir fuente `HLS - S19` (`type: "hls"`, `priority: 120`) cuando el stream directo esté disponible.
- [ ] Emitir fuente unificada `S19` (`type: "iframe"`, `priority: 95`) con `embedOptions` para permitir selección manual en el reproductor.

## Fase 4: Pruebas y Certificación
- [ ] Validar con `scripts/test-s19-provider.mjs` que películas y series resuelvan correctamente para S19.
- [ ] Ejecutar `npm run build` certificando compilación limpia.
