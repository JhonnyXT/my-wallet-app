/**
 * Formatea un string de dígitos con puntos de miles (estilo COP).
 * "196100" → "196.100"    "1000000" → "1.000.000"
 */
export function formatMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un número para visualización con puntos de miles (siempre COP).
 * Usa regex en lugar de toLocaleString para no depender del locale del dispositivo.
 * 196100 → "196.100"   1500000 → "1.500.000"
 */
export function formatMoneyDisplay(value: number): string {
  if (!value || value <= 0) return "0";
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un número como monto COP completo con símbolo $ .
 * 40000 → "$ 40.000"
 */
export function formatCOP(value: number): string {
  return `$ ${formatMoneyDisplay(value)}`;
}
