// Web in-memory fallback for queries (mirrors queries.ts interface)
import type { TransactionRow } from "./db";

// Access the same in-memory store via shared module reference
// eslint-disable-next-line @typescript-eslint/no-require-imports
const memDb = require("./db.web") as {
  getAllTransactions: () => Promise<TransactionRow[]>;
};

async function getAll(): Promise<TransactionRow[]> {
  return memDb.getAllTransactions();
}

export async function queryMonthTotal(
  year: number,
  month: number
): Promise<number> {
  const rows = await getAll();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0, 23, 59, 59);
  return rows
    .filter((t) => {
      const d = new Date(t.date);
      return d >= firstDay && d <= lastDay;
    })
    .reduce((s, t) => s + t.amount, 0);
}

export async function queryYearTotal(year: number): Promise<number> {
  const rows = await getAll();
  return rows
    .filter((t) => new Date(t.date).getFullYear() === year)
    .reduce((s, t) => s + t.amount, 0);
}

export async function queryTodayTotal(): Promise<number> {
  const rows = await getAll();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return rows
    .filter((t) => new Date(t.date) >= today)
    .reduce((s, t) => s + t.amount, 0);
}

export async function queryYesterdayTotal(): Promise<number> {
  const rows = await getAll();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return rows
    .filter((t) => {
      const d = new Date(t.date);
      return d >= yesterday && d < today;
    })
    .reduce((s, t) => s + t.amount, 0);
}

export async function queryLastNTransactions(
  n: number
): Promise<TransactionRow[]> {
  const rows = await getAll();
  return rows.slice(0, n);
}

export async function queryMaxTransaction(): Promise<TransactionRow | null> {
  const rows = await getAll();
  if (!rows.length) return null;
  return rows.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev));
}
