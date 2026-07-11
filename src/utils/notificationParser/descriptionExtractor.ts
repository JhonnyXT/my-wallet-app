/**
 * Extrae una descripción limpia del texto de la notificación.
 * Elimina: montos, saldos, fechas, "Bancolombia le informa", etc.
 */
export function extractDescription(text: string, bankName: string): string {
  let clean = text
    // Eliminar prefijos genéricos de bancos
    .replace(/bancolombia le informa/i, "")
    .replace(/su (cuenta|tarjeta) (fue |ha sido )?/i, "")
    .replace(/transacci[oó]n (aprobada|rechazada|exitosa)?/i, "")
    // Eliminar monto + contexto de saldo
    .replace(/\$[\d.,]+/g, "")
    .replace(/saldo[\s:]*[\d.,]+/gi, "")
    .replace(/saldo disponible[\s:]*[\d.,]+/gi, "")
    // Eliminar fechas
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "")
    .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/gi, "")
    // Limpiar espacios múltiples
    .replace(/\s{2,}/g, " ")
    .trim();

  // Si quedó muy corto o vacío, usar el nombre del banco
  if (clean.length < 4) clean = `${bankName}`;

  // Capitalizar primera letra
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
