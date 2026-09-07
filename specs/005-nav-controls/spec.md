# Spec: controles en navbar

## Contexto
Idioma y estado de proveedores quedaron solo en `/search`; deben vivir en
la navbar global para acceso permanente.

## Objetivos
- [ ] `LangMenu` + `ProvidersDot` de vuelta en el header (compactos, derecha).
- [ ] Quitarlos de `/search` (conservar teclado y resultados).
- [ ] Sin duplicar fetches: el detector ya cachea 1h.

## No objetivos
- Cambiar la página de búsqueda por lo demás.

## Criterios de aceptación
- [ ] Header muestra globo + dot en desktop y móvil (cabida).
- [ ] `/search` sin duplicados.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 1, 3.
