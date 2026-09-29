// ─── Texto para compartir una lista (WhatsApp, correo…) ─────────────────────────
// Resumen de lo que se ve en el Dashboard: período, gastos, ingresos, balance y, si la
// lista tiene más personas, quién pagó cuánto y quién le debe a quién.

import type { Settlement } from "@/src/utils/settlement";
import { formatBalance } from "@/src/utils/transactionFormatters";

function signed(amount: number): string {
  return `${amount < 0 ? "-" : ""}${formatBalance(Math.abs(amount))}`;
}

export function buildListShareText({
  emoji,
  name,
  periodLabel,
  expense,
  income,
  settlement,
  nameOf,
}: {
  emoji: string;
  name: string;
  periodLabel: string;
  expense: number;
  income: number;
  settlement: Settlement | null;
  /** Nombre visible de cada persona (incluida quien comparte). */
  nameOf: (memberId: string) => string;
}): string {
  const lines = [
    `${emoji} ${name} · ${periodLabel}`,
    `Gastos: ${formatBalance(expense)}`,
    `Ingresos: ${formatBalance(income)}`,
    `Balance: ${signed(income - expense)}`,
  ];

  if (settlement) {
    lines.push("", "Cuentas (partes iguales):");
    for (const p of settlement.paid)
      lines.push(`• ${nameOf(p.memberId)}: ${formatBalance(p.paid)}`);
    if (settlement.transfers.length === 0) lines.push("Están a mano.");
    for (const t of settlement.transfers) {
      lines.push(`${nameOf(t.from)} le debe ${formatBalance(t.amount)} a ${nameOf(t.to)}.`);
    }
  }

  lines.push("", "Enviado desde MyWallet");
  return lines.join("\n");
}
