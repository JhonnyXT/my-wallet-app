/**
 * fuzzyMatch — tolerancia a errores de tipeo para la detección de categoría/
 * emoji y tipo gasto-ingreso por keywords. 100% offline, sin dependencias.
 */

/** Distancia de edición clásica (Levenshtein). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // eliminación
        curr[j - 1] + 1,  // inserción
        prev[j - 1] + cost // sustitución
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Distancia máxima tolerada según el largo del keyword — a más letras, más margen. */
function maxDistanceFor(len: number): number {
  if (len < 5) return 0;
  if (len <= 7) return 1;
  return 2;
}

/**
 * ¿`haystack` contiene `keyword`? Primero intenta match exacto (camino rápido,
 * igual que el `.includes()` de siempre). Si no matchea y `keyword` es una sola
 * palabra de 5+ caracteres, compara por distancia de edición contra cada palabra
 * de `haystack` para tolerar typos ("almuerso" → "almuerzo").
 *
 * Keywords multi-palabra (con espacios) y de menos de 5 caracteres solo se
 * buscan por match exacto — palabras cortas con 1 sola letra de tolerancia dan
 * demasiados falsos positivos (ej. "casa" vs "caza" a distancia 1).
 */
export function fuzzyIncludes(haystack: string, keyword: string): boolean {
  if (haystack.includes(keyword)) return true;
  if (keyword.includes(" ") || keyword.length < 5) return false;

  const maxDist = maxDistanceFor(keyword.length);
  const words = haystack.split(/\s+/);
  return words.some((w) => w.length >= 4 && levenshtein(w, keyword) <= maxDist);
}
