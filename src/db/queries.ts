import * as SQLite from "expo-sqlite";
import type { TransactionRow } from "./db";
import { localISOString as localISO, getNativeDatabase } from "./db";

/** Alias interno para brevedad */
const getDb = getNativeDatabase;

export async function queryMonthTotal(year: number, month: number): Promise<number> {
  const db = await getDb();
  const firstDay = localISO(new Date(year, month - 1, 1));
  const lastDay = localISO(new Date(year, month, 0, 23, 59, 59));
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ?`,
    [firstDay, lastDay],
  );
  return result?.total ?? 0;
}

export async function queryYearTotal(year: number): Promise<number> {
  const db = await getDb();
  const firstDay = localISO(new Date(year, 0, 1));
  const lastDay = localISO(new Date(year, 11, 31, 23, 59, 59));
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ?`,
    [firstDay, lastDay],
  );
  return result?.total ?? 0;
}

export async function queryTodayTotal(): Promise<number> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ?`,
    [localISO(today)],
  );
  return result?.total ?? 0;
}

export async function queryYesterdayTotal(): Promise<number> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date < ?`,
    [localISO(yesterday), localISO(today)],
  );
  return result?.total ?? 0;
}

export async function queryLastNTransactions(n: number): Promise<TransactionRow[]> {
  const db = await getDb();
  return db.getAllAsync<TransactionRow>(`SELECT * FROM transactions ORDER BY date DESC LIMIT ?`, [
    n,
  ]);
}

export async function queryMaxTransaction(): Promise<TransactionRow | null> {
  const db = await getDb();
  return (
    (await db.getFirstAsync<TransactionRow>(
      `SELECT * FROM transactions ORDER BY amount DESC LIMIT 1`,
    )) ?? null
  );
}

export interface DayTotal {
  day: string;
  amount: number;
  isToday: boolean;
}

export async function queryWeeklyTotals(): Promise<DayTotal[]> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  // Una sola query agrupada por día en lugar de 7 queries separadas (patrón N+1)
  const rows = await db.getAllAsync<{ day_num: number; total: number }>(
    `SELECT CAST(strftime('%w', date) AS INTEGER) as day_num,
            SUM(amount) as total
     FROM transactions
     WHERE date >= ? AND date < ?
     GROUP BY day_num`,
    [localISO(weekStart), localISO(new Date(today.getTime() + 86400000))],
  );

  const totals = new Map(rows.map((r) => [r.day_num, r.total ?? 0]));

  const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      day: DAY_LABELS[d.getDay()],
      amount: Math.max(totals.get(d.getDay()) ?? 0, 0),
      isToday: i === 6,
    };
  });
}

export async function queryPrevWeekTotal(): Promise<number> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date < ?`,
    [localISO(twoWeeksAgo), localISO(weekAgo)],
  );
  return Math.max(result?.total ?? 0, 0);
}

export async function queryMonthlyExpensesByYear(year: number): Promise<Record<number, number>> {
  const db = await getDb();
  const yearStart = localISO(new Date(year, 0, 1));
  const yearEnd = localISO(new Date(year, 11, 31, 23, 59, 59));
  const rows = await db.getAllAsync<{ month: number; total: number }>(
    `SELECT CAST(strftime('%m', date) AS INTEGER) as month, SUM(amount) as total
     FROM transactions
     WHERE amount > 0 AND date >= ? AND date <= ?
     GROUP BY month`,
    [yearStart, yearEnd],
  );
  const result: Record<number, number> = {};
  for (const row of rows) {
    if (row.total > 0) result[row.month] = row.total;
  }
  return result;
}

export interface CategoryAverage {
  emoji: string;
  total: number;
  count: number;
  avgMonthly: number;
}

export interface CategoryAveragesResult {
  /** Meses distintos con actividad en toda la historia de la app — denominador común de avgMonthly. */
  months: number;
  items: CategoryAverage[];
}

export interface DateRange {
  /** ISO local (localISOString) — límite inferior inclusive. `undefined` = sin límite. */
  from?: string;
  /** ISO local (localISOString) — límite superior inclusive. `undefined` = sin límite. */
  to?: string;
}

/**
 * Promedio mensual histórico por categoría (gasto o ingreso), usado por la pantalla
 * de Reportes ("Promedios"). El denominador es el mismo para todas las categorías
 * (meses distintos con AL MENOS una transacción, sin importar de qué categoría) —
 * evita inflar el promedio de categorías esporádicas con pocos meses activos propios.
 *
 * `range` acota la ventana de cálculo (presets de N meses hacia atrás, o un rango
 * personalizado desde/hasta elegido por el usuario). `undefined` usa todo el historial.
 * El denominador sigue siendo "meses distintos con actividad" DENTRO de esa ventana, no
 * el tamaño fijo de la ventana — así un mes sin movimientos no infla el promedio de las
 * categorías vecinas.
 */
export async function queryCategoryMonthlyAverages(
  type: "expense" | "income",
  range?: DateRange,
): Promise<CategoryAveragesResult> {
  const db = await getDb();

  const clauses: string[] = [];
  const rangeParams: string[] = [];
  if (range?.from) {
    clauses.push("date >= ?");
    rangeParams.push(range.from);
  }
  if (range?.to) {
    clauses.push("date <= ?");
    rangeParams.push(range.to);
  }
  const rangeClause = clauses.length > 0 ? `AND ${clauses.join(" AND ")}` : "";

  const monthsRow = await db.getFirstAsync<{ months: number | null }>(
    `SELECT COUNT(DISTINCT strftime('%Y-%m', date)) as months FROM transactions WHERE 1=1 ${rangeClause}`,
    rangeParams,
  );
  const months = Math.max(monthsRow?.months ?? 0, 1);

  const amountExpr = type === "expense" ? "amount" : "ABS(amount)";
  const whereClause = type === "expense" ? "amount > 0" : "amount < 0";
  const rows = await db.getAllAsync<{ category_emoji: string; total: number; count: number }>(
    `SELECT category_emoji, SUM(${amountExpr}) as total, COUNT(*) as count
     FROM transactions
     WHERE ${whereClause} ${rangeClause}
     GROUP BY category_emoji`,
    rangeParams,
  );

  const items = rows
    .map((r) => ({
      emoji: r.category_emoji,
      total: r.total,
      count: r.count,
      avgMonthly: r.total / months,
    }))
    .sort((a, b) => b.avgMonthly - a.avgMonthly);

  return { months, items };
}

export interface MonthlyTotal {
  year: number;
  month: number; // 1-12
  total: number;
}

/**
 * Total mensual (gasto o ingreso) entre `from` y `to` (ambos inclusive, meses calendario
 * completos), incluyendo meses sin movimientos (total 0) para que el gráfico de tendencia
 * tenga huecos reales, no meses saltados. Usado por la tarjeta "Tendencia" de Reportes —
 * `from`/`to` vienen del selector de rango con calendario (o de sus accesos rápidos).
 */
export async function queryMonthlyTotalsInRange(
  type: "expense" | "income",
  from: Date,
  to: Date,
): Promise<MonthlyTotal[]> {
  const db = await getDb();
  const rangeStart = localISO(new Date(from.getFullYear(), from.getMonth(), 1));
  const rangeEnd = localISO(new Date(to.getFullYear(), to.getMonth() + 1, 0, 23, 59, 59));

  const amountExpr = type === "expense" ? "amount" : "ABS(amount)";
  const whereClause = type === "expense" ? "amount > 0" : "amount < 0";
  const rows = await db.getAllAsync<{ ym: string; total: number }>(
    `SELECT strftime('%Y-%m', date) as ym, SUM(${amountExpr}) as total
     FROM transactions
     WHERE ${whereClause} AND date >= ? AND date <= ?
     GROUP BY ym`,
    [rangeStart, rangeEnd],
  );
  const totals = new Map(rows.map((r) => [r.ym, r.total]));

  const result: MonthlyTotal[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    result.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1, total: totals.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export async function queryFirstTransactionYear(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ min_date: string | null }>(
    `SELECT MIN(date) as min_date FROM transactions`,
  );
  if (row?.min_date) {
    return new Date(row.min_date).getFullYear();
  }
  return new Date().getFullYear();
}
