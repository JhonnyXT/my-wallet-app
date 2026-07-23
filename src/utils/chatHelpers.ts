// ─── Helpers del chat NLP ─────────────────────────────────────────────────────

/**
 * Genera un título corto a partir del primer mensaje del usuario.
 * Elimina signos de interrogación/exclamación y trunca a 34 caracteres.
 */
export function makeTitle(text: string): string {
  const cleaned = text
    .trim()
    .replace(/[¿?¡!]/g, "")
    .trim();
  return cleaned.length > 34 ? cleaned.slice(0, 34).trimEnd() + "…" : cleaned;
}

/**
 * Formatea una fecha ISO como "HH:MM" (hora local).
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Clasifica una fecha ISO en los grupos "HOY", "AYER" o "ANTES".
 */
export function getGroup(iso: string): "HOY" | "AYER" | "ANTES" {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "HOY";
  if (d.toDateString() === yesterday.toDateString()) return "AYER";
  return "ANTES";
}

/**
 * Genera los paths SVG de la línea y el área para la gráfica de área suavizada.
 * Usa interpolación Catmull-Rom (t=0.3) entre los puntos dados.
 */
export function smoothPath(pts: { x: number; y: number }[]): { line: string; area: string } {
  if (pts.length < 2) return { line: "", area: "" };
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(n - 1, i + 1)];
    const t = 0.3;
    const cp1x = p1.x + ((p2.x - p0.x) * t) / 2;
    const cp1y = p1.y + ((p2.y - p0.y) * t) / 2;
    const cp2x = p2.x - ((p3.x - p1.x) * t) / 2;
    const cp2y = p2.y - ((p3.y - p1.y) * t) / 2;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const areaD = d + ` L ${pts[n - 1].x.toFixed(1)} 96 L ${pts[0].x.toFixed(1)} 96 Z`;
  return { line: d, area: areaD };
}
