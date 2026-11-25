/**
 * Tope de dígitos para cualquier campo de monto: sin tope, un número lo bastante largo hace
 * que `Math.round(value).toString()` de JS caiga en notación exponencial ("1e+21") a partir de
 * 1e21, rompiendo la Regla inmutable #2. 15 dígitos (999 billones) queda lejos de ese umbral.
 */
export const MAX_AMOUNT_DIGITS = 15;

/**
 * Formatea un string de dígitos con puntos de miles (estilo COP).
 * "196100" → "196.100"    "1000000" → "1.000.000"
 */
export function formatMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_AMOUNT_DIGITS);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un número para visualización con puntos de miles (siempre COP).
 * Usa regex en lugar de toLocaleString para no depender del locale del dispositivo.
 * 196100 → "196.100"   1500000 → "1.500.000"
 *
 * Clampea a `Number.MAX_SAFE_INTEGER` antes de `.toString()`: por encima de 1e21 JS cambia a
 * notación exponencial ("1e+21") sin avisar, y el regex de miles no tiene nada que insertar ahí.
 */
export function formatMoneyDisplay(value: number): string {
  if (!value || value <= 0) return "0";
  return Math.min(Math.round(value), Number.MAX_SAFE_INTEGER)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un número como monto COP completo con símbolo $ .
 * 40000 → "$ 40.000"
 */
export function formatCOP(value: number): string {
  return `$ ${formatMoneyDisplay(value)}`;
}
