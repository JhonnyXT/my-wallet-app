// ─── Tipos y utilidades de filtro de período ─────────────────────────────────

export type PeriodFilter =
  | { type: "quick"; label: string }
  | { type: "month"; year: number; month: number }
  | { type: "year";  year: number }
  | { type: "all" };

export const MONTH_ABBR = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
] as const;

export function getDefaultPeriod(): PeriodFilter {
  return { type: "quick", label: "Este mes" };
}

export function periodFilterLabel(f: PeriodFilter): string {
  switch (f.type) {
    case "quick": return f.label;
    case "month": return `${MONTH_ABBR[f.month - 1]} ${f.year}`;
    case "year":  return `${f.year}`;
    case "all":   return "Todo";
  }
}

function getBiweeklyRange(now: Date): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (now.getDate() <= 15) {
    return { start: new Date(y, m, 1), end: new Date(y, m, 15, 23, 59, 59) };
  }
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { start: new Date(y, m, 16), end: new Date(y, m, lastDay, 23, 59, 59) };
}

export function applyPeriodFilter<T extends { date: string }>(
  transactions: T[],
  f: PeriodFilter,
): T[] {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  switch (f.type) {
    case "all": return [...transactions];
    case "year": {
      const s = new Date(f.year, 0, 1);
      const e = new Date(f.year, 11, 31, 23, 59, 59);
      return transactions.filter((t) => { const d = new Date(t.date); return d >= s && d <= e; });
    }
    case "month": {
      const s = new Date(f.year, f.month - 1, 1);
      const e = new Date(f.year, f.month, 0, 23, 59, 59);
      return transactions.filter((t) => { const d = new Date(t.date); return d >= s && d <= e; });
    }
    case "quick":
      switch (f.label) {
        case "Hoy":           return transactions.filter((t) => new Date(t.date) >= todayStart);
        case "Esta semana":   return transactions.filter((t) => new Date(t.date) >= weekStart);
        case "Esta quincena": {
          const { start, end } = getBiweeklyRange(now);
          return transactions.filter((t) => { const d = new Date(t.date); return d >= start && d <= end; });
        }
        case "Este mes":      return transactions.filter((t) => new Date(t.date) >= monthStart);
        case "Este año":      return transactions.filter((t) => new Date(t.date) >= yearStart);
        default:              return [...transactions];
      }
  }
}
