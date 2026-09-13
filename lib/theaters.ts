// @ts-nocheck
// Helper puro sin dependencias de Node ni servidor (compartido entre Server y Client Components)

/**
 * Determina con alta precisión si una película sigue actualmente en cines y no ha tenido
 * su lanzamiento digital o físico (lo que implica que cualquier video disponible es grabación CAM).
 */
export function isMovieInTheaters(m: any): boolean {
  if (!m) return false;
  // Solo aplica a películas, no a series de TV
  if (m.type === "tv" || m.media_type === "tv" || m.number_of_seasons !== undefined) {
    return false;
  }

  // 1. Si la película ya viene marcada explícitamente como en cines (p. ej. por now_playing o query param)
  if (m.in_theaters === true) {
    return true;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // 2. Análisis detallado si disponemos de release_dates (vía append_to_response=release_dates)
  const results = m.release_dates?.results || [];
  if (Array.isArray(results) && results.length > 0) {
    const all = results.flatMap((r: any) => r.release_dates || []);

    // Verificar si ya tuvo estreno en cines en algún país
    const hasTheatrical = all.some(
      (x: any) => (x.type === 2 || x.type === 3) && x.release_date && x.release_date.slice(0, 10) <= todayStr
    );

    if (!hasTheatrical) {
      // Si la fecha de estreno en cines aún no ha llegado, verificar fecha general
      if (m.release_date) {
        const daysSince = (Date.now() - new Date(m.release_date).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= 0 && daysSince <= 90;
      }
      return false;
    }

    // Comprobar si ya existe estreno digital o físico (Tipo 4 o 5) que ya haya salido
    // Filtramos prioritariamente por mercados hispanos/globales principales (US, ES, MX, BR)
    const releasedDigitalOrPhysical = all.some(
      (x: any) => (x.type === 4 || x.type === 5) && x.release_date && x.release_date.slice(0, 10) <= todayStr
    );

    if (releasedDigitalOrPhysical) {
      return false;
    }

    return true;
  }

  // 3. Fallback heurístico por fecha de estreno general si no hay release_dates desglosado (p. ej. desde caché local)
  if (m.release_date) {
    const relTime = new Date(m.release_date).getTime();
    const nowTime = Date.now();
    const daysSince = (nowTime - relTime) / (1000 * 60 * 60 * 24);
    // En cines si se estrenó en los últimos 90 días (ventana teatral típica antes de streaming)
    return daysSince >= 0 && daysSince <= 90;
  }

  return false;
}
