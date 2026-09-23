import { formatCOP } from "@/src/utils/formatMoney";

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
 *
 * Excepción — transferencias entrantes con el remitente ANTES del verbo
 * ("Bancolombia te envió...", "Juan Pérez te transfirió..."): ahí no hay
 * "de X"/"a X" al final, el nombre está al principio. Sin este caso, esas
 * notificaciones caían al genérico "Ingreso" sin decir quién mandó la plata
 * (bug real: es exactamente el fixture "Nu — transferencia entrante de otro
 * banco" de `fixtures.ts`). Solo aplica a ingresos — nadie te "envía" un
 * gasto tuyo.
 *
 * Siempre incluye el monto al final ("Recibiste de Juan Pérez · $80.000",
 * "Compra en RAPPI CO · $45.000") — a pedido del usuario, la etiqueta debe
 * leerse completa sola: quién/dónde Y cuánto, sin depender de que el monto
 * también se muestre aparte en otro elemento de la pantalla.
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
    // `\b` no sirve como límite tras una vocal acentuada ("envió", "transfirió"):
    // en JS, \w es solo ASCII, así que "ó" no cuenta como carácter de palabra y
    // \b nunca coincide justo después — se usa un lookahead de espacio/fin de
    // texto en su lugar.
    const senderFirstMatch = trimmed.match(
      /^([A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ.]*(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ.]*)*)\s+te\s+(envi[oó]|enviaron|transfiri[oó]|pag[oó])(?=\s|$)/i,
    );
    if (senderFirstMatch) return `${verb} de ${senderFirstMatch[1].trim()} · ${amountLabel}`;
  }

  const counterpartMatch = trimmed.match(/(?:^|\s)(comercio:?|en|a|de)\s+([^.]+)$/i);
  if (!counterpartMatch) return `${verb} · ${amountLabel}`;

  const preposition = counterpartMatch[1].toLowerCase().startsWith("comercio")
    ? "en"
    : counterpartMatch[1].toLowerCase();
  const counterpart = counterpartMatch[2].trim();

  return `${verb} ${preposition} ${counterpart} · ${amountLabel}`;
}
