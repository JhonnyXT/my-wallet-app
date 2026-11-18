import { formatCOP } from "@/src/utils/formatMoney";

/**
 * Quita de un texto cualquier referencia a dígitos de tarjeta/cuenta ("con tu tarjeta débito
 * terminada en 1234", "cuenta terminada en 5678"), sin tocar el resto del texto (montos, fechas,
 * nombre del banco). A diferencia de `extractDescription`, NO es para mostrar: es la limpieza
 * mínima que debe aplicarse a CUALQUIER copia del texto crudo que se vaya a persistir —incluidos
 * los campos de debugging `rawTitle`/`rawText` de `ParsedTransaction`— para cumplir la Regla
 * inmutable #6 ("nunca almacenar números de cuenta/tarjeta, ni en el dispositivo ni en la nube")
 * también en esos campos, no solo en `description`.
 */
export function redactCardDigits(text: string): string {
  return text
    .replace(/,?\s*con (tu|su) tarjeta[^.]*/gi, "")
    .replace(/(terminada|terminado|finalizada) en\s*[*\d]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extrae una descripción limpia del texto de la notificación.
 * Elimina: montos, saldos, fechas, "Bancolombia le informa", etc.
 */
export function extractDescription(text: string, bankName: string): string {
  let clean = redactCardDigits(text)
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
 * Reduce una descripción ya limpia (`extractDescription`) a una etiqueta corta para la
 * notificación push: "Compra en RAPPI CO · $45.000", "Recibiste de Juan Pérez · $80.000".
 * Ver AGENTS.md → "Gotchas críticos" → "shortenDescription()" para el detalle del verbo,
 * la extracción de la contraparte y la excepción de remitente-antes-del-verbo.
 */
export function shortenDescription(description: string, isExpense: boolean, amount: number): string {
  const trimmed = description.replace(/\.+$/, "").trim();
  const amountLabel = formatCOP(Math.abs(amount));

  let verb: string;
  if (isExpense) {
    if (/compra/i.test(trimmed)) verb = "Compra";
    else if (/retiro/i.test(trimmed)) verb = "Retiro";
    // "Enviaste"/"Pagaste" separados (antes ambos caían en el mismo "Pago"
    // genérico) — un envío a otra persona no se lee igual que pagar en un
    // comercio, y así queda simétrico con "Recibiste" del lado de ingreso.
    else if (/envi(aste|ó)/i.test(trimmed)) verb = "Enviaste";
    else if (/pag(o|ó|aste)/i.test(trimmed)) verb = "Pagaste";
    else verb = "Gasto";
  } else {
    if (/consignaci[oó]n/i.test(trimmed)) verb = "Consignación";
    else if (/(recib|envi[oó]|enviaron|transfiri[oó]|te lleg)/i.test(trimmed)) verb = "Recibiste";
    else verb = "Ingreso";
  }

  if (!isExpense) {
    // Lookahead `(?=\s|$)` en vez de `\b` — ver AGENTS.md → "shortenDescription()".
    const senderFirstMatch = trimmed.match(
      /^([A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ.]*(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ.]*)*)\s+te\s+(envi[oó]|enviaron|transfiri[oó]|pag[oó])(?=\s|$)/i,
    );
    if (senderFirstMatch) return `${verb} de ${senderFirstMatch[1].trim()} · ${amountLabel}`;
  }

  // Comercio justo después del verbo — ver AGENTS.md → "shortenDescription()".
  if (isExpense) {
    const merchantMatch = trimmed.match(
      /\b(?:compra|compraste|pago|pagaste|retiro)\s+(?:por\s+)?(en|a)\s+(.+?)(?=\s+(?:por|con|el|desde)(?:\s|$)|[,;]|\.(?:\s|$)|$)/i,
    );
    if (merchantMatch) return `${verb} ${merchantMatch[1].toLowerCase()} ${merchantMatch[2].trim()} · ${amountLabel}`;
  }

  const counterpartMatch = trimmed.match(/(?:^|\s)(comercio:?|en|a|de)\s+([^.]+)$/i);
  if (!counterpartMatch) return `${verb} · ${amountLabel}`;

  const preposition = counterpartMatch[1].toLowerCase().startsWith("comercio")
    ? "en"
    : counterpartMatch[1].toLowerCase();
  const counterpart = counterpartMatch[2].trim();

  return `${verb} ${preposition} ${counterpart} · ${amountLabel}`;
}
