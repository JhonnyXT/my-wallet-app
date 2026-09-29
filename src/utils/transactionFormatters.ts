// ─── Helpers de formato para transacciones ───────────────────────────────────

import { EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";

const MONTH_ABBR = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export function resolveCategory(
  emoji: string,
  userCats: { emoji: string; name: string }[],
  goals: { emoji: string; name: string }[],
): string {
  const u = userCats.find((c) => c.emoji === emoji);
  if (u) return u.name.charAt(0).toUpperCase() + u.name.slice(1).toLowerCase();
  const g = goals.find((g) => g.emoji === emoji);
  if (g) return g.name.charAt(0).toUpperCase() + g.name.slice(1).toLowerCase();
  const n = EMOJI_TO_CATEGORY_NAME[emoji];
  if (n) return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  return "General";
}

export function formatDetailDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDetailTime(dateStr: string): string {
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "p.m." : "a.m.";
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

export function formatDetailAmount(amount: number): string {
  return `$ ${Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function formatBalance(amount: number): string {
  return `$${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function extractTagsFromTx(tx: {
  description?: string | null;
  tags?: string | null;
}): string[] {
  if (tx.tags) {
    try {
      const parsed = JSON.parse(tx.tags);
      if (Array.isArray(parsed)) return parsed.map((t: string) => t.toLowerCase());
    } catch {
      /* fallback */
    }
  }
  const matches = (tx.description ?? "").match(/#(\w+)/g);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}

// ─── Agrupación por día (lista del Dashboard) ─────────────────────────────────

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

export type DayGroupRow<T> =
  { kind: "day"; key: string; label: string; net: number } | { kind: "tx"; key: string; tx: T };

/** "Hoy", "Ayer", "lun 22 sep" o "lun 22 sep 2025" (otro año). `ymd` = "YYYY-MM-DD" local. */
export function dayLabel(ymd: string, now: Date = new Date()): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  const base = `${WEEKDAY_SHORT[date.getDay()]} ${d} ${MONTH_ABBR[m - 1].toLowerCase()}`;
  return y === now.getFullYear() ? base : `${base} ${y}`;
}

/**
 * Intercala un encabezado por día (etiqueta + neto del día: ingresos − gastos) antes de
 * sus transacciones. Espera la lista ya ordenada por fecha descendente, como viene de la
 * base; el día sale del ISO local (`localISOString`), no de UTC.
 */
export function groupTransactionsByDay<T extends { id: number; date: string; amount: number }>(
  transactions: T[],
  now: Date = new Date(),
): DayGroupRow<T>[] {
  const rows: DayGroupRow<T>[] = [];
  let current: { kind: "day"; key: string; label: string; net: number } | null = null;
  for (const tx of transactions) {
    const ymd = tx.date.slice(0, 10);
    if (!current || current.key !== `day-${ymd}`) {
      current = { kind: "day", key: `day-${ymd}`, label: dayLabel(ymd, now), net: 0 };
      rows.push(current);
    }
    current.net -= tx.amount;
    rows.push({ kind: "tx", key: String(tx.id), tx });
  }
  return rows;
}
