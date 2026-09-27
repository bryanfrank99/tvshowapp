# Spec: Cambio de Título a "TVShow - Indexador" en todas las Apps

## 1. Contexto y Requerimiento
El usuario solicitó cambiar la denominación oficial de la aplicación que figura como:
`TVShow — Catálogo + Player` (o `TVShow -- Catalogo + Player`)
por:
`TVShow - Indexador`
aplicándolo en todas las plataformas y aplicaciones (Web, Electron Windows, Android WebView, metadata de fallback).

---

## 2. Puntos de Impacto

1. **Layout Principal (`app/layout.tsx`):**
   - El título raíz de metadatos Next.js define el `<title>` de la aplicación en el navegador web, en la PWA, en la WebView de Android y en la ventana de Electron.
   - Cambiar `title: "TVShow — Catálogo + Player"` a `title: "TVShow - Indexador"`.
2. **Página de Detalle de Título (`app/title/page.tsx`):**
   - El objeto fallback de metadatos `generateMetadata` contiene `const fallback = { title: "TVShow — Catálogo + Player" };`.
   - Cambiar a `const fallback = { title: "TVShow - Indexador" };`.
3. **App de Escritorio Windows (`electron/main.js`):**
   - Configuración inicial de `BrowserWindow`: actualizar `title: 'TVShow'` a `title: 'TVShow - Indexador'`.
4. **Metadata de Android / Stores (`fastlane/metadata/android/short_description.txt`):**
   - Alinear descripción breve sustituyendo referencias de "Catálogo y reproductor" a "Indexador".

---

## 3. Criterios de Aceptación
- `app/layout.tsx` tiene `title: "TVShow - Indexador"`.
- `app/title/page.tsx` tiene `fallback = { title: "TVShow - Indexador" }`.
- `electron/main.js` define `title: 'TVShow - Indexador'`.
- Todas las menciones directas a "Catálogo + Player" son eliminadas.
- Las pruebas automatizadas y `npm run build` pasan exitosamente.
