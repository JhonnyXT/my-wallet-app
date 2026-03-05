/**
 * Local NLP engine — zero cost, offline, privacy-first.
 * Translates Spanish natural-language questions into SQLite queries
 * and returns formatted text responses.
 */
import {
  queryMonthTotal,
  queryYearTotal,
  queryTodayTotal,
  queryYesterdayTotal,
  queryLastNTransactions,
  queryMaxTransaction,
} from "@/src/db/queries";
import type { TransactionRow } from "@/src/db/db";

export interface NLPResult {
  text: string;
  rows?: TransactionRow[];
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function fmt(amount: number): string {
  // Pesos colombianos: sin decimales, separador de miles
  return `$ ${Math.round(amount).toLocaleString("es-ES")}`;
}

/** Normalize: lowercase + strip accents */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function processQuery(raw: string): Promise<NLPResult> {
  const q = normalize(raw);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  // ── Today ──────────────────────────────────────────────────────────────
  if (/\bhoy\b|de hoy/.test(q)) {
    const total = await queryTodayTotal();
    return total > 0
      ? { text: `Hoy has gastado **${fmt(total)}** 📅` }
      : { text: "No tienes gastos registrados hoy. ¡Buen día! 🎉" };
  }

  // ── Yesterday ──────────────────────────────────────────────────────────
  if (/\bayer\b/.test(q)) {
    const total = await queryYesterdayTotal();
    return total > 0
      ? { text: `Ayer gastaste **${fmt(total)}** 📅` }
      : { text: "No hay gastos registrados ayer." };
  }

  // ── This month ─────────────────────────────────────────────────────────
  if (/este mes|mes actual|mes corriente/.test(q)) {
    const total = await queryMonthTotal(curYear, curMonth);
    return { text: `Este mes llevas **${fmt(total)}** gastados 💰` };
  }

  // ── Last month ─────────────────────────────────────────────────────────
  if (/mes pasado|ultimo mes|mes anterior/.test(q)) {
    const lastMonth = curMonth === 1 ? 12 : curMonth - 1;
    const year = curMonth === 1 ? curYear - 1 : curYear;
    const total = await queryMonthTotal(year, lastMonth);
    return { text: `El mes pasado gastaste **${fmt(total)}** 📊` };
  }

  // ── Specific named month (ej: "en enero", "cuánto en marzo") ───────────
  for (const [name, num] of Object.entries(MONTHS)) {
    if (q.includes(name)) {
      const year =
        num > curMonth ? curYear - 1 : curYear;
      const total = await queryMonthTotal(year, num);
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      return { text: `En ${label} gastaste **${fmt(total)}** 📅` };
    }
  }

  // ── This year ──────────────────────────────────────────────────────────
  if (/este ano|ano actual|ano corriente/.test(q)) {
    const total = await queryYearTotal(curYear);
    return { text: `Este año llevas **${fmt(total)}** gastados 📈` };
  }

  // ── Last N transactions (ej: "últimas 5 transacciones") ────────────────
  const lastNMatch = q.match(
    /ultim[ao]s?\s+(\d+)\s+(transacciones|gastos|compras|movimientos)/
  );
  if (lastNMatch) {
    const n = parseInt(lastNMatch[1]);
    const rows = await queryLastNTransactions(n);
    if (!rows.length) return { text: "No tienes transacciones aún 📝" };
    const list = rows
      .map(
        (t) =>
          `${t.category_emoji} **${t.description}** — ${fmt(t.amount)}`
      )
      .join("\n");
    return {
      text: `Tus últimas ${rows.length} transacciones:\n\n${list}`,
      rows,
    };
  }

  // ── Latest transactions (no number) ────────────────────────────────────
  if (
    /ultim[ao]s?\s+(transacciones|gastos|compras|movimientos)|ultimas\b|mis gastos/.test(
      q
    )
  ) {
    const rows = await queryLastNTransactions(5);
    if (!rows.length) return { text: "No tienes transacciones aún 📝" };
    const list = rows
      .map(
        (t) =>
          `${t.category_emoji} **${t.description}** — ${fmt(t.amount)}`
      )
      .join("\n");
    return {
      text: `Tus últimas ${rows.length} transacciones:\n\n${list}`,
      rows,
    };
  }

  // ── Biggest expense ─────────────────────────────────────────────────────
  if (
    /mayor gasto|mas caro|gasto mas grande|gasto mayor|mas costoso/.test(q)
  ) {
    const tx = await queryMaxTransaction();
    if (!tx) return { text: "No hay gastos registrados aún 📝" };
    return {
      text: `Tu mayor gasto fue **${tx.description}** por ${fmt(tx.amount)} ${tx.category_emoji}`,
    };
  }

  // ── Help / default ──────────────────────────────────────────────────────
  return {
    text: `Puedo ayudarte con preguntas como:\n\n• "¿Cuánto gasté hoy?"\n• "¿Cuánto gasté este mes?"\n• "¿Cuánto gasté el mes pasado?"\n• "Muéstrame mis últimas 5 transacciones"\n• "¿Cuánto gasté en enero?"\n• "¿Cuál fue mi mayor gasto?"`,
  };
}
