# Spec: 4 proveedores nuevos

## Contexto
Agregar superembed.stream, moviesapi.to, cinesrc.st y vidzee.wtf.

## Objetivos
- [ ] Formato embed verificado (docs + HTTP 200 real) de cada uno.
- [ ] Determinar `needsTmdb` (TMDB numérico vs IMDb directo).
- [ ] Entradas JSON listas para el repo tvlistdata + copia local.

## No objetivos
- Tocar código (el sistema ya es dinámico).

## Criterios de aceptación
- [ ] Los 4 responden 200 en movie y serie de prueba.
- [ ] Snippet JSON válido entregado.

## Restricciones
- Los proveedores viven en el repo tvlistdata (externo): aquí solo referencia.
