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
export function classifyDirection(text: string): {
  isExpense: boolean;
  confidence: "high" | "medium";
} {
  const n = text.toLowerCase();

  const expenseKeywords = [
    "compra",
    "compró",
    "débito",
    "debito",
    "debitado",
    "debitada",
    "pagó",
    "pagado",
    "pagada",
    "pagaste",
    "retiro",
    "retiró",
    "cargo",
    "cargado",
    "cobro",
    "cobrado",
    "transacción débito",
    "transaccion debito",
    "enviaste",
    "enviaron a",
    "transferencia enviada",
    "salida",
  ];

  const incomeKeywords = [
    "recibiste",
    "recibió",
    "recibido",
    "ingreso",
    "abono",
    "consignación",
    "consignacion",
    "depósito",
    "deposito",
    "transferencia recibida",
    "llegaron",
    "te llegó",
    "te enviaron",
    "te envió",
    // "transfirió"/"transfirieron" en 3ra persona = alguien más te transfirió a ti (ingreso);
    // la acción propia del usuario se frasea distinto ("transferiste", no cubierto aquí porque
    // ya cae en "enviaste"/"salida"). shortenDescription() ya reconocía este verbo para nombrar
    // la transacción (ver su regex de "remitente antes del verbo"); faltaba acá, en la
    // clasificación gasto/ingreso misma — bug real: una transferencia recibida fraseada así caía
    // al heurístico por defecto (gasto) en vez de ingreso (reportado 2026-11-18).
    "transfirió",
    "transfirieron",
    "transferencia entrante",
    "crédito",
    "credito",
    "entrada",
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
