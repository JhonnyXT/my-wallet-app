// ─── Cuentas de una lista compartida: quién pagó cuánto y quién le debe a quién ──
// Reparto en partes iguales entre todos los miembros, solo sobre gastos (amount > 0);
// los ingresos no se reparten. Montos en pesos enteros (COP no usa centavos).

export interface MemberPaid {
  memberId: string;
  paid: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface Settlement {
  total: number;
  share: number;
  paid: MemberPaid[];
  transfers: Transfer[];
}

/**
 * `memberIds` son todos los de la lista, incluido quien usa el teléfono (SELF_PAYER).
 * Un gasto pagado por alguien que ya no está en `memberIds` se ignora.
 */
export function computeSettlement(
  transactions: { paid_by: string; amount: number }[],
  memberIds: string[],
): Settlement {
  const paidMap = new Map(memberIds.map((id) => [id, 0]));
  for (const tx of transactions) {
    if (tx.amount <= 0 || !paidMap.has(tx.paid_by)) continue;
    paidMap.set(tx.paid_by, (paidMap.get(tx.paid_by) ?? 0) + tx.amount);
  }
  const paid = memberIds.map((memberId) => ({ memberId, paid: paidMap.get(memberId) ?? 0 }));
  const total = paid.reduce((s, p) => s + p.paid, 0);
  const share = memberIds.length > 0 ? total / memberIds.length : 0;

  // Saldo de cada uno: positivo = le deben, negativo = debe. Se liquida emparejando al que
  // más debe con al que más le deben (pocas transferencias).
  const creditors = paid
    .map((p) => ({ id: p.memberId, amount: Math.round(p.paid - share) }))
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const debtors = paid
    .map((p) => ({ id: p.memberId, amount: Math.round(share - p.paid) }))
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount <= 0) i++;
    if (creditors[j].amount <= 0) j++;
  }

  return { total, share: Math.round(share), paid, transfers };
}

/** Frase de una transferencia desde el punto de vista de quien usa el teléfono (`selfId`). */
export function transferText(
  t: Transfer,
  selfId: string,
  nameOf: (id: string) => string,
  money: (n: number) => string,
): string {
  if (t.to === selfId) return `${nameOf(t.from)} te debe ${money(t.amount)}`;
  if (t.from === selfId) return `Le debes ${money(t.amount)} a ${nameOf(t.to)}`;
  return `${nameOf(t.from)} le debe ${money(t.amount)} a ${nameOf(t.to)}`;
}

/** Resumen de una línea para el Dashboard ("Ana te debe $322.500", "Están a mano"…). */
export function settlementHeadline(
  s: Settlement,
  selfId: string,
  nameOf: (id: string) => string,
  money: (n: number) => string,
): string {
  if (s.transfers.length === 0) return "Están a mano";
  if (s.transfers.length === 1) return transferText(s.transfers[0], selfId, nameOf, money);
  return `${s.transfers.length} cuentas pendientes`;
}
