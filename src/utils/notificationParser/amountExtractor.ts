/**
 * Extrae el primer monto en COP que encuentre en el texto.
 * Soporta: $1.000 · $1,000 · $1000 · 1.000 · 1,000 · 1000
 */
export function extractAmount(text: string): number | null {
  // Patrones de mayor a menor especificidad
  const patterns = [
    // "$200.000,00" o "$1.234.567,00" — formato COP con decimales (Nu, Itaú)
    /\$\s*([\d]{1,3}(?:\.[\d]{3})+),\d{2}\b/,
    // "$1.234.567" o "$1,234,567" — con símbolo y separadores
    /\$\s*([\d]{1,3}(?:[.,][\d]{3})+)/,
    // "$45000" — con símbolo sin separadores
    /\$\s*(\d{4,})/,
    // "200.000,00" — sin símbolo pero con decimales
    /\b(\d{1,3}(?:\.\d{3})+),\d{2}\b/,
    // "45.000" o "45,000" — sin símbolo, con separadores de miles
    /\b(\d{1,3}(?:[.,]\d{3})+)\b/,
    // "45000" — sin símbolo ni separadores (>= 4 dígitos)
    /\b(\d{5,})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalizar: quitar puntos de miles y comas
      const raw = match[1].replace(/\./g, "").replace(/,/g, "");
      const value = parseInt(raw, 10);
      if (value > 0) return value;
    }
  }
  return null;
}
