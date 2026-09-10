# Plan: CTA series paridad con películas

## Enfoque
Extender `ContinueSeriesButton.tsx` a `SeriesWatchButton`: si `!last` render “Ver ahora”, else “Continuar”. Mantener `app/title/page.tsx:275` punto único.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `components/ContinueSeriesButton.tsx` | rama `if (!last) → Ver ahora s1e1` else Continuar; export default sigue igual |
| `app/title/page.tsx` | sin cambio (sigue `<ContinueSeriesButton id={id} />`) o renombrar import si se renombra archivo |
| `lib/dict.ts` | ya tiene `ver_ahora_btn` / `continuar` |

## Detalle
```tsx
const last = history.find(h=>h.type==="tv" && String(h.id)===String(id));
if (!mounted) return <span className="bg-white/10 rounded-xl px-5 py-2.5 text-sm">…</span> skeleton o null (mantener null para no layout shift)
if (!last) return <Link href={`/watch?type=tv&id=${id}&s=1&e=1`} className="bg-[#008CFF]..."><IconPlay/>{d.ver_ahora_btn}</Link>
return <Link href={`/watch?type=tv&id=${id}&s=${last.season}&e=${last.episode}`} ...>{d.continuar} T{s}E{e}</Link>
```
Clase idéntica a `MovieDetail:149` para consistencia.

## Riesgos
- Hydration mismatch si `mounted` false → mantener `null` como ahora.
- `useHistory` lee `localStorage`; ok.

## Verificación
- `npm run build`, navegar serie nueva vs vista.
