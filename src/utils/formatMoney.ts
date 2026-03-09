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
 * Formatea un número para visualización sin símbolo ni sufijo.
 * 196100 → "196.100"
 */
export function formatMoneyDisplay(value: number): string {
  if (!value || value <= 0) return "0";
  return Math.round(value).toLocaleString("es-ES");
}
