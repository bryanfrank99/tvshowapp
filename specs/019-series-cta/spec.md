# Spec: CTA series "Ver ahora" / "Continuar T/E"

## Contexto
`app/title/page.tsx:275` en `renderTv` solo muestra `<ContinueSeriesButton>` si `history` tiene `tv:id`; si nunca se vio, no hay CTA (vacío). En `MovieDetail:149` películas siempre muestran `Link /watch?type=movie` “Ver ahora”. Usuario pide paridad: serie nunca vista → “Ver ahora” (S1E1) con mismo estilo azul; serie ya vista → “Continuar T{s}E{e}” como actualmente.

## Objetivos
- [ ] Serie sin `history` → botón “Ver ahora” (`d.ver_ahora_btn`) → `/watch?type=tv&id={id}&s=1&e=1`, estilo `bg-[#008CFF] rounded-xl px-5 py-2.5 font-bold + IconPlay` idéntico a películas.
- [ ] Serie con `history` → botón “Continuar T{s}E{e}” (`d.continuar`) existente.
- [ ] Sin flash hydration, sin afectar películas.

## No objetivos
- Cambiar `FavButton`, temporadas, episodios.
- Autoplay ni lógica de next episode.

## Criterios de aceptación
- [ ] Entrar a `/title?type=tv&id=XXXX` sin historial → se ve “Ver ahora”; click lleva a `s=1&e=1`.
- [ ] Tras `save()` de S2E5, volver a detalle → se ve “Continuar T2E5”.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 3, 6. Client component + `useHistory` ya usado.
