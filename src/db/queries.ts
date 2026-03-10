import * as SQLite from "expo-sqlite";
import type { TransactionRow } from "./db";

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("mywallet.db");
  return _db;
}

export async function queryMonthTotal(
  year: number,
  month: number
): Promise<number> {
  const db = await getDb();
  const firstDay = new Date(year, month - 1, 1).toISOString();
  const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString();
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ?`,
    [firstDay, lastDay]
  );
  return result?.total ?? 0;
}

export async function queryYearTotal(year: number): Promise<number> {
  const db = await getDb();
  const firstDay = new Date(year, 0, 1).toISOString();
  const lastDay = new Date(year, 11, 31, 23, 59, 59).toISOString();
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ?`,
    [firstDay, lastDay]
  );
  return result?.total ?? 0;
}

export async function queryTodayTotal(): Promise<number> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ?`,
    [today.toISOString()]
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
    [yesterday.toISOString(), today.toISOString()]
  );
  return result?.total ?? 0;
}

export async function queryLastNTransactions(
  n: number
): Promise<TransactionRow[]> {
  const db = await getDb();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC LIMIT ?`,
    [n]
  );
}

export async function queryMaxTransaction(): Promise<TransactionRow | null> {
  const db = await getDb();
  return (
    (await db.getFirstAsync<TransactionRow>(
      `SELECT * FROM transactions ORDER BY amount DESC LIMIT 1`
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

  const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
  const result: DayTotal[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(d.getDate() + 1);

    const row = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date < ?`,
      [d.toISOString(), nextD.toISOString()]
    );

    result.push({
      day: DAY_LABELS[d.getDay()],
      amount: Math.max(row?.total ?? 0, 0),
      isToday: i === 0,
    });
  }

  return result;
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
    [twoWeeksAgo.toISOString(), weekAgo.toISOString()]
  );
  return Math.max(result?.total ?? 0, 0);
}

export async function queryMonthlyExpensesByYear(
  year: number
): Promise<Record<number, number>> {
  const db = await getDb();
  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59).toISOString();
  const rows = await db.getAllAsync<{ month: number; total: number }>(
    `SELECT CAST(strftime('%m', date) AS INTEGER) as month, SUM(amount) as total
     FROM transactions
     WHERE amount > 0 AND date >= ? AND date <= ?
     GROUP BY month`,
    [yearStart, yearEnd]
  );
  const result: Record<number, number> = {};
  for (const row of rows) {
    if (row.total > 0) result[row.month] = row.total;
  }
  return result;
}

export async function queryFirstTransactionYear(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ min_date: string | null }>(
    `SELECT MIN(date) as min_date FROM transactions`
  );
  if (row?.min_date) {
    return new Date(row.min_date).getFullYear();
  }
  return new Date().getFullYear();
}
