// @ts-nocheck
// Helper puro sin dependencias de Node ni servidor (compartido entre Server y Client Components)

/**
 * Calcula los días calendario transcurridos desde la fecha de estreno (release_date) hasta hoy.
 * Se normaliza a medianoche UTC para evitar discrepancias por zona horaria.
 * - Retorna 0 el mismo día del estreno.
 * - Retorna número positivo si ya se estrenó (ej: 45 hace 45 días).
 * - Retorna número negativo si el estreno es en el futuro (ej: -5 faltan 5 días).
 * - Retorna null si la fecha es inválida o no se proporciona.
 */
export function getDaysSinceRelease(releaseDateStr?: string | null): number | null {
  if (!releaseDateStr) return null;
  const clean = String(releaseDateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;

  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return null;

  const releaseDateUTC = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Math.floor((todayUTC - releaseDateUTC) / (1000 * 60 * 60 * 24));
}

/**
 * Determina si una película debe mostrar la etiqueta "EN CINES".
 * Regla: Aparece a todas las películas desde su fecha de estreno (día 0)
 * y hasta 45 días después. En el día 46 ya no se muestra.
 */
export function isMovieInTheaters(m: any): boolean {
  if (!m) return false;
  // Solo aplica a películas, no a series de TV
  if (m.type === "tv" || m.media_type === "tv" || m.number_of_seasons !== undefined) {
    return false;
  }

  // Si tiene fecha de estreno, calcular días transcurridos
  const daysSince = getDaysSinceRelease(m.release_date);
  if (daysSince !== null) {
    // Desde el día del estreno (0) hasta 45 días después inclusive.
    // En el día 46 (daysSince >= 46) o antes del estreno (daysSince < 0) no se muestra.
    return daysSince >= 0 && daysSince <= 45;
  }

  // Si no tiene release_date pero viene marcada explícitamente como in_theaters
  if (m.in_theaters === true) {
    return true;
  }

  return false;
}

