# Spec: página de búsqueda TV

## Contexto
El buscador del header no sirve al mando TV. Nueva página `/search` estilo
referencia: teclado en pantalla + resultados con badges.

## Objetivos
- [ ] Header solo logo; búsqueda/idioma/detector viven en `/search`.
- [ ] Teclado ES en pantalla (A-Z, Ñ, acentos, espacio, borrar, limpiar).
- [ ] Sin query: "Popular search" + Refresh + Total.
- [ ] Cards con badge rating + S/E como la referencia.
- [ ] Navegable 100% con flechas (data-rail).

## No objetivos
- Búsqueda por voz, filtros, paginación.

## Criterios de aceptación
- [ ] Escribir "dune" solo con flechas + OK y ver resultados.
- [ ] Refresh trae populares, Total coincide.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 1 (3 idiomas), 3, 6.
