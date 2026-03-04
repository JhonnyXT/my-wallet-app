import * as SQLite from "expo-sqlite";

export interface TransactionRow {
  id: number;
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
}

let _db: SQLite.SQLiteDatabase | null = null;

async function getNativeDatabase() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("mywallet.db");
  return _db;
}

export async function initDatabase(): Promise<void> {
  const db = await getNativeDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category_emoji TEXT NOT NULL DEFAULT '💰',
      date TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
}

export async function insertTransaction(
  amount: number,
  description: string,
  categoryEmoji: string
): Promise<TransactionRow> {
  const now = new Date().toISOString();
  const db = await getNativeDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions (amount, description, category_emoji, date) VALUES (?, ?, ?, ?)`,
    [amount, description, categoryEmoji, now]
  );

  return {
    id: result.lastInsertRowId,
    amount,
    description,
    category_emoji: categoryEmoji,
    date: now,
  };
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const db = await getNativeDatabase();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC`
  );
}

export async function hasAnyTransactions(): Promise<boolean> {
  const db = await getNativeDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions`
  );
  return (result?.count ?? 0) > 0;
}

/** Inserts demo data that mirrors the Stitch "Visual Expense Insights Home" design */
export async function seedDemoData(): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fourDaysAgo = new Date(now);
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  function d(base: Date, h: number, m: number) {
    const t = new Date(base);
    t.setHours(h, m, 0, 0);
    return t.toISOString();
  }

  const seed = [
    { amount: 900,  description: "Restaurante",    emoji: "🍔", date: d(yesterday, 18, 45) },
    { amount: 435,  description: "Uber Trip",       emoji: "🚗", date: d(yesterday, 16, 20) },
    { amount: 3540, description: "PlayStation Store", emoji: "🎮", date: d(threeDaysAgo, 14, 10) },
    { amount: 2250, description: "Zara",            emoji: "🛍️", date: d(fourDaysAgo, 11, 30) },
    { amount: 3690, description: "Servicios Hogar", emoji: "💡", date: d(fiveDaysAgo, 9, 0) },
  ];

  const db = await getNativeDatabase();
  for (const tx of seed) {
    await db.runAsync(
      `INSERT INTO transactions (amount, description, category_emoji, date) VALUES (?, ?, ?, ?)`,
      [tx.amount, tx.description, tx.emoji, tx.date]
    );
  }
}

export async function getMonthlyTotal(): Promise<number> {
  const db = await getNativeDatabase();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ?`,
    [firstDay]
  );
  return result?.total ?? 0;
}
