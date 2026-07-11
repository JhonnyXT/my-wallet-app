/**
 * Determina si una transacción es un gasto o un ingreso, a partir de
 * palabras clave explícitas del texto de la notificación.
 *
 * Solo se usan formas ya CONFIRMADAS/completadas ("pagaste", "pagó",
 * "debitado"). Sustantivos ambiguos como "pago" (que aparece igual en
 * "Pagaste $12.000" que en el recordatorio "Tienes un pago por $X") se
 * evitan a propósito — ese tipo de notificación se descarta antes, en
 * `intentClassifier`, no aquí.
 */
export function classifyDirection(text: string): { isExpense: boolean; confidence: "high" | "medium" } {
  const n = text.toLowerCase();

  const expenseKeywords = [
    "compra", "compró", "débito", "debito", "debitado", "debitada", "pagó",
    "pagado", "pagada", "pagaste", "retiro", "retiró", "cargo", "cargado", "cobro", "cobrado",
    "transacción débito", "transaccion debito", "enviaste", "enviaron a",
    "transferencia enviada", "salida",
  ];

  const incomeKeywords = [
    "recibiste", "recibió", "recibido", "ingreso", "abono", "consignación",
    "consignacion", "depósito", "deposito", "transferencia recibida",
    "llegaron", "te enviaron", "transferencia entrante",
    "crédito", "credito", "entrada",
  ];

  for (const kw of incomeKeywords) {
    if (n.includes(kw)) return { isExpense: false, confidence: "high" };
  }
  for (const kw of expenseKeywords) {
    if (n.includes(kw)) return { isExpense: true, confidence: "high" };
  }

  // Heurística: si no hay keyword explícita pero pasó el filtro de intención,
  // se asume gasto con confianza media (ej. menciona un comercio conocido).
  return { isExpense: true, confidence: "medium" };
}
