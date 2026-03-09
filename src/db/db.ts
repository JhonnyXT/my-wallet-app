import * as SQLite from "expo-sqlite";

export interface TransactionRow {
  id: number;
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
  tags: string; // JSON stringificado: '["#trabajo","#comida"]' o ''
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
      date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      tags TEXT NOT NULL DEFAULT ''
    );
  `);
  // Migración segura: añade la columna tags si aún no existe
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN tags TEXT NOT NULL DEFAULT ''`);
  } catch {
    // La columna ya existe — ignorar
  }
}

/** Formato ISO local (sin conversión UTC) para evitar desfase de zona horaria */
function localISOString(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000`;
}

export async function insertTransaction(
  amount: number,
  description: string,
  categoryEmoji: string,
  tags: string[] = []
): Promise<TransactionRow> {
  const now     = localISOString();
  const tagsStr = tags.length > 0 ? JSON.stringify(tags) : "";
  const db      = await getNativeDatabase();
  const result  = await db.runAsync(
    `INSERT INTO transactions (amount, description, category_emoji, date, tags) VALUES (?, ?, ?, ?, ?)`,
    [amount, description, categoryEmoji, now, tagsStr]
  );
  return {
    id: result.lastInsertRowId,
    amount,
    description,
    category_emoji: categoryEmoji,
    date: now,
    tags: tagsStr,
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

export async function clearTransactions(): Promise<void> {
  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions`);
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
