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

/**
 * Reduce una descripción ya limpia (`extractDescription`) a una etiqueta corta
 * para la notificación push: "Compra en RAPPI CO", "Recibiste de Juan Pérez".
 *
 * El verbo (Compra/Pago/Retiro vs Recibiste/Ingreso/Consignación) lo decide
 * `isExpense` — YA clasificado por `classifyDirection` — no una keyword suelta
 * del texto. Bancos distintos frasean la misma acción distinto ("enviaron" es
 * ingreso en Nequi cuando alguien te manda plata, pero sería gasto si el
 * usuario es quien envía), así que solo `isExpense` decide la dirección; las
 * keywords dentro de cada rama solo eligen el verbo más específico posible.
 *
 * La contraparte (comercio/persona) se extrae de la última frase preposicional
 * ("en X" / "a X" / "de X" / "Comercio: X") del texto ya limpio. Si no hay
 * ninguna, se devuelve solo el verbo — nunca texto vacío ni crashea.
 */
export function shortenDescription(description: string, isExpense: boolean): string {
  const trimmed = description.replace(/\.+$/, "").trim();

  let verb: string;
  if (isExpense) {
    if (/compra/i.test(trimmed)) verb = "Compra";
    else if (/retiro/i.test(trimmed)) verb = "Retiro";
    else if (/(pag(o|ó|aste)|envi(aste|ó))/i.test(trimmed)) verb = "Pago";
    else verb = "Gasto";
  } else {
    if (/consignaci[oó]n/i.test(trimmed)) verb = "Consignación";
    else if (/(recib|enviaron|te lleg)/i.test(trimmed)) verb = "Recibiste";
    else verb = "Ingreso";
  }

  const counterpartMatch = trimmed.match(/(?:^|\s)(comercio:?|en|a|de)\s+([^.]+)$/i);
  if (!counterpartMatch) return verb;

  const preposition = counterpartMatch[1].toLowerCase().startsWith("comercio")
    ? "en"
    : counterpartMatch[1].toLowerCase();
  const counterpart = counterpartMatch[2].trim();

  return `${verb} ${preposition} ${counterpart}`;
}
