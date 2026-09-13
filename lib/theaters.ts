// @ts-nocheck
// Helper puro sin dependencias de Node ni servidor (compartido entre Server y Client Components)

/**
 * Determina con alta precisión si una película sigue actualmente en cines y no ha tenido
 * su lanzamiento digital o físico (lo que implica que cualquier video disponible es grabación CAM).
 *
 * Analiza el array release_dates de TMDB:
 * - Tipo 2 o 3: Estreno en Cines (Theatrical).
 * - Tipo 4: Estreno Digital / VOD / Streaming.
 * - Tipo 5: Formato Físico (Blu-ray / DVD).
 */
export function isMovieInTheaters(m: any): boolean {
  if (!m) return false;
  // Solo aplica a películas, no a series de TV
  if (m.type === "tv" || m.media_type === "tv" || m.number_of_seasons !== undefined) {
    return false;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Análisis detallado si disponemos de release_dates (vía append_to_response=release_dates)
  const results = m.release_dates?.results || [];
  if (Array.isArray(results) && results.length > 0) {
    const all = results.flatMap((r: any) => r.release_dates || []);

    // Verificar si ya tuvo estreno en cines en algún país
    const hasTheatrical = all.some(
      (x: any) => (x.type === 2 || x.type === 3) && x.release_date && x.release_date.slice(0, 10) <= todayStr
    );

    if (!hasTheatrical) {
      return false;
    }

    // Verificar si ya salió en Digital (Tipo 4) o Físico (Tipo 5)
    const releasedDigitalOrPhysical = all.some(
      (x: any) => (x.type === 4 || x.type === 5) && x.release_date && x.release_date.slice(0, 10) <= todayStr
    );

    // Si ya fue lanzada en digital o físico en cualquier país, ya NO es exclusiva de cines
    if (releasedDigitalOrPhysical) {
      return false;
    }

    return true;
  }

  // 2. Si la película viene marcada explícitamente desde el catálogo (now_playing)
  if (m.in_theaters === true) {
    return true;
  }

  // 3. Fallback heurístico por fecha de estreno general si no hay release_dates desglosado
  if (m.release_date) {
    const relTime = new Date(m.release_date).getTime();
    const nowTime = Date.now();
    const daysSince = (nowTime - relTime) / (1000 * 60 * 60 * 24);
    // En cines si se estrenó hace entre 0 y 60 días (ventana teatral típica)
    return daysSince >= 0 && daysSince <= 60;
  }

  return false;
}
