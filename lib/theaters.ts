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

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  // 1. Si la película tiene fecha de estreno y es de hace más de 90 días, NO es exclusiva de cines
  if (m.release_date) {
    const relTime = new Date(m.release_date).getTime();
    if (!isNaN(relTime)) {
      const daysSince = (now - relTime) / (1000 * 60 * 60 * 24);
      // Películas estrenadas hace más de 90 días ya tienen distribución digital / streaming
      if (daysSince > 90) {
        return false;
      }
    }
  }

  // 2. Si disponemos de release_dates (vía append_to_response=release_dates), comprobar si YA salió en streaming / digital o físico
  const results = m.release_dates?.results || [];
  if (Array.isArray(results) && results.length > 0) {
    const all = results.flatMap((r: any) => r.release_dates || []);

    // Comprobar si ya existe estreno digital (4) o físico (5) cuya fecha ya pasó
    const releasedDigitalOrPhysical = all.some(
      (x: any) => (x.type === 4 || x.type === 5) && x.release_date && x.release_date.slice(0, 10) <= todayStr
    );

    // Si ya está en streaming/digital/físico, DEFINITIVAMENTE NO es calidad CAM de cines
    if (releasedDigitalOrPhysical) {
      return false;
    }

    // Comprobar si tuvo estreno en cines reciente (tipo 2 o 3)
    const hasTheatrical = all.some(
      (x: any) => (x.type === 2 || x.type === 3) && x.release_date && x.release_date.slice(0, 10) <= todayStr
    );

    if (hasTheatrical) {
      return true;
    }
  }

  // 3. Si viene marcada explícitamente por now_playing, validar que sea reciente (últimos 90 días)
  if (m.in_theaters === true) {
    if (m.release_date) {
      const relTime = new Date(m.release_date).getTime();
      const daysSince = (now - relTime) / (1000 * 60 * 60 * 24);
      return daysSince >= -14 && daysSince <= 90;
    }
    return false;
  }

  // 4. Fallback por fecha de estreno (últimos 45 días)
  if (m.release_date) {
    const relTime = new Date(m.release_date).getTime();
    const daysSince = (now - relTime) / (1000 * 60 * 60 * 24);
    return daysSince >= 0 && daysSince <= 45;
  }

  return false;
}
