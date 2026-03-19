/**
 * colorUtils.ts — Funciones puras de conversión de color para el selector de categorías.
 *
 * hueToColors : dado un hue (0-360) produce el par { accent, bg } para una categoría.
 * hexToHue    : dado un hex de colorAccent existente, extrae el hue para inicializar el slider.
 */

// ─── HSL → Hex ────────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

// ─── Hex → HSL ────────────────────────────────────────────────────────────────

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Normalizar: soporta #RGB y #RRGGBB
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return { h: 0, s: 75, l: 48 };

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: hue,
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Dado un hue (0–360) genera el par de colores para una categoría.
 * - accent: vibrante, buen contraste sobre fondos claros y oscuros
 * - bg:     pastel suave, armónico con el accent
 */
export function hueToColors(hue: number): { accent: string; bg: string } {
  const h = ((hue % 360) + 360) % 360; // normalizar rango
  return {
    accent: hslToHex(h, 75, 48),
    bg: hslToHex(h, 35, 93),
  };
}

/**
 * Extrae el hue (0–360) de un hex de colorAccent existente.
 * Permite inicializar el slider cuando se edita una categoría ya creada.
 * Si el color es acromático (gris/negro/blanco) devuelve 0.
 */
export function hexToHue(hex: string): number {
  return hexToHsl(hex).h;
}
